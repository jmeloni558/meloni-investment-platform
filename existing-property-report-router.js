'use strict';
(()=>{
  const VERSION=1;
  if((window.__existingPropertyReportRouterVersion||0)>=VERSION)return;
  window.__existingPropertyReportRouterVersion=VERSION;

  function renderCurrentReport(){
    try{window.ReportBuilderV1?.render?.();}catch(_e){}
    setTimeout(()=>{try{window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}},10);
    setTimeout(()=>{try{window.ReportAssumptionsNarrative?.apply?.();}catch(_e){}},20);
    setTimeout(()=>{try{window.ReportDetailOrder?.apply?.();}catch(_e){}},30);
    setTimeout(()=>{try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){}},40);
    setTimeout(()=>{try{window.ReportBuilderV9Controls?.apply?.();}catch(_e){}},50);
    setTimeout(()=>{try{window.PropertyThesisReportBranding?.apply?.();}catch(_e){}},60);
  }

  async function route(pid){
    if(!pid)return;
    try{
      await window.Stage6Dashboard?.openProperty?.(pid,'report');
    }catch(_e){}
    // Stage 6's legacy path refreshes the old Stage 5 report after ~80ms.
    // Rebuild with the current report stack after that legacy callback finishes.
    setTimeout(renderCurrentReport,180);
    setTimeout(renderCurrentReport,320);
    try{if(typeof setStatus==='function')setStatus('Saved analysis loaded — current client report ready');}catch(_e){}
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('[data-hub-report]');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    route(btn.dataset.hubReport);
  },true);

  window.ExistingPropertyReportRouter={route,renderCurrentReport};
})();
