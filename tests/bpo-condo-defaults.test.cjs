const test=require('node:test'),assert=require('node:assert/strict'),C=require('../operations/bpo/core.cjs');
const docs=[{path:'subject.pdf',name:'Subject MLS.pdf',category:'subject',sourceKind:'mls'},{path:'sold.pdf',name:'Sold MLS.pdf',category:'sold'},{path:'active.pdf',name:'Active MLS.pdf',category:'active'}];
const fact=(name,value,document=1,evidence=value)=>({name,value,document,page:1,evidence});
test('MLS condo defaults apply to the subject and all sold/active slots, not shared acreage or story counts',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 for(const p of ['sold.0','sold.1','sold.2','sold.3','active.1','active.2','active.3']){
 const d=p==='sold.0'?0:p.startsWith('sold')?1:2;
 const result=cleanExtraction({fields:[fact(p+'.address','100 Test Lane',d),fact(p+'.design','Ranch',d,'Property Style: Condominium; One story'),fact(p+'.site','296846 sq ft',d,'Lot Size: 296,846 SqFt'),fact(p+'.tenure','Fee Simple',d,'Ownership: Fee Simple')]},C.schema,docs,{general:true});
 const v=C.applyAI(C.recalculate({_attachments:docs}),result).values;
 for(const q of p==='sold.0'?['sold.0','active.0']:[p]){assert.equal(v[q+'.site'],'0');assert.equal(v[q+'.tenure'],'Condo');assert.equal(v[q+'.design'],'Condo');assert.match(v._aiFields[q+'.site'].evidence,/Condo default/);}
 assert.equal(v[p+'.quality'],undefined);
 }
});
test('condo defaults do not infer condo status from a unit, nearby community, another comp, iMapp or RRR',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const fields=[fact('sold.1.address','100 Test Lane #104'),fact('sold.1.design','Ranch',1,'One story in a condo community'),fact('sold.2.address','102 Test Lane'),fact('sold.2.design','Condominium',1,'Property Type: Condominium')];
 let r=cleanExtraction({fields},C.schema,docs,{general:true});assert.ok(!r.fields.some(f=>f.name==='sold.1.site'));assert.equal(r.fields.find(f=>f.name==='sold.2.site').value,'0');
 r=cleanExtraction({fields:[fact('sold.0.design','Condominium',0,'Property Style: Condominium')]},C.schema,[{...docs[0],sourceKind:'imapp'}],{general:true});assert.ok(!r.fields.some(f=>f.name.endsWith('.site')));
 r=cleanExtraction({fields},C.schema,docs,{general:false});assert.ok(!r.fields.some(f=>f.name.endsWith('.site')));
});
test('condo defaults preserve manual edits and occupied comparable identity',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const result=cleanExtraction({fields:[fact('sold.1.address','100 Test Lane'),fact('sold.1.design','Condominium',1,'Property Style: Condominium')]},C.schema,docs,{general:true});
 let v=C.applyAI(C.recalculate({_attachments:docs}),result).values;
 v={...v,'sold.1.site':'500','sold.1.design':'Custom','sold.1.tenure':'Leasehold'};
 const next=C.applyAI(v,result).values;assert.equal(next['sold.1.site'],'500');assert.equal(next['sold.1.design'],'Custom');assert.equal(next['sold.1.tenure'],'Leasehold');
 const occupied=C.applyAI({...v,'sold.1.address':'999 Different Street'},result).values;assert.equal(occupied['sold.1.address'],'999 Different Street');assert.equal(occupied['sold.1.design'],'Custom');
});
