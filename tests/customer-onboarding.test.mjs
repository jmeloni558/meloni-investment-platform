import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { renderEmail, lessons } from '../supabase/functions/customer-onboarding/content.mjs';
import { createHandler } from '../supabase/functions/customer-onboarding/handler.mjs';

const project='https://oxyjbfhpsxaaerchyaql.supabase.co';
const token='12345678-1234-1234-1234-123456789012'.repeat(2);
const url=project+'/functions/v1/customer-onboarding';
function fixture(options={}) {
  const calls=[],sends=[],receipts=[];
  const queue=[{id:'delivery-1',user_id:'user-1',email:'delivered@resend.dev',step:0,tips:true,token}];
  const config={SUPABASE_URL:project,ONBOARDING_ENABLED:'true',ONBOARDING_CRON_SECRET:'test-secret',ONBOARDING_TEST_RECIPIENTS:'delivered@resend.dev',ONBOARDING_WEBHOOK_SECRET:'test-webhook',...options.env};
  let stopped=false;
  const handler=createHandler({env:k=>config[k],pause:async()=>{},
    rpc:async(name,body)=>{
      calls.push({name,body});
      if(name==='onboarding_claim')return queue.shift()||null;
      if(name==='onboarding_can_send')return options.canSend!==false&&!stopped;
      if(name==='onboarding_finish'){receipts.push(body);return !options.receiptFailure;}
      if(name==='onboarding_unsubscribe'){stopped=true;return body.p_token===token;}
    },
    getUser:async()=> options.deleted?null:{email:options.changedEmail?'other@example.com':'delivered@resend.dev',email_confirmed_at:options.unverified?null:'2026-10-04',banned_until:options.banned?'2099-01-01':null},
    send:async(body,key)=>{sends.push({body,key});if(options.timeout)throw Error('timeout');return options.provider||{ok:true,status:200,id:'resend-id'};},
    verifyWebhook:async()=>options.validWebhook===true,
  });
  const run=(headers={'x-onboarding-secret':'test-secret'})=>handler(new Request(url,{method:'POST',headers}));
  return {handler,run,calls,sends,receipts};
}
test('unauthorized caller cannot claim jobs or send mail',async()=>{
  const f=fixture();assert.equal((await f.run({})).status,401);assert.equal(f.calls.length,0);assert.equal(f.sends.length,0);
});
test('disabled worker cannot claim or send',async()=>{
  const f=fixture({env:{ONBOARDING_ENABLED:'false'}});assert.deepEqual(await(await f.run()).json(),{status:'disabled'});assert.equal(f.calls.length,0);
});
test('staging requires explicit recipient allowlist',async()=>{
  const f=fixture({env:{ONBOARDING_TEST_RECIPIENTS:''}});assert.equal((await f.run()).status,503);assert.equal(f.calls.length,0);
});
test('successful send uses stable idempotency key and records provider acceptance',async()=>{
  const f=fixture();assert.equal((await f.run()).status,200);assert.equal(f.sends.length,1);
  assert.equal(f.sends[0].key,'onboarding-delivery-1');assert.deepEqual(f.sends[0].body.to,['delivered@resend.dev']);
  assert.match(f.sends[0].body.headers['List-Unsubscribe'],/unsubscribe\?token=/);
  assert.equal(f.sends[0].body.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
  assert.equal(f.receipts[0].p_status,'accepted');assert.equal(f.receipts[0].p_provider_id,'resend-id');
});
for(const condition of ['deleted','unverified','changedEmail','banned'])test(`${condition} user is not emailed`,async()=>{
  const f=fixture({[condition]:true});await f.run();assert.equal(f.sends.length,0);assert.equal(f.receipts[0].p_status,'cancelled');
});
test('an unsubscribe after claim prevents sending',async()=>{
  const f=fixture({canSend:false});await f.run();assert.equal(f.sends.length,0);assert.equal(f.receipts[0].p_status,'cancelled');
});
test('staging cannot send to a recipient outside allowlist',async()=>{
  const f=fixture({env:{ONBOARDING_TEST_RECIPIENTS:'different@resend.dev'}});await f.run();assert.equal(f.sends.length,0);
});
test('timeout leaves uncertain receipt rather than retrying',async()=>{
  const f=fixture({timeout:true});await f.run();assert.equal(f.sends.length,1);assert.equal(f.receipts[0].p_status,'uncertain');
});
test('provider 429 is recorded as failed, not accepted',async()=>{
  const f=fixture({provider:{ok:false,status:429}});await f.run();assert.equal(f.receipts[0].p_status,'failed');
});
test('unknown provider result and failed database receipt are not reported successful',async()=>{
  const f=fixture({provider:{ok:true,status:200},receiptFailure:true});assert.equal((await f.run()).status,503);assert.equal(f.sends.length,1);
});
test('GET unsubscribe is scanner-safe; POST stops messages',async()=>{
  const f=fixture(),u=url+'/unsubscribe?token='+token;
  const get=await f.handler(new Request(u));assert.equal(get.status,303);assert.match(get.headers.get('location'),/^https:\/\/staging.propertythesis.com\/email-preferences.html#token=/);assert.equal(f.calls.length,0);
  assert.equal((await f.handler(new Request(u,{method:'POST'}))).status,200);
  await f.run();assert.equal(f.sends.length,0);
});
test('browser unsubscribe returns to a visible confirmation page',async()=>{
  const f=fixture();
  const r=await f.handler(new Request(url+'/unsubscribe?token='+token,{method:'POST',headers:{Accept:'text/html'}}));
  assert.equal(r.status,303);
  assert.equal(r.headers.get('location'),'https://staging.propertythesis.com/email-preferences.html?unsubscribed=1');
  assert.equal(f.calls[0].name,'onboarding_unsubscribe');
  const page=readFileSync(new URL('../email-preferences.html',import.meta.url),'utf8');
  assert.match(page,/form-action 'self' https:\/\/lmaiqpkogmmsldkziggy.supabase.co https:\/\/oxyjbfhpsxaaerchyaql.supabase.co;/);
});
test('invalid unsubscribe token cannot change preferences',async()=>{
  const f=fixture();assert.equal((await f.handler(new Request(url+'/unsubscribe?token=bad',{method:'POST'}))).status,400);assert.equal(f.calls.length,0);
});
test('unverified suppression webhook is rejected',async()=>{
  const f=fixture();assert.equal((await f.handler(new Request(url+'/webhook',{method:'POST',body:'{}'}))).status,401);assert.equal(f.calls.length,0);
});
test('verified complaint suppresses only specified recipient',async()=>{
  const f=fixture({validWebhook:true});assert.equal((await f.handler(new Request(url+'/webhook',{method:'POST',body:JSON.stringify({type:'email.complained',data:{to:['delivered@resend.dev']}})}))).status,200);
  assert.deepEqual(f.calls,[{name:'onboarding_suppress',body:{p_email:'delivered@resend.dev'}}]);
});
test('welcome and six tips have HTML, plain text and unsubscribe',()=>{
  assert.equal(lessons.length,7);
  for(let i=0;i<7;i++){
    const m=renderEmail(i,{unsubscribeUrl:url+'/unsubscribe?token='+token,tips:true});
    assert.ok(m.subject.length<90);assert.match(m.html,/<html lang="en">/);assert.match(m.text,/Unsubscribe:/);assert.match(m.text,/18012 Loretta Lane/);
    assert.doesNotMatch(m.text,/apps\/internaltest/);
  }
  assert.match(renderEmail(0,{unsubscribeUrl:url+'/unsubscribe?token='+token}).text,/not been enrolled/);
  assert.throws(()=>renderEmail(0,{unsubscribeUrl:url,appDownloadUrl:'https://play.google.com/apps/internaltest/123'}),/Public app/);
});
test('schema prevents public claims and unbounded repeats',()=>{
  const sql=readFileSync(new URL('../prototypes/release-integration/customer-onboarding.sql',import.meta.url),'utf8');
  assert.match(sql,/unique\(user_id,step\)/);assert.match(sql,/for update skip locked/);
  assert.match(sql,/next_due=now\(\)\+interval '7 days'/);assert.match(sql,/default false/);
  assert.match(sql,/references auth.users\(id\) on delete cascade/);
  assert.match(sql,/from public,anon,authenticated/);
});

if(process.env.WRITE_ONBOARDING_PREVIEW==='1') {
  const dir=new URL('../prototypes/release-integration/onboarding-preview/',import.meta.url);mkdirSync(dir,{recursive:true});
  for(let i=0;i<7;i++)writeFileSync(new URL(`${i===0?'welcome':`week-${i}`}.html`,dir),renderEmail(i,{unsubscribeUrl:'https://propertythesis.com/email-preferences-preview',tips:true}).html);
}
