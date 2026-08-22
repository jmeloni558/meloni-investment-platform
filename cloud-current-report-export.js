'use strict';
(()=>{
  const VERSION=1;
  if((window.__cloudCurrentReportExportVersion||0)>=VERSION)return;
  window.__cloudCurrentReportExportVersion=VERSION;

  function rebuildCurrentReport(){
    try{if(typeof readFields==='function')readFields();}catch(_e){}
    try{if(typeof analyze==='function'&&typeof state!=='undefined')result=analyze(state);}catch(_e){}
    try{window.ReportBuilderV1?.render?.();}catch(_e){}
    try{window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}
    try{window.ReportAssumptionsNarrative?.apply?.();}catch(_e){}
    try{window.ReportDetailOrder?.apply?.();}catch(_e){}
    try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){}
    try{window.PropertyThesisReportBranding?.apply?.();}catch(_e){}
  }

  function exportCurrentReport(){
    // Build the current report before changing tabs so the legacy report view
    // never becomes the source used by the PDF exporter.
    rebuildCurrentReport();
    try{
      if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('report');
      else if(typeof switchTab==='function')switchTab('report');
    }catch(_e){}

    setTimeout(()=>{
      rebuildCurrentReport();
      setTimeout(()=>{
        if(window.ReportBuilderV4?.generatePdf){
          window.ReportBuilderV4.generatePdf();
          try{if(typeof setStatus==='function')setStatus('Current client report PDF generated');}catch(_e){}
        }else{
          try{if(typeof setStatus==='function')setStatus('Client report is ready — use Download PDF.');}catch(_e){}
        }
      },80);
    },80);
  }

  function wire(){
    const btn=document.getElementById('cloudPdf');
    if(!btn)return false;
    btn.textContent='Generate Client Report PDF';
    btn.onclick=exportCurrentReport;
    return true;
  }

  function start(){
    if(wire())return;
    let tries=0;
    const timer=setInterval(()=>{if(wire()||++tries>40)clearInterval(timer)},125);
  }

  window.CloudCurrentReportExport={wire,exportCurrentReport,rebuildCurrentReport};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
