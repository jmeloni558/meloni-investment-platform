'use strict';
(()=>{
  if(new URLSearchParams(location.search).get('unsubscribed')==='1'){
    document.querySelector('h1').textContent='You are unsubscribed';
    document.getElementById('emailPreferences').hidden=true;
    document.getElementById('status').textContent='Welcome and weekly website-tip emails have been stopped. Your account and essential security emails remain available.';
    return;
  }
  const token=new URLSearchParams(location.hash.slice(1)).get('token')||'';
  const project=location.hostname==='staging.propertythesis.com'?'oxyjbfhpsxaaerchyaql':
    ['propertythesis.com','www.propertythesis.com'].includes(location.hostname)?'lmaiqpkogmmsldkziggy':null;
  const status=document.getElementById('status');
  if(!project||!/^[0-9a-f-]{72}$/.test(token)){status.textContent='Open the unsubscribe link from your PropertyThesis email, or contact support.';return;}
  const form=document.getElementById('emailPreferences');
  form.action=`https://${project}.supabase.co/functions/v1/customer-onboarding/unsubscribe?token=${encodeURIComponent(token)}`;
  document.getElementById('unsubscribe').disabled=false;
  status.textContent='Choose Unsubscribe to confirm. No sign-in is needed.';
})();
