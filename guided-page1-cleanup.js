'use strict';
(()=>{
  const VERSION=2;
  if((window.__guidedPage1CleanupV||0)>=VERSION)return;
  window.__guidedPage1CleanupV=VERSION;

  let observer=null;

  function removeDuplicateLandHelp(){
    const body=document.getElementById('gwBody');
    if(!body)return false;
    body.querySelectorAll('details.gw-help').forEach(d=>{
      const text=(d.textContent||'').toLowerCase();
      if(text.includes('not sure how to estimate land value'))d.remove();
    });
    return true;
  }

  function watch(){
    const body=document.getElementById('gwBody');
    if(!body)return false;
    removeDuplicateLandHelp();
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>removeDuplicateLandHelp());
    observer.observe(body,{childList:true,subtree:true});
    return true;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(watch())clearInterval(timer);if(++tries>60)clearInterval(timer)},120);
    document.addEventListener('click',()=>setTimeout(()=>{watch();removeDuplicateLandHelp();},0));
  }

  window.GuidedPage1Cleanup={apply:removeDuplicateLandHelp,watch};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
