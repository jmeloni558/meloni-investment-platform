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
test('Section extraction covers every allowed field once with exact response names',async()=>{
 const {extractionScopes,schemaFor,forbidden,instructions}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const scopes=extractionScopes(C.schema),all=scopes.flat().map(f=>f.name);
 assert.equal(new Set(all).size,all.length);
 assert.deepEqual([...all].sort(),C.schema.filter(f=>!f.readonly&&!forbidden(f.name)).map(f=>f.name).sort());
 for(const scope of scopes)assert.deepEqual(schemaFor(scope).properties.fields.items.properties.name.enum,scope.map(f=>f.name));
 assert.match(instructions,/active AND pending/);
 assert.match(instructions,/never invent a pending contract price/);
});
test('Long descriptions fit the PDF and retain full evidence without truncating numbers',async()=>{
 const {fitExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const {PDFDocument,StandardFonts}=require('pdf-lib'),doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const original='COLONY KEY / Ballast Point / South Tampa';
 const r=fitExtraction({fields:[entry('active.1.location',original),entry('active.1.price','555000')],warnings:[]},C.schema,t=>font.widthOfTextAtSize(t,5.5));
 assert.ok(font.widthOfTextAtSize(r.fields[0].value,5.5)<=C.byName.get('active.1.location').w-4);
 assert.ok(r.fields[0].evidence.includes(original));assert.equal(r.fields[1].value,'555000');
});
test('Marketing language does not establish quality and boolean facts retain their scope',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const fact=(name,value,evidence)=>({name,value,document:0,page:1,evidence});
 const r=cleanExtraction({fields:[fact('sold.1.quality','Renovated','Beautifully renovated'),fact('sold.1.energy','false','Green Energy Generation Y/N: No'),fact('sold.1.basement','None stated','No basement information'),fact('active.1.condition','Excellent','In excellent condition')],warnings:[]},C.schema,[{path:'a',name:'MLS.pdf'}]);
 assert.deepEqual(r.fields.map(f=>[f.name,f.value]),[['sold.1.energy','No generation'],['active.1.condition','MLS: Excellent']]);
});

test('Numeric subject fragments yield to a complete cited address; real manual addresses survive',()=>{
 const full='2913 W CORDELIA ST, TAMPA, FL 33607';
 const fields=[entry('field_0008',full),entry('sold.0.address','2913 W CORDELIA ST'),entry('active.0.address','2913 W CORDELIA ST')];
 const r=C.applyAI({field_0008:'5','sold.0.address':'5','active.0.address':'5'}, {fields});
 assert.equal(r.values.field_0008,full);assert.equal(r.values['sold.0.address'],'2913 W CORDELIA ST');
 assert.equal(C.applyAI({field_0008:'100 Manual Street'}, {fields}).values.field_0008,'100 Manual Street');
 assert.equal(C.applyAI({}, {fields:[entry('field_0008','5')]}).values.field_0008,undefined);
 assert.equal(C.validAddress('5'),false);assert.equal(C.validAddress(full),true);
});
test('Subject uploads cannot create sold or active comparable slots, on client or server',async()=>{
 const doc={path:'owner/report/source.pdf',name:'Subject.pdf',category:'subject'};
 const fields=[entry('field_0008','2913 W CORDELIA ST, TAMPA, FL 33607'),entry('sold.1.address','2913 W CORDELIA ST'),entry('sold.1.price','570200'),entry('active.1.address','2913 W CORDELIA ST')];
 const r=C.applyAI({_attachments:[doc]}, {fields});assert.equal(r.values['sold.1.address'],undefined);assert.equal(r.values['active.1.address'],undefined);assert.equal(r.values['sold.1.price'],undefined);
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const cleaned=cleanExtraction({fields:fields.map(f=>({...f,document:0}))},C.schema,[doc]);assert.deepEqual(cleaned.fields.map(f=>f.name),['field_0008']);
 assert.equal(cleanExtraction({fields:[{...entry('field_0008','5'),document:0}]},C.schema,[doc]).fields.length,0);
});
