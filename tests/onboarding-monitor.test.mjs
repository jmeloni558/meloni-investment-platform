import test from 'node:test';
import assert from 'node:assert/strict';
import {runMonitor} from '../supabase/functions/customer-onboarding/monitor.mjs';
import {createHandler} from '../supabase/functions/customer-onboarding/handler.mjs';
const config={ONBOARDING_ALERTS_ENABLED:'true',SUPABASE_URL:'https://oxyjbfhpsxaaerchyaql.supabase.co'};
test('alerts disabled means no database call or email',async()=>{
 assert.deepEqual(await runMonitor({env:()=>null,rpc:()=>assert.fail(),send:()=>assert.fail()}),{status:'disabled'});
});
test('quiet monitor sends nothing',async()=>{
 assert.deepEqual(await runMonitor({env:k=>config[k],rpc:async()=>null,send:()=>assert.fail()}),{status:'quiet'});
});
test('alert has fixed recipient, counts only, stable idempotency and receipt',async()=>{
 let receipt;
 const result=await runMonitor({env:k=>config[k],rpc:async(n,b)=>n==='onboarding_claim_alert'?{id:'a1',counts:{failed:1,uncertain:0,stale_claims:0,overdue:0,email:'private@example.com'}}:(receipt=b,true),send:async(body,key)=>{
  assert.deepEqual(body.to,['jamie@propertythesis.com']);assert.equal(key,'onboarding-alert-a1');assert.doesNotMatch(body.text,/private@example/);return {ok:true,id:'provider1'};
 }});
 assert.deepEqual(result,{status:'accepted'});assert.equal(receipt.p_provider_id,'provider1');
});
test('ambiguous alert send is held without retry',async()=>{
 let sends=0,receipt;
 await runMonitor({env:k=>config[k],rpc:async(n,b)=>n==='onboarding_claim_alert'?{id:'a1',counts:{}}:(receipt=b,true),send:async()=>{sends++;throw Error('timeout');}});
 assert.equal(sends,1);assert.equal(receipt.p_status,'uncertain');
});
test('monitor endpoint requires scheduler authentication',async()=>{
 const h=createHandler({env:()=>null,rpc:()=>assert.fail(),send:()=>assert.fail()});
 assert.equal((await h(new Request('https://example.com/monitor',{method:'POST'}))).status,401);
});
