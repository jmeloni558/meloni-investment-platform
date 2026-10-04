import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { verifyWebhook } from '../supabase/functions/customer-onboarding/verify-webhook.mjs';

test('webhook validates signed raw body, timestamp and rotation signatures',async()=>{
  const bytes=randomBytes(32),secret='whsec_'+bytes.toString('base64');
  const raw=JSON.stringify({type:'email.complained',data:{to:['fixture@resend.dev']}});
  const timestamp=String(Math.floor(Date.now()/1000)),id='msg_fixture';
  const signature=createHmac('sha256',bytes).update(`${id}.${timestamp}.${raw}`).digest('base64');
  const request=(overrides={})=>new Request('https://example.com',{headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':`v1,${signature}`,...overrides}});
  assert.equal(await verifyWebhook(request(),raw,secret),true);
  assert.equal(await verifyWebhook(request(),raw+' ',secret),false);
  assert.equal(await verifyWebhook(request({'svix-id':'msg_other'}),raw,secret),false);
  assert.equal(await verifyWebhook(request({'svix-timestamp':String(Number(timestamp)-301)}),raw,secret),false);
  assert.equal(await verifyWebhook(request({'svix-timestamp':String(Number(timestamp)+301)}),raw,secret),false);
  assert.equal(await verifyWebhook(request({'svix-signature':`v1,AAAA v1,${signature}`}),raw,secret),true);
  assert.equal(await verifyWebhook(request({'svix-signature':'v1,not-base64!'}),raw,secret),false);
  assert.equal(await verifyWebhook(request(),raw,'whsec_bad!'),false);
  assert.equal(await verifyWebhook(new Request('https://example.com'),raw,secret),false);
});
