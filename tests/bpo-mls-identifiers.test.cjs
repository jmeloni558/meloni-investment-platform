const test=require('node:test'),assert=require('node:assert/strict'),C=require('../operations/bpo/core.cjs');
const documents=[{path:'sold.pdf',name:'Sold.pdf',category:'sold',sourceKind:'mls'}];
const fact=(value,evidence,name='sold.1.source')=>({name,value,evidence,document:0,page:1});
test('MLS extraction restores the actual Spartan Way comp prefixes from their own citations',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 for(const [value,evidence] of [['8463118','TB8463118'],['8470725','TB8470725'],['7883086','W7883086']]){
 const r=cleanExtraction({fields:[fact(value,evidence)]},C.schema,documents,{general:true});
 assert.equal(r.fields[0].value,evidence);assert.equal(r.fields[0].evidence,evidence);
 }
});
test('MLS identifiers retain numeric-only IDs, leading zeros, letters and hyphens without borrowing prefixes',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 for(const id of ['1234567','00123456','TB8463118','W7883086','AB123456Z','AB123-456']){
 const r=cleanExtraction({fields:[fact(id,'MLS #: '+id)]},C.schema,documents,{general:true});assert.equal(r.fields[0].value,id);
 }
 const r=cleanExtraction({fields:[fact('1234567','MLS: 1234567; previous listing TB7654321')]},C.schema,documents,{general:true});assert.equal(r.fields[0].value,'1234567');
 const conflict=cleanExtraction({fields:[fact('1234567','TB1234567 or W1234567')]},C.schema,documents,{general:true});assert.equal(conflict.fields.length,0);assert.ok(conflict.warnings.some(x=>x.includes('conflicting MLS')));
});
test('re-extraction keeps a manually corrected source and retains complete IDs on fresh imports',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const result=cleanExtraction({fields:[fact('100 Test Street','100 Test Street','sold.1.address'),fact('8463118','TB8463118')]},C.schema,documents,{general:true});
 assert.equal(C.applyAI({},result).values['sold.1.source'],'TB8463118');
 const current={'sold.1.address':'100 Test Street','sold.1.source':'TB8463118',_aiFields:{'sold.1.source':{value:'8463118'}}};
 assert.equal(C.applyAI(current,result).values['sold.1.source'],'TB8463118');
 const changed={...result,fields:result.fields.map(f=>f.name.endsWith('.source')?{...f,value:'W9999999'}:f)};
 assert.equal(C.applyAI(current,changed).values['sold.1.source'],'TB8463118');
});
