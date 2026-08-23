'use strict';
(()=>{
  const VERSION=1;
  if((window.__reportBrandingStabilityV||0)>=VERSION)return;
  window.__reportBrandingStabilityV=VERSION;

  let timer=0;
  let observer=null;

  function coverIsStable(){
    const cover=document.querySelector('#clientReport .rb-report .rb-cover');
    if(!cover)return true;
    const head=cover.querySelector(':scope > .pt-master-header');
    if(!head)return false;
    return [...cover.children].every(el=>el===head||el.style.display==='none');
  }

  function repair(){
    clearTimeout(timer);
    timer=setTimeout(()=>{
      if(coverIsStable())return;
      try{window.PropertyThesisReportBranding?.apply?.();}catch(e){console.warn('Report branding repair failed',e);}
    },50);
  }

  function attach(){
    const host=document.getElementById('clientReport');
    if(!host)return false;
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>repair());
    observer.observe(host,{subtree:true,childList:true});
    repair();
    return true;
  }

  function start(){
    let tries=0;
    const t=setInterval(()=>{
      if(attach()||++tries>80)clearInterval(t);
    },125);
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#rbSelectAll,#rbSelectCore,#rbRefresh,[data-s8-tab="report"],[data-tab="report"]')){
        [100,300,650,1100,1800].forEach(ms=>setTimeout(repair,ms));
      }
    },true);
  }

  window.ReportBrandingStability={repair,attach};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();