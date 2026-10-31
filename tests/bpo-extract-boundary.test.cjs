const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const schema=JSON.parse(fs.readFileSync('supabase/functions/bpo-extract/fields.json','utf8'));

async function exercise(attachments){
 const contract=await import('../supabase/functions/bpo-extract/contract.mjs');
 const downloads=[],requests=[];
 const report={id:'11111111-1111-1111-1111-111111111111',revision:1,field_values:{_clientTemplate:'general',_subjectPending:true,_attachments:attachments}};
 const query={select(){return this;},eq(){return this;},async maybeSingle(){return {data:report};}};
 const db={rpc:async()=>({data:true}),from:()=>query,storage:{from:()=>({download:async path=>{downloads.push(path);return {data:new Blob(['%PDF-'+path])};}})}};
 const admin={auth:{admin:{getUserById:async()=>({data:{user:{email_confirmed_at:'2026-01-01'}}})}},rpc:async()=>({data:{allowed:true}})};
 const context={...contract,schema,withSupabase:(_options,handler)=>handler,Request,Response,Blob,TextDecoder,Uint8Array,AbortSignal,btoa,console,Deno:{env:{get:name=>name==='OPENAI_API_KEY'?'test-key':undefined}},extractText:async()=>({text:['fixture']}),PDFDocument:{create:async()=>({embedFont:async()=>({widthOfTextAtSize:()=>0})})},StandardFonts:{Helvetica:'Helvetica'},fetch:async(_url,options)=>{requests.push(JSON.parse(options.body));return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:'{"fields":[],"warnings":[]}'}]}]}));}};
 const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/bpo-extract/index.ts','utf8').replace(/^import .*;\r?\n/gm,'').replace('export default','const handler ='))+'\nthis.handler=handler;';
 vm.createContext(context);vm.runInContext(source,context);
 const response=await context.handler.fetch(new Request('https://test.invalid',{method:'POST',headers:{origin:'https://propertythesis.com'},body:JSON.stringify({reportId:report.id,revision:1})}),{supabase:db,supabaseAdmin:admin,userClaims:{id:'owner'}});
 return {response,downloads,requests};
}
const document=(sourceKind,extra={})=>({name:sourceKind+'.pdf',path:'owner/11111111-1111-1111-1111-111111111111/'+sourceKind+'.pdf',category:'subject',sourceKind,...extra});
test('handler never downloads or transmits optional tax PDFs; iMapp is still sent',async()=>{
 const docs=[document('mls'),document('imapp',{packageRole:'tax'}),document('tax',{extract:false}),document('legacy-tax',{category:'tax'}),document('sold',{category:'sold'}),document('active',{category:'active'}),document('market',{category:'market'})];
 const result=await exercise(docs);assert.equal(result.response.status,200);
 assert.deepEqual(result.downloads,[docs[0],docs[1],docs[4],docs[5],docs[6]].map(d=>d.path));assert.equal(result.requests.length,3);
 for(const request of result.requests){const content=request.input[0].content;const context=JSON.parse(content[0].text);assert.ok(context.fields.filter(f=>f.name.endsWith('.site')).every(f=>f.label.includes('lot size')));assert.match(context.task,/omit missing or conflicting/);assert.equal(content.filter(c=>c.type==='input_file').length,5);assert.ok(!JSON.stringify(content).includes('legacy-tax.pdf'));assert.ok(!JSON.stringify(content).includes('Source kind: tax.'));for(const input of content.filter(c=>c.type==='input_file'))assert.ok(!Buffer.from(input.file_data.split(',')[1],'base64').toString().includes('/tax.pdf'));}
});
test('tax-only handler request performs no download or AI request',async()=>{
 const result=await exercise([document('tax',{extract:false})]);assert.equal(result.response.status,400);assert.deepEqual(result.downloads,[]);assert.deepEqual(result.requests,[]);
});
