'use strict';
(()=>{
  const VERSION=1;
  if((window.__pricingAccountToolbarV||0)>=VERSION)return;
  window.__pricingAccountToolbarV=VERSION;
  const SUPABASE_URL='https://lmaiqpkogmmsldkziggy.supabase.co';
  const SUPABASE_KEY='sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7';
  function render(user){
    const nav=document.querySelector('.pricing-nav');if(!nav||!user)return;
    nav.dataset.accountToolbar='true';
    nav.innerHTML='<a href="index.html?app-action=new">New Analysis</a><a href="index.html?app-action=existing">Existing Properties</a><a href="index.html?app-action=search-properties">Search Properties</a><a href="index.html?app-action=search-clients">Search Clients</a><a href="index.html?app-action=mortgage">Mortgage Tools</a>';
  }
  async function start(){
    try{
      if(!window.supabase?.createClient)return;
      const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      const {data}=await client.auth.getSession();render(data?.session?.user);
      client.auth.onAuthStateChange((_event,session)=>render(session?.user));
    }catch(_e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
