'use strict';
(()=>{
  const VERSION=2;
  if((window.__ptMortgageToolsAuthGuardV||0)>=VERSION)return;
  window.__ptMortgageToolsAuthGuardV=VERSION;

  function promptSignIn(){
    try{if(typeof authMsg==='function')authMsg('Sign in to use PropertyThesis Mortgage Tools and calculators.');}catch(e){}
    try{if(typeof showAuth==='function')showAuth();}catch(e){}
  }

  function uiShowsSignedOut(){
    const authUser=document.getElementById('authUser');
    const authText=(authUser?.textContent||'').trim().toLowerCase();
    const signOut=document.getElementById('signOutBtn');
    const signOutHidden=!signOut||signOut.classList.contains('hidden')||signOut.hidden||getComputedStyle(signOut).display==='none';
    return authText==='not signed in'||signOutHidden;
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#appNavMortgage');
    if(!btn)return;
    if(!uiShowsSignedOut())return;
    e.preventDefault();
    e.stopImmediatePropagation();
    promptSignIn();
  },true);
})();
