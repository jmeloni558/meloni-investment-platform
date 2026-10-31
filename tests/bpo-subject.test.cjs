const test=require('node:test'),assert=require('node:assert/strict'),C=require('../operations/bpo/core.cjs');
const now=new Date('2026-10-31T12:00:00Z');
const doc={path:'subject.pdf',name:'Subject MLS.pdf',category:'subject'};
const fact=(name,value,evidence)=>({name,value,document:0,page:1,evidence});
test('General subject fields follow the form order without duplicate address or rights',()=>{
 const rows=C.generalSubjectFields({},C.schema,now);
 assert.deepEqual(rows.map(f=>f.name),['active.0.price','sold.0.source','sold.0.dom',...['location','site','view','design','quality','year','condition','rooms','beds','baths','gla','basement','utility','hvac','energy','garage','porches','fireplace','fence','pool','other'].map(k=>'sold.0.'+k)]);
 assert.ok(rows.every(f=>f.pdfName));assert.equal(rows.find(f=>f.name==='sold.0.design').label,'Design and appeal');
});
test('only requested defaults apply and RRR stays unchanged',()=>{
 let v=C.recalculate({'sold.0.beds':'3','active.0.beds':'3'});
 assert.equal(v['sold.0.rooms'],'6');assert.equal(v['sold.0.utility'],'Average');assert.equal(v['active.3.tenure'],'Fee Simple');
 for(const key of ['quality','condition','view','other','pool','basement'])assert.equal(v['sold.0.'+key],undefined);
 assert.equal(C.recalculate({_clientTemplate:'rrr'})['sold.0.utility'],undefined);
 assert.equal(C.recalculate({_clientTemplate:'rrr'})['sold.1.tenure'],undefined);
});
test('sourced utility replaces the default but not a manual edit or deletion',()=>{
 const fields=[{name:'sold.0.utility',value:'Limited',path:'subject.pdf',page:1,evidence:'Functional utility: Limited'}];
 let v=C.recalculate({});v=C.applyAI(v,{fields}).values;assert.equal(v['sold.0.utility'],'Limited');assert.equal(v['active.0.utility'],'Limited');
 v=C.subjectEdit(v,'sold.0.utility','Good');v=C.applyAI(v,{fields}).values;assert.equal(v['sold.0.utility'],'Good');
 assert.equal(C.recalculate({'sold.0.utility':'','active.0.utility':''})['sold.0.utility'],'');
});
test('recent MLS sale exposes separate sale fields; old/future/tax-only dates do not',()=>{
 const v={_attachments:[doc],_aiFields:{'sold.0.date':{path:doc.path,evidence:'MLS closed sale'}}};
 for(const [date,expected] of [['2026-04-01',true],['10/31/2023',true],['2023-10-30',false],['2027-01-01',false],['',false],['invalid',false],['2026-02-31',false]]){
  v['sold.0.date']=date;assert.equal(C.recentSubjectSale(v,now),expected,date);
  assert.equal(C.generalSubjectFields(v,C.schema,now).some(f=>f.name==='sold.0.price'),expected);
 }
 v['sold.0.date']='2026-04-01';v._attachments=[{...doc,sourceKind:'tax'}];assert.equal(C.recentSubjectSale(v,now),false);
});
test('general extraction allows explicit quality and utility, leaves other blank',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const fields=[fact('sold.0.quality','Good','Construction quality: Good'),fact('sold.0.utility','Limited','Functional utility: Limited'),fact('sold.0.other','Boat lift','Boat lift')];
 const r=cleanExtraction({fields},C.schema,[doc],{general:true,now});assert.deepEqual(r.fields.map(f=>f.name),['sold.0.quality','sold.0.utility']);
 assert.equal(cleanExtraction({fields},C.schema,[doc]).fields.some(f=>f.name.endsWith('.quality')),false);
 assert.equal(cleanExtraction({fields:[fact('sold.0.quality','Excellent','Beautifully renovated')]},C.schema,[doc],{general:true,now}).fields.length,0);
});
test('general extraction keeps asking price independent and rejects old or tax-only sales',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 for(const date of ['2026-05-01','2020-05-01','2027-05-01']){
  const fields=[fact('active.0.price','450000','List price $450000'),fact('sold.0.price','300000','Closed sale price $300000'),fact('sold.0.date',date,'MLS closed sale '+date)];
  const r=cleanExtraction({fields},C.schema,[doc],{general:true,now});assert.equal(r.fields.some(f=>f.name==='sold.0.price'),date==='2026-05-01');assert.equal(r.fields.find(f=>f.name==='active.0.price').value,'450000');
  assert.equal(cleanExtraction({fields},C.schema,[{...doc,sourceKind:'tax'}],{general:true,now}).fields.some(f=>f.name==='sold.0.price'),false);
 }
});
