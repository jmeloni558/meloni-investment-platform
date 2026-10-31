const test=require('node:test'),assert=require('node:assert/strict'),C=require('../operations/bpo/core.cjs'),fs=require('node:fs'),vm=require('node:vm');
const descriptors=['location','tenure','site','view','design','quality','year','rooms','beds','baths','gla','basement','utility','hvac','energy','garage','porches','fireplace','fence','pool','other'];
for(const kind of ['sold','active'])for(const i of [1,2,3])test(`${kind} comparable ${i} follows PDF row order`,()=>{
 const rows=C.generalComparableFields(kind,i,C.schema),keys=['condition','distance','price','ppsf','source',...(kind==='sold'?['date']:[]),'dom','reo','financing',...descriptors];
 assert.deepEqual(rows.map(f=>f.name),keys.map(k=>`${kind}.${i}.${k}`));assert.ok(rows.every(f=>f.pdfName));assert.equal(rows.find(f=>f.name.endsWith('.price')).label,kind==='sold'?'Sale price ($)':'List / asking price ($)');
});
test('MLS imports comparable descriptions with requested room defaults and no invented utility',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const docs=[{category:'sold',path:'sold.pdf'},{category:'active',path:'pending.pdf'}];
 const fields=[{name:'sold.1.address',value:'100 Test Lane',document:0,page:1,evidence:'100 Test Lane'},...['quality','utility','beds','price'].map((key,i)=>({name:'sold.1.'+key,value:['Good','Average','3','300000'][i],document:0,page:1,evidence:['Construction quality: Good','Functional utility: Average','3 bedrooms','Closed price $300000'][i]})),{name:'active.1.address',value:'200 Test Lane',document:1,page:1,evidence:'200 Test Lane'},{name:'active.1.beds',value:'4',document:1,page:1,evidence:'4 beds'},{name:'active.1.source',value:'MLS Pending',document:1,page:1,evidence:'MLS status Pending'}];
 const result=cleanExtraction({fields},C.schema,docs,{general:true});const v=C.applyAI({},result).values;
 assert.equal(v['sold.1.quality'],'Good');assert.equal(v['sold.1.utility'],'Average');assert.equal(v['sold.1.rooms'],'6');assert.equal(v['active.1.rooms'],'7');assert.equal(v['active.1.utility'],undefined);assert.equal(v['active.1.source'],undefined);
 assert.equal(v['sold.1.pool'],undefined);assert.equal(v['sold.2.quality'],undefined);
 const manual=C.applyAI({...v,'sold.1.quality':'Fair'},result).values;assert.equal(manual['sold.1.quality'],'Fair');
});
test('general comparable extraction rejects unsupported ratings and wrong source groups',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');const fields=['sold.1.quality','sold.1.utility','active.1.price'].map(name=>({name,value:'Good',document:0,page:1,evidence:'Beautiful home'}));assert.equal(cleanExtraction({fields},C.schema,[{category:'sold',path:'sold.pdf'}],{general:true}).fields.length,0);
 assert.equal(C.recalculate({_clientTemplate:'rrr','sold.1.beds':'3'})['sold.1.rooms'],'6');
});
test('Step 2 renders editable fields for every slot and read-only calculated PPSF',()=>{
 const source=fs.readFileSync('bpo-workspace.js','utf8');const ctx={window:{PropertyThesisBPOCore:C},values:C.recalculate({}),esc:s=>String(s??''),proximityNote:()=>''};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('function fieldControl('),source.indexOf('function marketPanel('))+source.slice(source.indexOf('function generalCompEditor('),source.indexOf('function compSummary(')),ctx);
 const html=ctx.generalCompEditor();assert.equal((html.match(/pt-bpo-comp-editor/g)||[]).length,6);
 for(const kind of ['sold','active'])for(const i of [1,2,3])assert.ok(html.includes(`data-bpo-field="${kind}.${i}.pool"`));
 assert.match(html,/data-bpo-field="sold\.1\.ppsf"[^>]*readonly/);assert.match(html,/data-bpo-field="sold\.1\.distance"[^>]*readonly/);assert.ok(!html.includes('adj_'));assert.match(html,/data-bpo-field="sold\.1\.condition"[^>]*list="pt-bpo-condition-options"/);assert.match(html,/<input[^>]*data-comp-address="sold\.1"/);assert.ok(!html.includes('data-bpo-field="sold.1.city"'));
});

test('full comparable addresses retain PDF parts and clear stale locality on edits',()=>{
 const original={'sold.1.address':'100 Test Lane','sold.1.city':'Tampa','sold.1.state':'FL','sold.1.zip':'33603','sold.2.city':'Lutz'};
 assert.equal(C.comparableAddress(original,'sold.1'),'100 Test Lane, Tampa, FL 33603');
 const v=C.editComparableAddress(original,'sold.1','200 Main St, Lutz, FL 33548-1234');
 assert.equal(v['sold.1.address'],'200 Main St');assert.equal(v['sold.1.city'],'Lutz');assert.equal(v['sold.1.zip'],'33548-1234');assert.equal(v['sold.2.city'],'Lutz');
 assert.equal(C.comparableAddress(v,'sold.1'),'200 Main St, Lutz, FL 33548-1234');
 const partial=C.editComparableAddress(v,'sold.1','300 New St');assert.equal(partial['sold.1.city'],'');assert.equal(partial['sold.1.zip'],'');assert.equal(C.comparableAddress(C.editComparableAddress(v,'sold.1',''),'sold.1'),'');
 assert.equal(C.comparableAddress({'active.1.address':'400 Test Ave, Tampa, FL 33603','active.1.city':'Tampa'},'active.1'),'400 Test Ave, Tampa, FL 33603');
});
