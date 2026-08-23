'use strict';
(()=>{
  const VERSION=2;
  if((window.__ptGuidedFinancingDefaultsV||0)>=VERSION)return;
  window.__ptGuidedFinancingDefaultsV=VERSION;

  let opening=false;

  function isNewOrBlankAnalysis(){
    try{
      if(typeof selectedAnalysisId!=='undefined'&&selectedAnalysisId)return false;
    }catch(_e){}
    return true;
  }

  function stepFourActive(){
    return !!document.querySelector('#gwSteps .gw-step.active[data-step="3"]');
  }

  function setSource(id,value){
    const el=document.getElementById(id);
    if(!el)return false;
    el.value=String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function applyFieldDefaults(){
    const rate=document.getElementById('f_mortRate');
    const structure=document.getElementById('f_interestOnly');
    if(rate&&(!Number.isFinite(Number(rate.value))||Number(rate.value)===0))setSource('f_mortRate',6.5);
    if(structure&&String(structure.value)!=='false')setSource('f_interestOnly','false');
  }

  function financingFieldsVisible(){
    return !!document.querySelector('#gwBody [data-src="f_mortgage"]');
  }

  function openFinancingFields(attempt=0){
    if(!isNewOrBlankAnalysis()||!stepFourActive())return false;
    applyFieldDefaults();
    if(financingFieldsVisible()){
      const financeBtn=document.querySelector('#gwBody [data-fin="finance"]');
      const cashBtn=document.querySelector('#gwBody [data-fin="cash"]');
      financeBtn?.classList.add('active');
      cashBtn?.classList.remove('active');
      opening=false;
      return true;
    }

    const financeBtn=document.querySelector('#gwBody [data-fin="finance"]');
    if(!financeBtn){
      if(attempt<8)setTimeout(()=>openFinancingFields(attempt+1),80);
      return false;
    }

    if(!opening||attempt>0){
      opening=true;
      financeBtn.click();
    }

    setTimeout(()=>{
      applyFieldDefaults();
      if(financingFieldsVisible()){
        const f=document.querySelector('#gwBody [data-fin="finance"]');
        const c=document.querySelector('#gwBody [data-fin="cash"]');
        f?.classList.add('active');c?.classList.remove('active');opening=false;
        try{window.PropertyThesisGuidedWorkflowRefinement?.apply?.();}catch(_e){}
      }else if(attempt<8){
        openFinancingFields(attempt+1);
      }else opening=false;
    },90);
    return true;
  }

  function schedule(){[0,60,160,320,600].forEach(ms=>setTimeout(()=>openFinancingFields(0),ms));}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#gwSteps [data-step="3"],#gwNext,[data-s8-tab="assumptions"],#appNavNew,#s10NewAnalysis'))schedule();
  },true);

  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#f_mortRate,#f_interestOnly,#f_mortgage'))return;
    if(stepFourActive())setTimeout(()=>openFinancingFields(0),0);
  },true);

  window.PropertyThesisGuidedFinancingDefaults={version:VERSION,apply:openFinancingFields,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
