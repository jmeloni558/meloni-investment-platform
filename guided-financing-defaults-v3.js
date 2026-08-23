'use strict';
(()=>{
  const VERSION=3;
  if((window.__ptGuidedFinancingDefaultsV||0)>=VERSION)return;
  window.__ptGuidedFinancingDefaultsV=VERSION;

  let opening=false;
  let freshAnalysis=false;
  let explicitCash=false;

  function stepFourActive(){
    return !!document.querySelector('#gwSteps .gw-step.active[data-step="3"]');
  }

  function selectedExistingAnalysis(){
    try{return typeof selectedAnalysisId!=='undefined'&&!!selectedAnalysisId;}catch(_e){return false;}
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
    const price=Number(document.getElementById('f_price')?.value)||0;
    const mortgage=Number(document.getElementById('f_mortgage')?.value)||0;
    const rate=Number(document.getElementById('f_mortRate')?.value)||0;
    const years=Number(document.getElementById('f_loanYears')?.value)||0;
    if(price>0&&mortgage<=0)setSource('f_mortgage',Math.round(price*.8));
    if(rate<=0)setSource('f_mortRate',6.5);
    if(years<=0)setSource('f_loanYears',30);
    const structure=document.getElementById('f_interestOnly');
    if(structure&&String(structure.value)!=='false')setSource('f_interestOnly','false');
  }

  function financingFieldsVisible(){return !!document.querySelector('#gwBody [data-src="f_mortgage"]');}

  function eligibleForAutoOpen(){
    if(explicitCash)return false;
    if(freshAnalysis)return true;
    return !selectedExistingAnalysis();
  }

  function openFinancingFields(attempt=0){
    if(!stepFourActive()||!eligibleForAutoOpen())return false;
    const financeBtn=document.querySelector('#gwBody [data-fin="finance"]');
    if(!financeBtn){if(attempt<10)setTimeout(()=>openFinancingFields(attempt+1),70);return false;}
    if(!financingFieldsVisible()){
      if(!opening||attempt>0){opening=true;financeBtn.click();}
    }
    setTimeout(()=>{
      if(stepFourActive()&&eligibleForAutoOpen()){
        applyFieldDefaults();
        document.querySelector('#gwBody [data-fin="finance"]')?.classList.add('active');
        document.querySelector('#gwBody [data-fin="cash"]')?.classList.remove('active');
        try{window.PropertyThesisGuidedWorkflowRefinement?.apply?.();}catch(_e){}
      }
      opening=false;
      if(!financingFieldsVisible()&&attempt<10)setTimeout(()=>openFinancingFields(attempt+1),70);
    },80);
    return true;
  }

  function markFresh(){freshAnalysis=true;explicitCash=false;}
  function schedule(){[0,50,130,260,500].forEach(ms=>setTimeout(()=>openFinancingFields(0),ms));}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#appNavNew,#s10NewAnalysis,[data-pt-new]')){markFresh();return;}
    if(e.target?.closest?.('#gwBody [data-fin="cash"]')){explicitCash=true;freshAnalysis=false;return;}
    if(e.target?.closest?.('#gwBody [data-fin="finance"]')){explicitCash=false;}
    if(e.target?.closest?.('#gwSteps [data-step="3"],#gwNext,[data-s8-tab="assumptions"]'))schedule();
  },true);

  document.addEventListener('propertythesis:analysis-loaded',()=>{freshAnalysis=false;explicitCash=false;});
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#f_mortRate,#f_interestOnly,#f_mortgage,#f_loanYears'))return;
    if(stepFourActive())setTimeout(()=>openFinancingFields(0),0);
  },true);

  window.PropertyThesisGuidedFinancingDefaults={version:VERSION,apply:openFinancingFields,schedule,markFresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
