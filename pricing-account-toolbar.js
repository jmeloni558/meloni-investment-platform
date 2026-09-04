'use strict';
(()=>{
  const VERSION=4;
  if((window.__pricingAccountToolbarV||0)>=VERSION)return;
  window.__pricingAccountToolbarV=VERSION;
  const SUPABASE_URL='https://lmaiqpkogmmsldkziggy.supabase.co';
  const SUPABASE_KEY='sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7';
  let request=0;
  const guests=new Map();
  function render(user,client,owner){
    const nav=document.querySelector('.pricing-nav,[data-account-nav]');if(!nav)return;
    if(!guests.has(nav))guests.set(nav,nav.innerHTML);
    if(!user){
      if(nav.dataset.accountToolbar){nav.innerHTML=guests.get(nav);delete nav.dataset.accountToolbar;}
      document.querySelector('[data-account-identity]')?.remove();
      return;
    }
    nav.dataset.accountToolbar='true';
    nav.innerHTML='<a href="index.html?app-action=new">New Analysis</a><a href="index.html?app-action=existing">Existing Properties</a><a href="index.html?app-action=search-listings">Search Listings</a><a href="index.html?app-action=search-properties">Search Saved</a><a href="index.html?app-action=search-clients">Search Clients</a><a href="index.html?app-action=mortgage">Mortgage Tools</a><a href="glossary.html">Glossary</a>'+(owner?'':'<button type="button" data-manage-billing>Manage Subscription</button>');
    if(nav.hasAttribute('data-account-nav')){
      let identity=document.querySelector('[data-account-identity]');
      if(!identity){identity=document.createElement('a');identity.dataset.accountIdentity='';identity.href='index.html';identity.style.cssText='color:#fff;font-size:14px;line-height:1.6;overflow-wrap:anywhere;text-align:right;max-width:100%';document.querySelector('.topin')?.appendChild(identity);}
      identity.textContent=user.email+(owner?' · Owner access':' · My account');
      identity.setAttribute('aria-label','Signed in as '+user.email+(owner?', owner access':''));
      document.querySelectorAll('.sample-next-step>a').forEach(link=>{link.textContent='Start My Analysis →';link.href='index.html?app-action=new';});
    }
    nav.querySelector('[data-manage-billing]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;if(button.disabled)return;
      button.disabled=true;button.textContent='Opening billing…';
      try{
        const {data,error}=await client.functions.invoke('create-billing-portal',{body:{}});
        if(error)throw error;if(!data?.url)throw new Error(data?.error||'Billing management could not open.');
        location.href=data.url;
      }catch(_error){button.disabled=false;button.textContent='Manage Subscription';alert('Billing management could not open. Please try again.');}
    });
  }
  async function refresh(user,client){
    const current=++request;
    if(!user){render(null,client,false);document.querySelectorAll('.sample-next-step>a').forEach(link=>{link.textContent='Start My Free Analysis →';link.href='index.html?from=guides';});return;}
    let owner=false;
    try{const {data}=await client.rpc('get_account_access');owner=data?.owner===true;}catch(_e){}
    if(current===request)render(user,client,owner);
  }
  async function start(){
    try{
      if(!window.supabase?.createClient)return;
      const client=window.__ptSharedSupabaseClient||(window.__ptSharedSupabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
      client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>refresh(session?.user,client),0));
      const {data}=await client.auth.getSession();await refresh(data?.session?.user,client);
    }catch(_e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
