// Counts-only operator alert. Separate opt-in gate from customer email delivery.
export async function runMonitor({env,rpc,send}) {
  if(env('ONBOARDING_ALERTS_ENABLED')!=='true')return {status:'disabled'};
  const project=env('SUPABASE_URL');
  if(!['https://oxyjbfhpsxaaerchyaql.supabase.co','https://lmaiqpkogmmsldkziggy.supabase.co'].includes(project))throw Error('Unsupported environment');
  const alert=await rpc('onboarding_claim_alert',{});
  if(!alert)return {status:'quiet'};
  const keys=['failed','uncertain','stale_claims','overdue'];
  const counts=keys.map(k=>k+': '+(Number.isSafeInteger(alert.counts?.[k])?alert.counts[k]:'unavailable')).join('\n');
  let status='uncertain',id=null;
  try {
    const result=await send({from:'PropertyThesis Alerts <notifications@auth.propertythesis.com>',to:['jamie@propertythesis.com'],
      subject:`PropertyThesis ${project.includes('oxyjbf')?'staging':'production'} onboarding needs attention`,
      text:'Review the onboarding email queue. Do not blindly retry uncertain sends.\n\n'+counts+'\n\nNo customer data is included.'},'onboarding-alert-'+alert.id);
    if(result.ok&&typeof result.id==='string'&&result.id){status='accepted';id=result.id;}
    else if(!result.ok&&result.status>=400&&result.status<500)status='failed';
  }catch{/* Unknown provider outcomes stay held. */}
  if(!await rpc('onboarding_finish_alert',{p_id:alert.id,p_status:status,p_provider_id:id}))throw Error('Alert receipt unavailable');
  return {status};
}
