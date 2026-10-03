const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/propertythesis-income-engine/index.ts'),'utf8').replace(/^import .*;\r?\n/,''));
function harness(authStatus=200,authBody={id:'test-user'},fail=false){
 let handler;const calls=[];
 vm.runInNewContext(source,{Request,Response,AbortSignal,console,
  Deno:{env:{get:k=>({SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test'})[k]},serve:f=>handler=f},
  fetch:async(url,options)=>{calls.push({url,options});if(url.endsWith('/auth/v1/user')){if(fail)throw Error('offline');return Response.json(authBody,{status:authStatus});}return Response.json({allowed:true});}
 });
 return {calls,run:(authorization='Bearer fixture-token')=>handler(new Request('https://test.invalid',{method:'POST',headers:{origin:'https://propertythesis.com',...(authorization?{authorization}:{})},body:JSON.stringify({action:'analyze',state:{price:100000,rent:1000,hold:1}})}))};
}
test('deleted or expired identity cannot calculate or recreate counters',async()=>{
 for(const status of [401,403]){const h=harness(status,{msg:'User missing'});assert.equal((await h.run()).status,401);assert.equal(h.calls.length,1);}
});
test('Auth outage and malformed response fail closed before counter writes',async()=>{
 for(const h of [harness(503,{}),harness(200,{}),harness(200,{},true)]){assert.equal((await h.run()).status,503);assert.equal(h.calls.length,1);}
});
test('missing credentials are rejected without any downstream request',async()=>{
 const h=harness();assert.equal((await h.run('')).status,401);assert.equal(h.calls.length,0);
});
test('verified account retains calculation and existing two rate limits',async()=>{
 const h=harness();const response=await h.run();assert.equal(response.status,200);assert.ok((await response.json()).result);
 assert.equal(h.calls.length,3);assert.equal(h.calls[0].options.headers.Authorization,'Bearer fixture-token');assert.equal(h.calls[0].options.headers.apikey,'public-test');
 for(const call of h.calls.slice(1))assert.equal(JSON.parse(call.options.body).p_user_id,'test-user');
});
