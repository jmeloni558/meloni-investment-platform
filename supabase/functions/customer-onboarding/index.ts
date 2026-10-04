import { createHandler } from './handler.mjs';
import { verifyWebhook } from './verify-webhook.mjs';

const env=(key:string)=>Deno.env.get(key);
async function rpc(name:string,body:unknown) {
  const key=env('SUPABASE_SERVICE_ROLE_KEY');
  const r=await fetch(env('SUPABASE_URL')+'/rest/v1/rpc/'+name,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:key!,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw Error('Database operation unavailable');
  return r.status===204?null:await r.json();
}
async function getUser(id:string) {
  const key=env('SUPABASE_SERVICE_ROLE_KEY');
  const r=await fetch(env('SUPABASE_URL')+'/auth/v1/admin/users/'+encodeURIComponent(id),{redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:key!,Authorization:'Bearer '+key}});
  if(r.status===404)return null;
  if(!r.ok)throw Error('Auth unavailable');
  const data=await r.json();return data.user||data;
}
Deno.serve(createHandler({env,rpc,getUser,verifyWebhook,send:async(body:unknown,idempotency:string)=>{
  const r=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{Authorization:'Bearer '+env('RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':idempotency},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));return {ok:r.ok,status:r.status,id:data.id};
}}));

