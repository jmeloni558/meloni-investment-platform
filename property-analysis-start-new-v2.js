'use strict';
(()=>{
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-pt-new]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    selectedAnalysisId=null;
    selectedScenarioId=null;
    state={...defaults,name:state.name||'',address:state.address||'',price:0,rent:0};
    if(typeof renderFields==='function')renderFields();
    window.PropertyAnalysisManager?.close?.();
    if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('assumptions');
  },true);
})();
