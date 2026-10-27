const test=require('node:test'),assert=require('node:assert/strict'),C=require('../operations/bpo/core.cjs');
const entry=(name,value)=>({name,value,path:'owner/report/source.pdf',filename:'Sold.pdf',page:1,evidence:'Source fact'});
test('AI fills facts and recalculates, never writes final opinion or adjustments',()=>{
 const r=C.applyAI({}, {fields:[entry('sold.1.address','123 Test St'),entry('sold.1.price','300000'),entry('sold.1.gla','1500'),entry('sold.1.adj_condition','-10000'),entry('field_0477','999999')],warnings:[]});
 assert.equal(r.values['sold.1.ppsf'],'200');assert.equal(r.values['sold.1.adjusted'],'300,000');assert.equal(r.values.field_0477,undefined);assert.equal(r.values['sold.1.adj_condition'],undefined);
});
test('Manual changes and existing comparable identities survive re-extraction',()=>{
 const prior=C.applyAI({}, {fields:[entry('sold.1.address','123 Test St'),entry('sold.1.price','300000')]}).values;
 prior['sold.1.price']='310000';const result=C.applyAI(prior,{fields:[entry('sold.1.address','123 Test St'),entry('sold.1.price','305000'),entry('sold.1.beds','3')]});
 assert.equal(result.values['sold.1.price'],'310000');assert.equal(result.values['sold.1.beds'],'3');
 const moved=C.applyAI(prior,{fields:[entry('sold.1.address','999 Other St'),entry('sold.1.price','800000')]});assert.equal(moved.values['sold.1.address'],'123 Test St');assert.equal(moved.values['sold.1.price'],'310000');
});
test('Unsupported fields, missing citations, invalid facts and opinions rejected by server contract',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const fact=(name,value)=>({name,value,document:0,page:1,evidence:'quoted fact'});
 const r=cleanExtraction({fields:[fact('sold.1.price','300000'),fact('sold.1.gla','oops'),fact('field_0477','500000'),fact('__proto__','x'),{...fact('sold.1.beds','3'),page:0},{...fact('sold.1.year','1990'),evidence:''}],warnings:[]},C.schema,[{path:'owner/report/a.pdf',name:'Source.pdf'}]);
 assert.deepEqual(r.fields.map(x=>x.name),['sold.1.price']);
});
test('Checkbox import preserves a manually chosen conflicting option',()=>{
 const r=C.applyAI({field_0064:true},{fields:[entry('field_0070',true)]});assert.equal(r.values.field_0064,true);assert.equal(r.values.field_0070,undefined);
});
test('MLS numeric units normalize, ambiguous numbers warn, and sparse fills are flagged',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const fact=(name,value)=>({name,value,document:0,page:1,evidence:'quoted MLS fact'});
 const r=cleanExtraction({fields:[fact('sold.1.address','123 Test St'),fact('sold.1.price','$490,000'),fact('sold.1.gla','1,715 Sq Ft'),fact('sold.1.dom','16 days'),fact('sold.1.baths','2/1')],warnings:[]},C.schema,[{path:'owner/report/a.pdf',name:'Source.pdf'}]);
 assert.equal(r.fields.find(f=>f.name==='sold.1.gla').value,'1715');
 assert.equal(r.fields.find(f=>f.name==='sold.1.price').value,'490000');
 assert.equal(r.fields.find(f=>f.name==='sold.1.dom').value,'16');
 assert.ok(r.warnings.some(w=>w.includes('needs review')));
 assert.ok(r.warnings.some(w=>w.includes('beds, baths')));
});
