const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../operations/bpo/core.cjs');
const src=fs.readFileSync('bpo-workspace.js','utf8');
test('general AI input excludes optional and legacy tax records but retains iMapp package role',async()=>{
 const {extractionDocuments,cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const docs=[{category:'subject',sourceKind:'mls',path:'mls'},{category:'subject',sourceKind:'imapp',packageRole:'tax',path:'imapp'},{category:'subject',sourceKind:'tax',extract:false,path:'tax'},{category:'subject',sourceKind:'tax',path:'old-tax'},{category:'sold',path:'sold'},{category:'active',path:'active'},{category:'market',path:'market'}];
 assert.deepEqual(extractionDocuments(docs,true).map(d=>d.path),['mls','imapp','sold','active','market']);assert.equal(extractionDocuments(docs,false).length,7);
 const fact=document=>({name:'sold.0.beds',value:'3',document,page:1,evidence:'Bedrooms 3'});
 assert.equal(cleanExtraction({fields:[fact(2)]},C.schema,docs,{general:true}).fields.length,0);
 assert.equal(cleanExtraction({fields:[fact(4)]},C.schema,docs,{general:true}).fields.length,0);
 assert.equal(cleanExtraction({fields:[fact(1)]},C.schema,docs,{general:true}).fields[0].value,'3');
 const server=fs.readFileSync('supabase/functions/bpo-extract/index.ts','utf8');assert.ok(server.indexOf('extractionDocuments(attachments,general)')<server.indexOf(".download(d.path)"));
});
function queue(groups,failAt=0,client="general"){
 let reads=0,uploaded=[],calls=0;const elements=Object.fromEntries(Object.entries(groups).map(([category,n])=>[category,{_queuedFiles:Array.from({length:n},(_,i)=>({name:category+i+'.pdf',size:10})),value:'selected'}]));
 const ctx={values:{_clientTemplate:client,_attachments:[]},epoch:1,dialog:{querySelector:selector=>elements[selector.match(/data-upload="([^"]+)"/)?.[1]]||null},status:()=>{},upload:async(files,token,category,extract)=>{calls++;if(calls===failAt)throw Error('Upload failed');uploaded.push({category,extract});ctx.values._attachments.push({sourceKind:category==='tax'?'tax':category});return true;},extractAI:async()=>{reads++}};
 vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('function sourceUploadGroups('),src.indexOf('async function upload(')),ctx);return {ctx,elements,uploaded,reads:()=>reads};
}
test('one batch uploads all six source groups and extracts once',async()=>{const q=queue({subject:1,imapp:1,tax:1,sold:3,active:3,market:1});await q.ctx.uploadSelectedComps();assert.equal(q.uploaded.length,10);assert.ok(q.uploaded.every(x=>x.extract===false));assert.equal(q.reads(),1);assert.ok(Object.values(q.elements).every(e=>!e._queuedFiles.length));});
test('tax-only batch saves without invoking AI',async()=>{const q=queue({tax:1});await q.ctx.uploadSelectedComps();assert.equal(q.uploaded.length,1);assert.equal(q.reads(),0);});
test('failed upload keeps remaining files queued without starting AI',async()=>{const q=queue({subject:1,imapp:1,sold:2},2);await assert.rejects(q.ctx.uploadSelectedComps(),/Upload failed/);assert.equal(q.elements.subject._queuedFiles.length,0);assert.equal(q.elements.imapp._queuedFiles.length,1);assert.equal(q.elements.sold._queuedFiles.length,2);assert.equal(q.reads(),0);await q.ctx.uploadSelectedComps();assert.equal(q.uploaded.length,4);assert.equal(q.reads(),1);});
test('batch validation stops excessive file counts before uploading',async()=>{const q=queue({subject:1,sold:6,active:6});await assert.rejects(q.ctx.uploadSelectedComps(),/twelve/);assert.equal(q.uploaded.length,0);});
test('new subject uploads persist distinct MLS, iMapp and attachment-only tax metadata',async()=>{
 let extraction=0,saves=0;const ctx={values:{_clientTemplate:'general'},record:null,epoch:1,window:{PropertyThesisBPOCore:C},collect:()=>{},save:async()=>{saves++;ctx.record={id:'report'};return true;},user:()=> 'owner',TextDecoder,crypto:{randomUUID:()=>String(saves)},status:()=>{},pdfText:async()=>'',client:()=>({storage:{from:()=>({upload:async()=>({})})}}),renderDocuments:()=>{},extractAI:async()=>{extraction++}};
 vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('async function upload('),src.indexOf('async function extractAI(')),ctx);
 const file={name:'source.pdf',size:10,arrayBuffer:async()=>new TextEncoder().encode('%PDF-test').buffer};
 for(const category of ['subject','imapp','tax'])await ctx.upload([file],1,category,false);
 assert.equal(extraction,0);assert.equal(ctx.values._subjectPending,true);assert.equal(ctx.values._attachments.length,3);
 assert.deepEqual(Array.from(ctx.values._attachments,d=>d.sourceKind),['mls','imapp','tax']);
 assert.equal(ctx.values._attachments[1].category,'subject');assert.equal(ctx.values._attachments[1].extract,undefined);
 assert.equal(ctx.values._attachments[2].extract,false);assert.equal(ctx.values._attachments[2].packageRole,'tax');assert.ok(saves>=4);
});

for(const failAt of [0,3])test('RRR centralized sources retain tax eligibility and retry remaining files '+failAt,async()=>{const q=queue({subject:1,imapp:1,tax:1,sold:1,active:1,market:1},failAt,'rrr');if(failAt){await assert.rejects(q.ctx.uploadSelectedComps(),/Upload failed/);assert.equal(q.reads(),0);assert.equal(q.elements.tax._queuedFiles.length,1);}await q.ctx.uploadSelectedComps();assert.equal(q.uploaded.length,6);assert.equal(q.reads(),1);assert.ok(q.uploaded.every(x=>x.extract===false));});
test('RRR tax-only batch is not excluded by the General attachment rule',async()=>{const q=queue({tax:1},0,'rrr');await q.ctx.uploadSelectedComps();assert.equal(q.reads(),1);});
