'use strict';
(()=>{
  const VERSION=2;
  if((window.__stage5ReportRefreshNeutralizerVersion||0)>=VERSION)return;
  window.__stage5ReportRefreshNeutralizerVersion=VERSION;

  function savedAnalysis(){
    try{return selectedAnalysisId&&(cloudAnalyses||[]).find(a=>a.id===selectedAnalysisId)||null;}catch(_e){return null;}
  }
  function restoreSavedState(){
    const dirty=!!window.UnsavedChangeProtection?.isDirty?.();
    if(dirty){try{if(typeof readFields==='function')readFields();}catch(_e){}return;}
    const saved=savedAnalysis();if(!saved?.assumptions)return;
    const assumptions={...saved.assumptions},embeddedBuy=assumptions.buyState;delete assumptions.buyState;
    try{state={...defaults,...assumptions};}catch(_e){return;}
    try{if(embeddedBuy&&typeof buydownDefaults!=='undefined')buyState={...buydownDefaults,...embeddedBuy};}catch(_e){}
    try{if(typeof renderFields==='function')renderFields();}catch(_e){}
    try{window.GuidedAnalysisSetup?.refresh?.();window.Stage15Layout?.apply?.();}catch(_e){}
  }
  async function renderCurrentReport(){
    restoreSavedState();
    try{
      const bridge=window.PropertyThesisIncomeEngineBridge;
      if(bridge?.requestServer){const server=await bridge.requestServer({...state},{refresh:false});if(server?.years?.length)result=server;}
      else if(typeof analyze==='function')result=analyze(state);
    }catch(_e){}
    try{window.ReportBuilderV1?.render?.();}catch(_e){}
    try{window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}
    try{window.ReportAssumptionsNarrative?.apply?.();}catch(_e){}
    try{window.ReportDetailOrder?.apply?.();}catch(_e){}
    try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){}
    try{window.ReportInvestmentOfferAnalysis?.apply?.();window.ReportExecutiveConclusionCurrent?.apply?.();}catch(_e){}
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
    const btn=e.target?.closest?.('#s5_refresh,#rbRefresh');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    renderCurrentReport();
  },true);

  document.addEventListener('click',e=>{
    if(!e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],[data-hub-report],[data-pt-report],#appNavReport'))return;
    setTimeout(renderCurrentReport,120);
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
