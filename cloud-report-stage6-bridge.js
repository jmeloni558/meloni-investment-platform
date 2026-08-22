'use strict';
(()=>{
  const VERSION=1;
  if((window.__cloudReportStage6BridgeVersion||0)>=VERSION)return;
  window.__cloudReportStage6BridgeVersion=VERSION;

  async function generateFromCloud(){
    try{
      if(!selectedPropertyId){
        if(typeof setStatus==='function')setStatus('Select a saved property or analysis first.');
        return;
      }
      if(!window.Stage6Dashboard?.openProperty){
        if(typeof setStatus==='function')setStatus('Existing Properties report engine is still loading. Try again in a moment.');
        return;
      }

      // Use the exact same proven report path as Existing Properties -> Generate Report.
      await window.Stage6Dashboard.openProperty(selectedPropertyId,'report');

      setTimeout(()=>{
        try{window.ReportBuilderV1?.render?.();}catch(_e){}
        try{window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}
        try{window.ReportAssumptionsNarrative?.apply?.();}catch(_e){}
        try{window.ReportDetailOrder?.apply?.();}catch(_e){}
        try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){}
        try{window.PropertyThesisReportBranding?.apply?.();}catch(_e){}

        setTimeout(()=>{
          if(window.ReportBuilderV4?.generatePdf){
            window.ReportBuilderV4.generatePdf();
          }else{
            document.getElementById('rbDownloadPdf')?.click();
          }
        },160);
      },140);
    }catch(err){
      console.error(err);
      if(typeof setStatus==='function')setStatus('Could not generate client report PDF: '+(err?.message||err));
    }
  }

  function apply(){
    const btn=document.getElementById('cloudPdf');
    if(!btn)return false;
    btn.textContent='Generate Client Report PDF';
    btn.onclick=generateFromCloud;
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{if(apply()||++tries>40)clearInterval(timer)},125);
  if(document.readyState!=='loading')apply();
  else document.addEventListener('DOMContentLoaded',apply,{once:true});

  window.CloudReportStage6Bridge={apply,generate:generateFromCloud};
})();
