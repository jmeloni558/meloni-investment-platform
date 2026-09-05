'use strict';
(()=>{
  const VERSION=5;
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
      document.body.classList.remove('pt-user-signed-in');
      return;
    }
    nav.dataset.accountToolbar='true';
    document.body.classList.add('pt-user-signed-in');
    nav.innerHTML='<a href="index.html?app-action=new">New Analysis</a><a href="index.html?app-action=existing">Saved Properties</a><a href="index.html?app-action=search-listings">Search Listings</a><a href="index.html?app-action=search-properties">Search Saved</a><a href="index.html?app-action=search-clients">Search Clients</a><a href="index.html?app-action=mortgage">Mortgage Tools</a><a href="glossary.html">Glossary</a>'+(owner?'':'<button type="button" data-manage-billing>Manage Subscription</button>');
    nav.querySelectorAll('a').forEach(link=>{if(new URL(link.href).pathname===location.pathname){link.classList.add('active');link.setAttribute('aria-current','page');}});
    if(document.querySelector('.topin')){
      let identity=document.querySelector('[data-account-identity]');
      if(!identity){identity=document.createElement('div');identity.dataset.accountIdentity='';identity.className='topactions';identity.innerHTML='<span id="authUser"></span><button id="profileBrandBtn" type="button">Profile &amp; Branding</button><button id="signOutBtn" type="button">Sign Out</button>';document.querySelector('.topin').appendChild(identity);identity.querySelector('#profileBrandBtn').onclick=()=>{location.href='index.html?app-action=profile';};identity.querySelector('#signOutBtn').onclick=async()=>{const button=identity.querySelector('#signOutBtn');button.disabled=true;try{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;await refresh(null,client);}catch(_e){button.disabled=false;alert('Sign out could not complete. Please try again.');}};}
      identity.querySelector('#authUser').textContent=user.email;
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
