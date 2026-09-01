'use strict';
(()=>{
  const VERSION=8;
  if((window.__protectedAnalysisOpenRouterVersion||0)>=VERSION)return;
  window.__protectedAnalysisOpenRouterVersion=VERSION;

  const SESSION_KEY='pt-active-analysis-view-v1';
  let busy=false,restoring=false;
  const analyses=()=>{try{return cloudAnalyses||[];}catch(_e){return [];}};
  const properties=()=>{try{return cloudProperties||[];}catch(_e){return [];}};
  const analysisById=id=>analyses().find(x=>x.id===id)||null;
  const propertyById=id=>properties().find(x=>x.id===id)||null;
  const latestForProperty=id=>analyses().filter(x=>x.property_id===id).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0]||null;
  const status=msg=>{try{if(typeof setStatus==='function')setStatus(msg);}catch(_e){}};
  function rememberView(id,target){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({id,target,at:Date.now()}));}catch(_e){}}
  function forgetView(){try{sessionStorage.removeItem(SESSION_KEY);}catch(_e){}}
  function rememberedView(){try{const v=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');if(!v?.id||Date.now()-Number(v.at||0)>86400000)return null;return{id:v.id,target:['assumptions','dashboard','report'].includes(v.target)?v.target:'dashboard'};}catch(_e){return null;}}

  function hydrateAssumptions(a){
    if(!a)return false;
    try{selectedPropertyId=a.property_id;selectedAnalysisId=a.id;selectedScenarioId=null;}catch(_e){}
    const p=propertyById(a.property_id);
    try{if(p)selectedClientId=p.client_id||null;}catch(_e){}
    const assumptions={...(a.assumptions||{})};
    const embeddedBuy=assumptions.buyState;delete assumptions.buyState;
    try{state={...defaults,...assumptions};}catch(_e){return false;}
    const repairs=Math.max(0,Number(state.initialRepairs)||0);state.initialRepairs=repairs;
    try{if(embeddedBuy&&typeof buydownDefaults!=='undefined')buyState={...buydownDefaults,...embeddedBuy};}catch(_e){}
    try{if(typeof renderFields==='function')renderFields();}catch(_e){}
    try{const source=document.getElementById('f_initialRepairs');if(source)source.value=repairs||'';}catch(_e){}
    return true;
  }

  function startProperty(pid){
    forgetView();
    const p=propertyById(pid);if(!p)return false;
    try{selectedPropertyId=p.id;selectedClientId=p.client_id||null;selectedAnalysisId=null;selectedScenarioId=null;}catch(_e){}
    try{state={...defaults,name:p.name||'',address:p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', '),price:0,land:0,units:1,rent:0,loanYears:30};}catch(_e){return false;}
    try{if(typeof buydownDefaults!=='undefined')buyState={...buydownDefaults};}catch(_e){}
    try{if(typeof renderFields==='function')renderFields();}catch(_e){}
    try{window.PropertyAnalysisManager?.close?.();}catch(_e){}
    if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('assumptions');
    else if(typeof switchTab==='function')switchTab('assumptions');
    try{window.GuidedAnalysisSetup?.reset?.();window.GuidedAnalysisSetup?.refresh?.();}catch(_e){}
    try{window.GuidedAssumptionGuidance?.apply?.();window.GuidedInitialRepairs?.apply?.();}catch(_e){}
    status('Property opened — enter the analysis assumptions');
    return true;
  }

  function refreshProtectedValuation(){try{window.ReviewValuation?.apply?.();}catch(_e){}}
  function refreshMarketRentResults(){
    try{window.PropertyThesisMarketRentUnderwriting?.renderResultsCard?.();}catch(_e){}
    try{window.PropertyThesisMarketRentResultsOrder?.pin?.();}catch(_e){}
    try{window.PropertyThesisMarketRentResultsOrder?.schedule?.();}catch(_e){}
  }

  async function protectedResults(){
    const base=window.PropertyThesisIncomeEngineBridge;
    const secondary=window.PropertyThesisSecondaryEngine;
    if(!base?.requestServer)throw new Error('Protected base engine is unavailable.');
    if(!secondary?.request)throw new Error('Protected secondary engine is unavailable.');
    const baseResult=await base.requestServer({...state},{refresh:false});
    if(!baseResult?.years?.length)throw new Error('Protected base engine did not return a complete result.');
    result=baseResult;refreshProtectedValuation();
    const secondaryResult=await secondary.request({refresh:false});
    if(!secondaryResult?.offer||!secondaryResult?.sensitivity||!Array.isArray(secondaryResult?.scenarios))throw new Error('Protected secondary engine did not return a complete result.');
    return {baseResult,secondaryResult};
  }

  function refreshDashboard(){
    try{if(typeof render==='function')render();}catch(_e){}
    try{window.InitialRepairsModel?.enhanceResults?.();}catch(_e){}
    try{window.GuidedAnalysisSetup?.refresh?.();window.GuidedAssumptionGuidance?.apply?.();window.GuidedInitialRepairs?.apply?.();}catch(_e){}
    try{window.Stage13AssumptionGuidance?.apply?.();window.Stage14TaxGuidance?.apply?.();window.Stage15Layout?.apply?.();}catch(_e){}
    refreshProtectedValuation();setTimeout(refreshProtectedValuation,0);setTimeout(refreshProtectedValuation,80);
  }

  async function hydrateCurrentResults(){
    try{
      const h=window.PropertyThesisResultsHydration;
      if(h?.hydrate)await h.hydrate({force:true});
      else {
        try{window.ReviewCashflowStatement?.apply?.();}catch(_e){}
        try{window.ReviewTotalInvestmentCashflow?.apply?.();}catch(_e){}
        try{window.InvestmentOfferAnalysis?.apply?.();}catch(_e){}
        try{window.PropertyThesisDecisionCenter?.apply?.();}catch(_e){}
        try{window.PropertyThesisInvestmentThesis?.apply?.();window.PropertyThesisInvestmentThesis?.pin?.();}catch(_e){}
        try{window.CashFlowChart?.draw?.();}catch(_e){}
      }
      refreshMarketRentResults();
      setTimeout(()=>{
        try{window.PropertyThesisInvestmentThesis?.apply?.();window.PropertyThesisInvestmentThesis?.pin?.();}catch(_e){}
        refreshMarketRentResults();
        try{window.CashFlowChart?.draw?.();}catch(_e){}
      },80);
      setTimeout(refreshMarketRentResults,220);
    }catch(e){console.warn('Saved analysis results hydration skipped',e);}
  }

  function refreshReport(){
    try{window.ReportBuilderV1?.renderReport?.();}catch(_e){}
    try{window.ReportBuilderV1?.render?.();}catch(_e){}
    setTimeout(()=>{
      try{window.ReportBuilderV2?.apply?.();window.ReportBuilderV3?.apply?.();window.ReportBuilderV4?.apply?.();}catch(_e){}
      try{window.ReportBuilderV8?.apply?.();window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}
      try{window.ReportAssumptionsNarrative?.apply?.();window.ReportDetailOrder?.apply?.();}catch(_e){}
      try{window.ReportSensitivityAnalysis?.apply?.();window.ReportInvestmentOfferAnalysis?.apply?.();}catch(_e){}
      try{window.ReportExecutiveConclusionCurrent?.apply?.();}catch(_e){}
      try{window.ReportMarketRentUnderwriting?.apply?.();}catch(_e){}
      try{window.UserBranding?.applyReportBranding?.();window.PropertyThesisReportBranding?.apply?.();}catch(_e){}
    },80);
  }

  async function openSaved(id,target){
    if(busy)return;
    const a=analysisById(id);if(!a)return;
    busy=true;rememberView(id,target);status(target==='report'?'Preparing protected report…':'Loading protected analysis…');
    try{
      if(!hydrateAssumptions(a))throw new Error('Saved assumptions could not be loaded.');
      try{window.MarketRentPriorResearchFix?.restore?.();}catch(_e){}
      try{if(typeof loadCloudScenarios==='function')await loadCloudScenarios(a.id);}catch(_e){}
      if(target!=='assumptions')await protectedResults();
      try{window.PropertyAnalysisManager?.close?.();}catch(_e){}
      if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go(target);
      else if(typeof switchTab==='function')switchTab(target);
      if(target==='report')refreshReport();
      else if(target==='dashboard'){refreshDashboard();await hydrateCurrentResults();refreshMarketRentResults();}
      else {try{window.GuidedAnalysisSetup?.refresh?.();window.GuidedAssumptionGuidance?.apply?.();window.GuidedInitialRepairs?.apply?.();const guided=document.querySelector('#guidedSetup [data-src="f_initialRepairs"]');if(guided)guided.value=Math.max(0,Number(state.initialRepairs)||0)||'';}catch(_e){}}
      try{window.AnalysisHistoryAutosave?.checkDraft?.();window.UnsavedChangeProtection?.markClean?.();}catch(_e){}
      status(target==='report'?'Protected report ready':target==='assumptions'?'Analysis ready to edit':'Saved analysis loaded');
    }catch(e){
      const msg=String(e?.message||e);status('Unable to open saved analysis: '+msg);
      alert('PropertyThesis could not open this saved analysis through the protected calculation engine. '+msg);
    }finally{busy=false;}
  }

  function routeProperty(pid,target){const a=latestForProperty(pid);if(!a){startProperty(pid);return;}openSaved(a.id,target);}

  function restoreRememberedView(){
    const saved=rememberedView();if(!saved||restoring)return;
    let tries=0;
    const timer=setInterval(async()=>{
      if(++tries>80){clearInterval(timer);return;}
      let signedIn=false,currentId=null,available=[];
      try{signedIn=!!cloudUser;currentId=selectedAnalysisId;available=cloudAnalyses||[];}catch(_e){}
      if(currentId){clearInterval(timer);return;}
      if(!signedIn||!available.length||busy)return;
      if(!available.some(a=>a.id===saved.id)){clearInterval(timer);forgetView();return;}
      clearInterval(timer);restoring=true;
      try{await openSaved(saved.id,saved.target);}finally{restoring=false;}
    },250);
  }

  window.addEventListener('click',e=>{
    if(e.target?.closest?.('#appNavNew,#s10NewAnalysis'))forgetView();
    const ptReport=e.target?.closest?.('[data-pt-report]');
    const ptOpen=e.target?.closest?.('[data-pt-open]');
    const hubReport=e.target?.closest?.('[data-hub-report]');
    const hubOpen=e.target?.closest?.('[data-hub-open]');
    const hubEdit=e.target?.closest?.('[data-hub-edit]');
    const btn=ptReport||ptOpen||hubReport||hubOpen||hubEdit;if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(ptReport)return openSaved(ptReport.dataset.ptReport,'report');
    if(ptOpen)return openSaved(ptOpen.dataset.ptOpen,'dashboard');
    if(hubReport)return routeProperty(hubReport.dataset.hubReport,'report');
    if(hubOpen)return routeProperty(hubOpen.dataset.hubOpen,'dashboard');
    if(hubEdit)return routeProperty(hubEdit.dataset.hubEdit,'assumptions');
  },true);

  window.ProtectedAnalysisOpenRouter={version:VERSION,openSaved,routeProperty,status:()=>({busy})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restoreRememberedView,{once:true});else restoreRememberedView();
})();
