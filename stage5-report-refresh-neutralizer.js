'use strict';
(()=>{
  const VERSION=1;
  if((window.__stage5ReportRefreshNeutralizerVersion||0)>=VERSION)return;
  window.__stage5ReportRefreshNeutralizerVersion=VERSION;

  function renderCurrentReport(){
    try{if(typeof readFields==='function')readFields();}catch(_e){}
    try{if(typeof analyze==='function')result=analyze(state);}catch(_e){}
    try{window.ReportBuilderV1?.render?.();}catch(_e){}
    try{window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}
    try{window.ReportAssumptionsNarrative?.apply?.();}catch(_e){}
    try{window.ReportDetailOrder?.apply?.();}catch(_e){}
    try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){}
    try{window.PropertyThesisReportBranding?.apply?.();}catch(_e){}
    try{if(typeof setStatus==='function')setStatus('Current client report refreshed');}catch(_e){}
    return true;
  }

  function relabel(){
    const btn=document.getElementById('s5_refresh');
    if(btn){
      btn.textContent='Refresh Client Report';
      btn.title='Refresh the current PropertyThesis client report';
    }
    const pdf=document.getElementById('s5_pdf');
    if(pdf){
      pdf.textContent='Download Current PDF';
      pdf.title='Download the current branded PropertyThesis report';
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#s5_refresh');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    renderCurrentReport();
  },true);

  function start(){
    relabel();
    let tries=0;
    const timer=setInterval(()=>{
      relabel();
      if(document.getElementById('s5_refresh')||++tries>40)clearInterval(timer);
    },125);
  }

  window.Stage5ReportRefreshNeutralizer={render:renderCurrentReport,relabel};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
