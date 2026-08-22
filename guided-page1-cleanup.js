'use strict';
(()=>{
  const VERSION=1;
  if((window.__guidedPage1CleanupV||0)>=VERSION)return;
  window.__guidedPage1CleanupV=VERSION;

  function removeDuplicateLandHelp(){
    const body=document.getElementById('gwBody');
    if(!body)return false;
    body.querySelectorAll('details.gw-help').forEach(d=>{
      const text=(d.textContent||'').toLowerCase();
      if(text.includes('not sure how to estimate land value'))d.remove();
    });
    return true;
  }

  function schedule(){[0,40,120].forEach(ms=>setTimeout(removeDuplicateLandHelp,ms));}
  function start(){
    schedule();
    document.addEventListener('click',e=>{
      if(e.target.closest('#guidedSetup,#s10NewAnalysis,[data-s8-tab="assumptions"]'))schedule();
    },true);
  }
  window.GuidedPage1Cleanup={apply:removeDuplicateLandHelp};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
