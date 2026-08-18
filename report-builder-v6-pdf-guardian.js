'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV6PdfGuardianVersion||0)>=VERSION)return;
  window.__reportBuilderV6PdfGuardianVersion=VERSION;

  let observer=null;
  let attaching=false;

  function ensurePdfControl(){
    if(attaching)return false;
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    if(document.getElementById('rbDownloadPdf'))return true;
    attaching=true;
    try{window.ReportBuilderV4?.apply?.();}catch(e){}
    attaching=false;
    return !!document.getElementById('rbDownloadPdf');
  }

  function watchControls(){
    const report=document.getElementById('report');
    if(!report)return false;
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>{
      if(!document.getElementById('rbDownloadPdf'))setTimeout(ensurePdfControl,0);
    });
    observer.observe(report,{childList:true,subtree:true});
    ensurePdfControl();
    return true;
  }

  function scheduleEnsure(){
    [0,40,120,260,500].forEach(ms=>setTimeout(()=>{
      ensurePdfControl();
      if(ms===500)watchControls();
    },ms));
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('button,[role="button"]');
    if(!btn)return;
    const text=(btn.textContent||'').trim().toLowerCase();
    const id=btn.id||'';
    if(btn.matches?.('[data-s8-tab="dashboard"],[data-tab="dashboard"],[data-s8-tab="report"],[data-tab="report"]') || /review results/.test(text) || ['loadNamedBtn','loadBtn','loadCloudAnalysis','loadCloudAnalysisBtn'].includes(id)){
      scheduleEnsure();
    }
  },true);

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reportV6PdfWrapped){
    const wrapped=function(...args){
      const out=originalRender.apply(this,args);
      scheduleEnsure();
      return out;
    };
    wrapped.__reportV6PdfWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{
      if(watchControls()){clearInterval(timer);return;}
      if(++tries>60)clearInterval(timer);
    },125);
  }

  window.ReportBuilderV6PdfGuardian={ensurePdfControl,watchControls,scheduleEnsure};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
