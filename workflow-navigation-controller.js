'use strict';
(() => {
  const VERSION=6;
  if((window.__workflowNavigationControllerVersion||0)>=VERSION)return;
  window.__workflowNavigationControllerVersion=VERSION;

  const PRIMARY=new Set(['assumptions','dashboard','report']);

  function finalizeReport(){
    try{window.ReportBuilderV2?.apply?.();}catch(e){}
    try{window.ReportBuilderV3?.apply?.();}catch(e){}
    try{window.ReportBuilderV4?.apply?.();}catch(e){}
    try{window.ReportBuilderV8?.apply?.();window.ReportBuilderV8Presentation?.apply?.();}catch(e){}
    try{window.ReportAssumptionsNarrative?.apply?.();window.ReportDetailOrder?.apply?.();}catch(e){}
    try{window.ReportSensitivityAnalysis?.apply?.();window.ReportInvestmentOfferAnalysis?.apply?.();}catch(e){}
    try{window.ReportMarketRentSupport?.apply?.();window.ReportMarketRentUnderwriting?.apply?.();}catch(e){}
    try{window.ReportExecutiveConclusionCurrent?.apply?.();}catch(e){}
    try{window.PropertyThesisMarketRentConclusion?.enhanceReport?.();}catch(e){}
    try{window.UserBranding?.applyReportBranding?.();}catch(e){}
    try{window.PropertyThesisReportBranding?.apply?.();}catch(e){}
  }

  function directActivate(id){
    const target=document.getElementById(id);
    if(!target)return false;
    document.querySelectorAll('.section').forEach(sec=>sec.classList.toggle('active',sec===target));
    document.querySelectorAll('.nav [data-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===id));
    document.querySelectorAll('#stage8Workflow [data-s8-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.s8Tab===id));
    try{window.Stage8Workflow?.refresh?.();}catch(e){}
    try{window.Stage10Workflow?.refresh?.();}catch(e){}
    if(id==='dashboard'){
      try{window.Stage15Layout?.apply?.();}catch(e){}
      try{if(typeof render==='function')render();}catch(e){}
      try{window.InitialRepairsModel?.enhanceResults?.();}catch(e){}
    }
    if(id==='report'){
      try{window.ReportBuilderV1?.renderReport?.();}catch(e){}
      setTimeout(finalizeReport,0);
      setTimeout(finalizeReport,100);
      setTimeout(finalizeReport,240);
    }
    window.scrollTo({top:0,behavior:'smooth'});
    return true;
  }

  function reviewResults(){
    try{if(typeof readFields==='function')readFields();}catch(e){try{if(typeof setStatus==='function')setStatus('Please review the analysis inputs: '+e.message);}catch(_e){}return;}
    try{if(typeof render==='function')render();}catch(e){}
    try{if(typeof setStatus==='function')setStatus('Analysis updated — review the results');}catch(e){}
    directActivate('dashboard');
  }

  function clearPropertySpecificDraftUI(){
    try{document.querySelectorAll('.pt-unsaved-new').forEach(x=>x.remove());}catch(e){}
    try{const b=document.getElementById('cloudSaveCurrent');if(b)b.textContent='Save Current Analysis to Cloud';}catch(e){}
    try{window.UnsavedChangeProtection?.markClean?.();}catch(e){}
    try{window.SaveStateFeedback?.clear?.();}catch(e){}
  }

  function newAnalysis(){
    try{selectedClientId=null;selectedPropertyId=null;selectedAnalysisId=null;selectedScenarioId=null;}catch(e){}
    try{if(typeof cloudScenarios!=='undefined')cloudScenarios=[];}catch(e){}
    clearPropertySpecificDraftUI();
    try{
      state={...defaults,name:'',address:'',price:0,land:0,units:1,rent:0,hold:7,mortgage:0,mortRate:.065,interestOnly:false,loanYears:30,initialRepairs:0};
      if(typeof renderFields==='function')renderFields();
    }catch(e){}
    try{localStorage.removeItem('guided-expenses-v1');}catch(e){}

    const blankIds=['f_name','f_address','f_price','f_land','f_units','f_rent','f_hold','f_initialRepairs','propertyName','quickPrice','quickRent'];
    const clearBlanks=()=>blankIds.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    clearBlanks();
    try{if(typeof render==='function')render();}catch(e){}
    clearBlanks();

    directActivate('assumptions');
    try{window.GuidedAnalysisSetup?.reset?.();}catch(e){}
    try{window.NewAnalysisSaveGuidance?.refresh?.();}catch(e){}
    setTimeout(()=>{
      clearBlanks();
      clearPropertySpecificDraftUI();
      try{window.GuidedAnalysisSetup?.reset?.();}catch(e){}
      try{window.GuidedAssumptionGuidance?.apply?.();}catch(e){}
      try{window.GuidedInitialRepairs?.apply?.();}catch(e){}
      try{window.NewAnalysisSaveGuidance?.refresh?.();}catch(e){}
      try{if(typeof setStatus==='function')setStatus('New analysis started — enter the property and investment assumptions');}catch(e){}
      document.querySelector('#gwBody [data-src="f_address"]')?.focus();
    },80);
    setTimeout(()=>{clearPropertySpecificDraftUI();try{window.NewAnalysisSaveGuidance?.refresh?.();}catch(e){}},180);
  }

  function capture(e){
    const newBtn=e.target?.closest?.('#s10NewAnalysis');
    if(newBtn){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      newAnalysis();return;
    }
    const reviewBtn=e.target?.closest?.('#s10ReviewResults');
    if(reviewBtn){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      reviewResults();return;
    }
    const step=e.target?.closest?.('#stage8Workflow [data-s8-tab]');
    if(step&&PRIMARY.has(step.dataset.s8Tab)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      if(step.dataset.s8Tab==='dashboard')reviewResults();
      else directActivate(step.dataset.s8Tab);
    }
  }

  function start(){document.addEventListener('click',capture,true);}
  window.WorkflowNavigationController={go:directActivate,reviewResults,newAnalysis};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();