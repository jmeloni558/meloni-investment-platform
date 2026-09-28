(function(root){
 'use strict';
 function create({enabled=false,projectUrl,publicKey,getClient,getGuestToken,fetchImpl=root.fetch}){
  const projects=new Set(['https://lmaiqpkogmmsldkziggy.supabase.co','https://oxyjbfhpsxaaerchyaql.supabase.co']);
  return async function suggest(input,element){
   if(!enabled||!projects.has(projectUrl))throw Error('Suggestions are unavailable. Manual entry is available.');
   const client=getClient();
   if(!client||client.supabaseUrl!==projectUrl)throw Error('Suggestion project mismatch.');
   const initial=await client.auth.getSession();
   if(initial.error)throw Error('Unable to check sign-in state.');
   const owner=initial.data?.session?.user?.id;
   if(owner){
    const {data,error}=await client.functions.invoke('mobile-address-suggestions',{body:{input}});
    if(error){const failure=Error('Suggestions are unavailable. Manual entry is available.');failure.status=error.context?.status;throw failure;}
    const current=await client.auth.getSession();
    if(current.error||current.data?.session?.user?.id!==owner)throw Error('Account changed; retry suggestions.');
    return data;
   }
   if(!publicKey||typeof getGuestToken!=='function')throw Error('Guest verification unavailable.');
   const captchaToken=await getGuestToken(element);
   // A stale field must not consume a newly completed verification/provider call.
   if(!element?.isConnected||element.value.trim()!==input)throw Error('Address changed; retry suggestions.');
   const current=await client.auth.getSession();
   if(current.error||current.data?.session?.user?.id)throw Error('Sign-in changed; retry suggestions.');
   const response=await fetchImpl(projectUrl+'/functions/v1/guest-address-suggestions',{
    method:'POST',credentials:'omit',headers:{apikey:publicKey,'Content-Type':'application/json'},
    body:JSON.stringify({input,captchaToken}),signal:AbortSignal.timeout(15000)});
   if(!response.ok){const failure=Error('Suggestions are unavailable. Manual entry is available.');failure.status=response.status;throw failure;}
   const data=await response.json();
   const final=await client.auth.getSession();
   if(final.error||final.data?.session?.user?.id)throw Error('Sign-in changed; retry suggestions.');
   return data;
  };
 }
 function guestVerifier({siteKey,loadTurnstile,timeoutMs=60000,action='guest_address_suggestions'}){
  if(!['guest_address_suggestions','guest_street_view'].includes(action))throw Error('Unsupported verification action.');
  // Never shares widget state/tokens with sign-in or password recovery.
  const pending=new WeakMap();
  return function getToken(input){
   if(!siteKey||!input?.isConnected)return Promise.reject(Error('Guest verification unavailable.'));
   if(input.ownerDocument.visibilityState==='hidden')return Promise.reject(Error('Return to this page and retry verification.'));
   pending.get(input)?.();
   return new Promise((resolve,reject)=>{
    const host=input.ownerDocument.createElement('div');host.className='pt-guest-address-check';
    // Listing image containers crop their contents; challenges must remain reachable.
    (input.closest('.pt-listing-streetview')||input.closest('.pt-specific-row')||input.closest('label')||input).after(host);
    let widget,ts,finished=false,observer;
    const doc=input.ownerDocument;
    const visibility=()=>{if(doc.visibilityState==='hidden')done(Error('Return to this page and retry verification.'));};
    const done=(error,token)=>{if(finished)return;finished=true;clearTimeout(timer);doc.removeEventListener('visibilitychange',visibility);observer?.disconnect();pending.delete(input);if(widget!==undefined)try{ts.remove(widget);}catch{}host.remove();error?reject(error):resolve(token);};
    const cancel=()=>done(Error('Verification superseded.'));pending.set(input,cancel);
    const timer=setTimeout(()=>done(Error('Verification timed out.')),timeoutMs);
    doc.addEventListener('visibilitychange',visibility);
    const Observer=doc.defaultView?.MutationObserver;
    if(Observer){observer=new Observer(()=>{if(!input.isConnected)done(Error('Address field closed.'));});observer.observe(doc.body,{childList:true,subtree:true});}
    Promise.resolve().then(loadTurnstile).then(value=>{
     if(finished)return;ts=value;
     if(!input.isConnected)return done(Error('Address field closed.'));
     widget=ts.render(host,{sitekey:siteKey,action,theme:'auto',retry:'never','refresh-expired':'never','refresh-timeout':'never',
      callback:token=>token?done(null,token):done(Error('Verification failed.')),
      'error-callback':()=>done(Error('Verification unavailable.')),
      'expired-callback':()=>done(Error('Verification expired.')),
      'timeout-callback':()=>done(Error('Verification timed out.'))});
     if(finished&&widget!==undefined)try{ts.remove(widget);}catch{}
    }).catch(error=>done(error));
   });
  };
 }
 function loadTurnstile(){
  if(root.turnstile)return Promise.resolve(root.turnstile);
  return new Promise((resolve,reject)=>{
   let script=root.document.querySelector('script[data-pt-turnstile]');
   if(!script){script=root.document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.dataset.ptTurnstile='1';root.document.head.appendChild(script);}
   const start=Date.now();const timer=setInterval(()=>{if(root.turnstile){clearInterval(timer);resolve(root.turnstile);}else if(Date.now()-start>15000){clearInterval(timer);reject(Error('Verification could not load.'));}},50);
  });
 }
 const api={create,guestVerifier,loadTurnstile};
 if(typeof module!=='undefined')module.exports=api;else root.PTWebsiteGoogleSuggestions=api;
})(typeof window!=='undefined'?window:globalThis);
