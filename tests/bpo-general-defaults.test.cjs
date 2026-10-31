const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../operations/bpo/core.cjs');
const fact=(name,value,evidence=value)=>({name,value,path:'mls.pdf',page:1,evidence});
test('General imports never fill condition or Other and remove only old unedited AI entries',async()=>{
 const fields=[fact('sold.0.condition','MLS: Good'),fact('sold.0.other','Lot size 8000'),...['sold','active'].flatMap(k=>[1,2,3].flatMap(i=>[fact(`${k}.${i}.address`,`${i}00 Test Lane`),fact(`${k}.${i}.condition`,'Good'),fact(`${k}.${i}.other`,'8000 sqft')]))];
 const v=C.applyAI({}, {fields}).values;for(const f of fields.filter(f=>/\.(condition|other)$/.test(f.name)))assert.equal(v[f.name],undefined);
 const legacy=C.recalculate({'sold.1.condition':'MLS: Good','active.1.other':'8000 sqft','sold.2.condition':'Fair',_aiFields:{'sold.1.condition':{value:'MLS: Good'},'active.1.other':{value:'8000 sqft'},'sold.2.condition':{value:'Good'}}});
 assert.equal(legacy['sold.1.condition'],'');assert.equal(legacy['active.1.other'],'');assert.equal(legacy['sold.2.condition'],'Fair');
 const {extractionScopes,cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');assert.ok(!extractionScopes(C.schema,true).flat().some(f=>/\.(condition|other)$/.test(f.name)));
 assert.ok(extractionScopes(C.schema,false).flat().some(f=>f.name==='sold.1.condition'));
 assert.equal(cleanExtraction({fields:fields.map(f=>({...f,document:0}))},C.schema,[{category:'sold'}],{general:true}).fields.some(f=>/\.(condition|other)$/.test(f.name)),false);
});
test('MLS IDs and sale dates are normalized without adding labels',()=>{
 for(const [input,expected] of [['Stellar MLS / MLS # T1234567 Pending','T1234567'],['Active / U1234567','U1234567'],['MLS 12345678','12345678'],['MLS Pending',''],['T1234567','T1234567']])assert.equal(C.mlsNumber(input),expected);
 for(const date of ['2026-10-01','10/1/2026','10/01/26'])assert.equal(C.saleDate(date),'10/01/26');
 const v=C.applyAI({}, {fields:[fact('sold.1.address','100 Test Lane'),fact('sold.1.source','Stellar MLS T1234567 Sold'),fact('sold.1.date','2026-10-01')]}).values;
 assert.equal(v['sold.1.source'],'T1234567');assert.equal(v['sold.1.date'],'10/01/26');assert.equal(v._aiFields['sold.1.date'].value,'10/01/26');
 assert.equal(C.recentSubjectSale({'sold.0.date':'10/01/26',_attachments:[{path:'mls.pdf',category:'subject'}],_aiFields:{'sold.0.date':{path:'mls.pdf',evidence:'MLS sold'}}},new Date('2026-10-31')),true);
});
test('one lot unit converts all subject and comp values and round trips without drift',()=>{
 let v=C.recalculate({'sold.0.site':'10,890 sq ft','active.0.site':'0.25 acres','sold.1.site':'1 acre','active.1.site':'6000 sf','sold.2.site':'','sold.3.site':'0.5 acres / 21780 sf'});
 assert.equal(v['sold.0.site'],'10890');assert.equal(v['active.0.site'],'10890');assert.equal(v['sold.1.site'],'43560');assert.equal(v['sold.3.site'],'21780');
 for(let i=0;i<10;i++){v=C.setLotUnit(v,'acres');assert.equal(v['sold.0.site'],'0.25');assert.equal(v['sold.1.site'],'1');assert.equal(v['sold.2.site'],'');v=C.recalculate(v);v=C.setLotUnit(v,'sqft');assert.equal(v['active.1.site'],'6000');}
 v=C.setLotUnit(v,'acres');v=C.applyAI(v,{fields:[fact('active.2.address','200 Test Lane'),fact('active.2.site','21780 sf')]}).values;assert.equal(v['active.2.site'],'0.5');
 v=C.subjectEdit(v,'sold.0.site','2');v=C.recalculate(v);v=C.setLotUnit(v,'sqft');assert.equal(v['sold.0.site'],'87120');assert.equal(v['active.0.site'],'87120');
 assert.equal(C.lotSquareFeet('1 acre / 6000 sf'),null);
});
test('defaults cover every comp and preserve explicit and manual choices',()=>{
 let v=C.recalculate({});assert.equal(v.field_0015,'Meloni Realty, Inc.');assert.equal(v.field_0018,'Jamie Meloni');assert.equal(v.field_0019,'813-760-8516');assert.equal(v.field_0021,'jamie@melonirealty.com');assert.equal(v.field_0484,'Jamie Meloni');assert.equal(v.bpo_type_desktop,true);assert.equal(v.field_0259,true);assert.equal(v.field_0262,true);
 const fields=[];for(const k of ['sold','active'])for(let i=0;i<4;i++){const p=`${k}.${i}.`;assert.equal(v[p+'energy'],'None');fields.push(fact(p+'address',`${i}00 Test Lane`),fact(p+'beds','3'),fact(p+'design','Single Family',i%2?'Stories: 2':'Stories: 1'));}
 v=C.applyAI(v,{fields}).values;for(const k of ['sold','active'])for(let i=0;i<4;i++){assert.equal(v[`${k}.${i}.rooms`],'6');assert.equal(v[`${k}.${i}.design`],i%2?'2 Story':'Ranch');}
 v=C.recalculate({...v,field_0018:'Other Broker','sold.1.design':'Custom','sold.1.energy':'','sold.1.rooms':'9',bpo_type_desktop:false,field_0007:true});assert.equal(v.field_0018,'Other Broker');assert.equal(v['sold.1.energy'],'');assert.equal(v['sold.1.rooms'],'9');assert.equal(v.bpo_type_desktop,false);
 v=C.applyAI(v,{fields:[fact('sold.1.address','100 Test Lane'),fact('sold.1.design','Ranch','Stories: 1')]}).values;assert.equal(v['sold.1.design'],'Custom');
 const rrr=C.recalculate({_clientTemplate:'rrr','sold.1.source':'MLS Pending','sold.1.site':'1 acre','sold.1.date':'2026-01-02','sold.1.condition':'MLS: Good'});assert.equal(rrr['sold.1.source'],'MLS Pending');assert.equal(rrr['sold.1.site'],'1 acre');assert.equal(rrr['sold.1.date'],'2026-01-02');assert.equal(rrr.field_0018,undefined);
});
test('editable PDF preserves numbers, defaults and short sale dates in two pages',async()=>{
 const {PDFDocument}=require('pdf-lib');const v=C.setLotUnit(C.recalculate({'sold.0.site':'10890 sf','sold.1.site':'1 acre','sold.1.date':'2026-10-01','sold.1.beds':'3','sold.1.source':'MLS T1234567','sold.1.condition':'Good'}),'acres');
 const bytes=await C.exportPDF(fs.readFileSync('assets/bpo/template.pdf'),v),pdf=await PDFDocument.load(bytes),form=pdf.getForm();assert.equal(pdf.getPageCount(),2);
 for(const name of ['sold.0.site','sold.1.site','sold.1.date','sold.1.rooms','sold.1.source','sold.1.condition','field_0015','field_0018','field_0019','field_0021','field_0484'])assert.equal(form.getTextField(C.byName.get(name).pdfName).getText(),String(v[name]));
 fs.mkdirSync('output',{recursive:true});fs.writeFileSync('output/general-bpo-defaults.pdf',bytes);
});
test('unit selector updates visible values before a focused input blurs during rerender',()=>{
 const vm=require('node:vm'),source=fs.readFileSync('bpo-workspace.js','utf8');let handler,display='10890';
 const ctx={C,values:C.recalculate({'sold.0.site':'10890','active.0.site':'10890'}),dialog:{querySelector:()=>({addEventListener:(event,fn)=>{handler=fn;}})},modified:()=>{},collect:()=>{ctx.values=C.recalculate({...ctx.values,'sold.0.site':display});},showValues:()=>{display=ctx.values['sold.0.site'];},editor:()=>ctx.collect()};vm.createContext(ctx);
 const start=source.indexOf("dialog.querySelector('[data-lot-unit]')"),end=source.indexOf('});showValues();',start);vm.runInContext(source.slice(start,end+3),ctx);
 handler({target:{value:'acres'}});assert.equal(display,'0.25');assert.equal(ctx.values['sold.0.site'],'0.25');handler({target:{value:'sqft'}});assert.equal(display,'10890');assert.equal(ctx.values['sold.0.site'],'10890');
});
