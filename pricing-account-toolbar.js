'use strict';
(()=>{
  const VERSION=3;
  if((window.__pricingAccountToolbarV||0)>=VERSION)return;
  window.__pricingAccountToolbarV=VERSION;
  const SUPABASE_URL='https://lmaiqpkogmmsldkziggy.supabase.co';
  const SUPABASE_KEY='sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7';
  function render(user,client){
    const nav=document.querySelector('.pricing-nav');if(!nav||!user)return;
    nav.dataset.accountToolbar='true';
    nav.innerHTML='<a href="index.html?app-action=new">New Analysis</a><a href="index.html?app-action=existing">Existing Properties</a><a href="index.html?app-action=search-listings">Search Listings</a><a href="index.html?app-action=search-properties">Search Saved</a><a href="index.html?app-action=search-clients">Search Clients</a><a href="index.html?app-action=mortgage">Mortgage Tools</a><a href="glossary.html">Glossary</a><button type="button" data-manage-billing>Manage Subscription</button>';
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
  async function start(){
    try{
      if(!window.supabase?.createClient)return;
      const client=window.__ptSharedSupabaseClient||(window.__ptSharedSupabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
      const {data}=await client.auth.getSession();render(data?.session?.user,client);
      client.auth.onAuthStateChange((_event,session)=>render(session?.user,client));
    }catch(_e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
