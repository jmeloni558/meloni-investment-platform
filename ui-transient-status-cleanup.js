'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptTransientStatusCleanupV||0)>=VERSION)return;
  window.__ptTransientStatusCleanupV=VERSION;

  function removeGuidedPill(){
    document.querySelectorAll('.stage-pill').forEach(el=>{
      if((el.textContent||'').trim().toLowerCase()==='guided analysis')el.remove();
    });
  }

  function clearNewAnalysisStatus(){
    try{window.PropertyThesisIncomeEngineBridge?.clearTransientStatus?.();}catch(_e){}
    removeGuidedPill();
  }

  function schedule(){[0,60,180,400].forEach(ms=>setTimeout(removeGuidedPill,ms));}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#appNavNew,#s10NewAnalysis')){
      [0,50,140].forEach(ms=>setTimeout(clearNewAnalysisStatus,ms));
      return;
    }
    if(e.target?.closest?.('[data-s8-tab="assumptions"],[data-tab="assumptions"]'))schedule();
  },true);

  window.PropertyThesisTransientStatusCleanup={version:VERSION,removeGuidedPill,clearNewAnalysisStatus};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();