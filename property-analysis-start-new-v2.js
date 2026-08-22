'use strict';
(()=>{
  const VERSION=2;
  if((window.__propertyAnalysisStartNewVersion||0)>=VERSION)return;
  window.__propertyAnalysisStartNewVersion=VERSION;

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-pt-new]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const pid=b.dataset.ptNew;
    const p=(typeof cloudProperties!=='undefined'?(cloudProperties||[]):[]).find(x=>x.id===pid);
    if(!p)return;

    selectedPropertyId=p.id;
    selectedClientId=p.client_id||null;
    selectedAnalysisId=null;
    selectedScenarioId=null;
    if(typeof cloudScenarios!=='undefined')cloudScenarios=[];

    const propertyAddress=p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ');
    state={...defaults,name:p.name||'',address:propertyAddress||'',price:0,rent:0};
    if(typeof buydownDefaults!=='undefined')buyState={...buydownDefaults};

    if(typeof renderFields==='function')renderFields();
    try{if(typeof render==='function')render();}catch(_e){}
    window.PropertyAnalysisManager?.close?.();
    if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('assumptions');
    else if(typeof switchTab==='function')switchTab('assumptions');
    try{if(typeof setStatus==='function')setStatus('New analysis started for '+(p.name||propertyAddress||'selected property'));}catch(_e){}
  },true);
})();
