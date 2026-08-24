'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptMortgageToolsAuthGuardV||0)>=VERSION)return;
  window.__ptMortgageToolsAuthGuardV=VERSION;

  function promptSignIn(){
    try{if(typeof authMsg==='function')authMsg('Sign in to use PropertyThesis Mortgage Tools and calculators.');}catch(e){}
    try{if(typeof showAuth==='function')showAuth();}catch(e){}
  }

  async function hasLiveSession(){
    try{
      if(typeof cloudClient==='undefined'||!cloudClient?.auth?.getSession)return false;
      const {data}=await cloudClient.auth.getSession();
      return !!data?.session?.user;
    }catch(e){return false;}
  }

  document.addEventListener('click',async e=>{
    const btn=e.target?.closest?.('#appNavMortgage');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!(await hasLiveSession())){promptSignIn();return;}
    try{window.AppNavigationToolbar?.openMortgageTools?.();}catch(e){}
  },true);
})();
