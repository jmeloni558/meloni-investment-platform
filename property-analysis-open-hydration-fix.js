'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyAnalysisOpenHydrationFixVersion||0)>=VERSION)return;
  window.__propertyAnalysisOpenHydrationFixVersion=VERSION;

  function analysisById(id){
    try{return (cloudAnalyses||[]).find(x=>x.id===id)||null;}catch(_e){return null;}
  }
  function propertyById(id){
    try{return (cloudProperties||[]).find(x=>x.id===id)||null;}catch(_e){return null;}
  }
  function hydrate(a){
    if(!a)return false;
    selectedPropertyId=a.property_id;
    selectedAnalysisId=a.id;
    selectedScenarioId=null;
    const p=propertyById(a.property_id);
    if(p)selectedClientId=p.client_id||null;
    const assumptions={...(a.assumptions||{})};
    const embeddedBuy=assumptions.buyState;
    delete assumptions.buyState;
    state={...defaults,...assumptions};
    if(embeddedBuy&&typeof buydownDefaults!=='undefined')buyState={...buydownDefaults,...embeddedBuy};
    try{if(typeof renderFields==='function')renderFields();}catch(_e){}
    try{result=analyze(state);}catch(e){try{setStatus('Could not load saved analysis: '+e.message);}catch(_e){}return false;}
    return true;
  }
  function refreshVisibleAnalysis(){
    try{if(typeof renderFields==='function')renderFields();}catch(_e){}
    try{if(typeof render==='function')render();}catch(_e){}
    try{window.GuidedAnalysisSetup?.refresh?.();}catch(_e){}
    try{window.GuidedAssumptionGuidance?.apply?.();}catch(_e){}
    try{window.GuidedInitialRepairs?.apply?.();}catch(_e){}
    try{window.Stage13AssumptionGuidance?.apply?.();}catch(_e){}
    try{window.Stage14TaxGuidance?.apply?.();}catch(_e){}
    try{window.Stage15Layout?.apply?.();}catch(_e){}
  }

  document.addEventListener('click',async e=>{
    const b=e.target?.closest?.('[data-pt-open]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const a=analysisById(b.dataset.ptOpen);
    if(!a||!hydrate(a))return;
    try{window.PropertyAnalysisManager?.close?.();}catch(_e){}
    try{if(typeof loadCloudScenarios==='function')await loadCloudScenarios(a.id);}catch(_e){}
    if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('dashboard');
    else if(typeof switchTab==='function')switchTab('dashboard');
    refreshVisibleAnalysis();
    setTimeout(refreshVisibleAnalysis,80);
    try{window.AnalysisHistoryAutosave?.checkDraft?.();}catch(_e){}
    try{window.UnsavedChangeProtection?.markClean?.();}catch(_e){}
    try{if(typeof setStatus==='function')setStatus('Saved analysis loaded');}catch(_e){}
  },true);
})();
