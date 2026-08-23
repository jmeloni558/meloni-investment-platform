'use strict';
(()=>{
  const VERSION=1;
  if((window.__savedAnalysisFinancingScenariosVersion||0)>=VERSION)return;
  window.__savedAnalysisFinancingScenariosVersion=VERSION;

  function decorate(){
    const host=document.getElementById('ptAnalysisContent');
    if(!host)return false;
    let count=0;
    host.querySelectorAll('.pt-row').forEach(row=>{
      const open=row.querySelector('[data-pt-open]');
      const actions=row.querySelector('.pt-actions');
      const id=open?.dataset?.ptOpen;
      if(!id||!actions||actions.querySelector('[data-pt-scenarios]'))return;
      const b=document.createElement('button');
      b.type='button';
      b.className='btn secondary';
      b.dataset.ptScenarios=id;
      b.textContent='Financing Scenarios';
      const report=actions.querySelector('[data-pt-report]');
      if(report)report.insertAdjacentElement('afterend',b);else actions.appendChild(b);
      count++;
    });
    return count>0||!!host.querySelector('[data-pt-scenarios]');
  }

  async function openScenarios(id){
    const router=window.ProtectedAnalysisOpenRouter;
    if(!router?.openSaved)return;
    try{
      await router.openSaved(id,'dashboard');
      if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('scenarios');
      else if(typeof switchTab==='function')switchTab('scenarios');
      try{if(typeof renderScenarios==='function')renderScenarios();}catch(_e){}
      try{window.WorkspaceConsolidation?.renderScenarioCloud?.();}catch(_e){}
      setTimeout(()=>{
        try{if(typeof renderScenarios==='function')renderScenarios();}catch(_e){}
        try{window.WorkspaceConsolidation?.renderScenarioCloud?.();}catch(_e){}
      },100);
    }catch(e){
      try{if(typeof setStatus==='function')setStatus('Unable to open financing scenarios: '+String(e?.message||e));}catch(_e){}
    }
  }

  document.addEventListener('click',e=>{
    const scenario=e.target?.closest?.('[data-pt-scenarios]');
    if(scenario){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      openScenarios(scenario.dataset.ptScenarios);
      return;
    }
    if(e.target?.closest?.('[data-pt-manage],[data-pts-manage]')){
      [0,60,140].forEach(ms=>setTimeout(decorate,ms));
    }
  },true);

  window.SavedAnalysisFinancingScenarios={version:VERSION,decorate,open:openScenarios};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,250),{once:true});
  else setTimeout(decorate,250);
})();
