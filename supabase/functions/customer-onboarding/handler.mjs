import { renderEmail } from './content.mjs';

const same = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff === 0;
};
const json = (body, status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const tokenPattern = /^[0-9a-f-]{72}$/;

// Injectable I/O keeps tests independent of real recipients and production services.
export function createHandler({ env, rpc, getUser, send, verifyWebhook, pause = ms=>new Promise(r=>setTimeout(r,ms)) }) {
  return async function handle(req) {
    const url=new URL(req.url), route=url.pathname.split('/').pop();
    try {
      if(route==='unsubscribe') {
        const token=url.searchParams.get('token')||'';
        if(!tokenPattern.test(token)) return json({error:'Invalid unsubscribe link'},400);
        if(req.method==='GET') {
          // Link scanners may GET this URL; only a deliberate POST changes preference.
          const site=env('SUPABASE_URL')==='https://oxyjbfhpsxaaerchyaql.supabase.co'?'https://staging.propertythesis.com':'https://propertythesis.com';
          return new Response(null,{status:303,headers:{Location:`${site}/email-preferences.html#token=${token}`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
        }
        if(req.method!=='POST')return json({error:'Method not allowed'},405);
        const found=await rpc('onboarding_unsubscribe',{p_token:token});
        if(!found)return json({error:'This link is no longer valid. Contact jamie@propertythesis.com for help.'},400);
        if((req.headers.get('accept')||'').includes('text/html')) {
          const site=env('SUPABASE_URL')==='https://oxyjbfhpsxaaerchyaql.supabase.co'?'https://staging.propertythesis.com':'https://propertythesis.com';
          return new Response(null,{status:303,headers:{Location:`${site}/email-preferences.html?unsubscribed=1`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
        }
        return new Response('You have been unsubscribed from PropertyThesis welcome and website-tip emails. Your account remains available.',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
      }
      if(route==='webhook') {
        if(req.method!=='POST')return json({error:'Method not allowed'},405);
        const raw=await req.text();if(raw.length>65536)return json({error:'Too large'},413);
        if(!env('ONBOARDING_WEBHOOK_SECRET')||!await verifyWebhook(req,raw,env('ONBOARDING_WEBHOOK_SECRET')))return json({error:'Unauthorized'},401);
        const event=JSON.parse(raw);
        if(['email.bounced','email.complained','email.suppressed'].includes(event.type)) {
          for(const email of (Array.isArray(event.data?.to)?event.data.to:[]).slice(0,10)) {
            if(typeof email==='string')await rpc('onboarding_suppress',{p_email:email});
          }
        }
        return json({received:true});
      }
      if(route!=='customer-onboarding' && route!=='send')return json({error:'Not found'},404);
      if(req.method!=='POST')return json({error:'Method not allowed'},405);
      if(!same(req.headers.get('x-onboarding-secret')||'',env('ONBOARDING_CRON_SECRET')||''))return json({error:'Unauthorized'},401);
      if(env('ONBOARDING_ENABLED')!=='true')return json({status:'disabled'});
      const project=env('SUPABASE_URL');
      if(!['https://lmaiqpkogmmsldkziggy.supabase.co','https://oxyjbfhpsxaaerchyaql.supabase.co'].includes(project))return json({error:'Unsupported environment'},503);
      // Staging must explicitly identify synthetic recipients. No send-all staging mode.
      const allow=(env('ONBOARDING_TEST_RECIPIENTS')||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
      if(project.includes('oxyjbfhpsxaaerchyaql')&&!allow.length)return json({error:'Staging recipient allowlist required'},503);
      const summary={accepted:0,failed:0,uncertain:0,cancelled:0};
      for(let i=0;i<10;i++) {
        const job=await rpc('onboarding_claim',{});if(!job)break;
        const finish=async(status,id=null)=>{
          const recorded=await rpc('onboarding_finish',{p_id:job.id,p_status:status,p_provider_id:id});
          if(!recorded)throw Error('Receipt unavailable');
          summary[status]++;
        };
        // A missing/deleted/unverified/changed account must not receive a scheduled email.
        let user;try{user=await getUser(job.user_id);}catch{await finish('failed');continue;}
        if(!user?.email_confirmed_at || user.deleted_at || user.banned_until && Date.parse(user.banned_until)>Date.now()
          || user.email?.toLowerCase()!==job.email.toLowerCase()
          || (allow.length&&!allow.includes(job.email.toLowerCase()))
          || !await rpc('onboarding_can_send',{p_id:job.id})) { await finish('cancelled');continue; }
        const unsubscribeUrl=`${project}/functions/v1/customer-onboarding/unsubscribe?token=${job.token}`;
        let body;try { body=renderEmail(job.step,{unsubscribeUrl,tips:job.tips,appDownloadUrl:env('ONBOARDING_PUBLIC_APP_URL')||''}); }
        catch{await finish('failed');continue;}
        let status='uncertain',providerId=null;
        try {
          const result=await send({from:'PropertyThesis <notifications@auth.propertythesis.com>',to:[job.email],reply_to:'jamie@propertythesis.com',...body,
            headers:{'List-Unsubscribe':`<${unsubscribeUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}},`onboarding-${job.id}`);
          if(result.ok&&typeof result.id==='string'&&result.id.length>0){status='accepted';providerId=result.id;}
          else if(!result.ok&&result.status>=400&&result.status<500)status='failed';
        }catch{/* Leave unknown outcomes for reconciliation, never blindly repeat a send. */}
        await finish(status,providerId);
        if(status==='uncertain')break;
        await pause(600);
      }
      return json(summary);
    }catch{return json({error:'Onboarding operation incomplete; check delivery state before retrying.'},503);}
  };
}
