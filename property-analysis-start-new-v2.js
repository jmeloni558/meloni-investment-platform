'use strict';
(()=>{
  const VERSION=5;
  if((window.__propertyAnalysisStartNewVersion||0)>=VERSION)return;
  window.__propertyAnalysisStartNewVersion=VERSION;

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-pt-new]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const pid=b.dataset.ptNew;
    const props=typeof cloudProperties!=='undefined'?(cloudProperties||[]):[];
    const savedAnalyses=typeof cloudAnalyses!=='undefined'?(cloudAnalyses||[]):[];
    const p=props.find(x=>x.id===pid);
    if(!p)return;

    const latest=savedAnalyses.filter(x=>x.property_id===pid).sort((a,z)=>new Date(z.updated_at)-new Date(a.updated_at))[0]||null;
    const savedAddress=String(latest?.assumptions?.address||'').trim();
    const location=[p.city,p.state,p.postal_code].filter(Boolean).join(', ');
    const propertyAddress=String(p.address||savedAddress||p.name||location||'').trim();
    const propertyName=String(p.name||latest?.assumptions?.name||propertyAddress||'').trim();

    selectedPropertyId=p.id;
    selectedClientId=p.client_id||null;
    selectedAnalysisId=null;
    selectedScenarioId=null;
    if(typeof cloudScenarios!=='undefined')cloudScenarios=[];

    state={...defaults,name:propertyName,address:propertyAddress,price:0,rent:0,loanYears:30};
    if(typeof buydownDefaults!=='undefined')buyState={...buydownDefaults};

    if(typeof renderFields==='function')renderFields();
    window.PropertyAnalysisManager?.close?.();
    if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('assumptions');
    else if(typeof switchTab==='function')switchTab('assumptions');

    const finalizeStepOne=()=>{
      state.address=propertyAddress;
      state.name=propertyName;
      state.loanYears=30;
      const a=document.getElementById('f_address');if(a)a.value=propertyAddress;
      const n=document.getElementById('f_name');if(n)n.value=propertyName;
      const y=document.getElementById('f_loanYears');if(y)y.value='30';
      try{window.GuidedAnalysisSetup?.reset?.();}catch(_e){}
      try{window.GuidedAnalysisSetup?.refresh?.();}catch(_e){}
      try{window.GuidedAssumptionGuidance?.apply?.();}catch(_e){}
      try{window.GuidedInitialRepairs?.apply?.();}catch(_e){}
    };
    finalizeStepOne();
    setTimeout(finalizeStepOne,80);
    setTimeout(finalizeStepOne,180);
    try{if(typeof setStatus==='function')setStatus('New analysis started for '+(propertyName||propertyAddress||'selected property'));}catch(_e){}
  },true);
})();
