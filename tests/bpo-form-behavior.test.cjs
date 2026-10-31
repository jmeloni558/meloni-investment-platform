const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{PDFDocument}=require('pdf-lib'),C=require('../operations/bpo/core.cjs');
test('downloaded form actions synchronize dates without recursion and keep separate price calculations',async()=>{
 const {PDFName}=require('pdf-lib'),vm=require('node:vm'),pdf=await PDFDocument.load(fs.readFileSync('assets/bpo/template.pdf')),form=pdf.getForm();
 const script=(name,event)=>form.getField(name).acroField.dict.lookup(PDFName.of('AA')).lookup(PDFName.of(event)).lookup(PDFName.of('JS')).decodeText();
 const values={header_date:'old',signature_date:'old','sold.0.price':'250000','active.0.price':'300000','subject_shared.gla':'1000'};
 let depth=0;const doc={getField(name){return {get value(){return values[name]},set value(v){commit(name,v)}}}};
 function commit(name,value){assert.ok(++depth<10);const event={value,rc:true};vm.runInNewContext('(function(){'+script(name,'V')+'}).call(doc)',{doc,event,app:{alert(){}}});if(event.rc)values[name]=event.value;depth--;}
 commit('header_date','10/29/2026');assert.equal(values.signature_date,'10/29/2026');commit('signature_date','');assert.equal(values.header_date,'');
 for(const prefix of ['sold','active']){const event={};vm.runInNewContext('(function(){'+script(prefix+'.0.ppsf','C')+'}).call(doc)',{doc,event});assert.equal(event.value,prefix==='sold'?250:300);}
 commit('sold.0.price','$400,000');assert.equal(values['sold.0.price'],'400000');assert.equal(values['active.0.price'],'300000');
});
test('subject price edits, source imports and PPSF remain independent',()=>{
 let v=C.subjectEdit({'sold.0.price':'100000','active.0.price':'120000','sold.0.gla':'1000','active.0.gla':'1000'},'active.0.price','130000');
 v=C.recalculate(v);assert.equal(v['sold.0.price'],'100000');assert.equal(v['sold.0.ppsf'],'100');assert.equal(v['active.0.ppsf'],'130');
 v=C.subjectEdit(v,'sold.0.price','');assert.equal(v['active.0.price'],'130000');
 v=C.applyRecord({}, {address:'100 Test St',price:'300000'},'subject');assert.equal(v['active.0.price'],'300000');assert.equal(v['sold.0.price'],undefined);
 v=C.applyAI({}, {fields:[{name:'sold.0.price',value:'250000',path:'source',page:1,evidence:'Closed price'}]}).values;assert.equal(v['sold.0.price'],'250000');assert.equal(v['active.0.price'],undefined);
});
test('room defaults follow beds but preserve source and manual counts',()=>{
 let v=C.recalculate({'sold.0.beds':'3','active.0.beds':'3','sold.1.beds':'2','sold.2.beds':'2','sold.2.rooms':'9'});
 assert.equal(v['sold.0.rooms'],'6');assert.equal(v['sold.1.rooms'],undefined);assert.equal(v['sold.2.rooms'],'9');
 v=C.recalculate({...v,'sold.1.beds':'4'});assert.equal(v['sold.1.rooms'],undefined);
 v=C.recalculate({...v,'sold.1.rooms':'10','sold.1.beds':'5'});assert.equal(v['sold.1.rooms'],'10');
 v=C.applyAI(v,{fields:[{name:'sold.0.rooms',value:'8',path:'source',page:1,evidence:'8 rooms'}]}).values;assert.equal(v['sold.0.rooms'],'8');assert.equal(v['active.0.rooms'],'8');
});
test('above-ground pools have no value and manual pool adjustments can be cleared',()=>{
 const make=(subject,comp)=>({'sold.0.pool':subject,'sold.1.pool':comp,'sold.1.address':'100 Comp St',_adjustments:{globals:{pool:'20000'}}});
 for(const [subject,comp,expected] of [['Private','Above-ground',20000],['Above ground','In-ground',-20000],['No pool','Above-ground',0],['In-ground','Private',0]]){
  let v=C.applyAdjustments(make(subject,comp)).values;assert.equal(C.number(v['sold.1.adj_pool']),expected);assert.equal(v['sold.1.pool'],comp);
  v['sold.1.adj_pool']='';v._adjustments.manual={'sold.1.adj_pool':true};v=C.applyAdjustments(v).values;assert.equal(v['sold.1.adj_pool'],'');
  v=C.applyAdjustments(v,true).values;assert.equal(C.number(v['sold.1.adj_pool']),expected);
 }
});
test('Blue Heron design fits and overlong fields are detected before export',async()=>{
 await C.prepareValidation();assert.deepEqual(C.fitIssues({'sold.1.design':'Single Family Reside...'}),[]);
 assert.ok(C.fitIssues({'sold.1.design':'Very long design description '.repeat(10)}).some(e=>e.name==='sold.1.design'));
 const values=C.recalculate({'field_0002':'10/29/2026','field_0483':'old','sold.0.price':'250000','active.0.price':'300000','sold.0.gla':'1000','active.0.gla':'1000','sold.0.beds':'3','active.0.beds':'3','sold.1.design':'Single Family Reside...','sold.1.pool':'Above-ground'});
 const bytes=await C.exportPDF(fs.readFileSync('assets/bpo/template.pdf'),values),pdf=await PDFDocument.load(bytes),form=pdf.getForm();
 assert.equal(form.getTextField('sold.0.price').getText(),'$250,000');assert.equal(form.getTextField('active.0.price').getText(),'$300,000');
 assert.equal(form.getTextField('sold.0.ppsf').getText(),'$250');assert.equal(form.getTextField('active.0.ppsf').getText(),'$300');
 assert.equal(form.getTextField('header_date').getText(),'10/29/2026');assert.equal(form.getTextField('signature_date').getText(),'10/29/2026');assert.equal(form.getTextField('subject_shared.total').getText(),'6');
 fs.mkdirSync('output',{recursive:true});fs.writeFileSync('output/bpo-form-behavior.pdf',bytes);
});
