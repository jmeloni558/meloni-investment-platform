'use strict';
(()=>{
  const VERSION=4;
  if((window.__propertyThesisGuidedWorkflowRefinementV||0)>=VERSION)return;
  window.__propertyThesisGuidedWorkflowRefinementV=VERSION;

  let explicitCash=false;
  let correcting=false;

  const step=()=>{
    const a=document.querySelector('#gwSteps .gw-step.active[data-step]');
    return a?Number(a.dataset.step):0;
  };
  const num=id=>Number(document.getElementById(id)?.value)||0;
  function setSource(id,value){
    const el=document.getElementById(id);if(!el)return;
    if(String(el.value)===String(value))return;
    el.value=String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function correctFinancing(){
    if(step()!==3||correcting||explicitCash)return;
    correcting=true;
    try{
      const price=num('f_price');
      const mortgage=num('f_mortgage');
      if(mortgage<=0){
        const finance=document.querySelector('#gwBody [data-fin="finance"]');
        if(finance){finance.click();}
        else if(price>0)setSource('f_mortgage',Math.round(price*.8));
      }
      if(num('f_mortgage')<=0&&price>0)setSource('f_mortgage',Math.round(price*.8));
      if(num('f_mortRate')<=0)setSource('f_mortRate',6.5);
      if(num('f_loanYears')<=0)setSource('f_loanYears',30);
      const io=document.getElementById('f_interestOnly');
      if(io&&String(io.value)!=='false')setSource('f_interestOnly','false');
    }finally{
      correcting=false;
    }
    setTimeout(()=>{
      if(step()!==3||explicitCash)return;
      const finance=document.querySelector('#gwBody [data-fin="finance"]');
      const cash=document.querySelector('#gwBody [data-fin="cash"]');
      finance?.classList.add('active');cash?.classList.remove('active');
    },0);
  }

  function correctActions(){
    const s=step();
    const save=document.getElementById('gwSave');
    if(save&&s===6&&save.textContent!=='Calculate, Save & Review Results')save.textContent='Calculate, Save & Review Results';
    if(save&&s!==6&&save.textContent!=='Save Progress'&&!save.disabled)save.textContent='Save Progress';
    try{window.PropertyThesisGuidedSaveExistingWorkflow?.refreshGuidedSaveAction?.();}catch(_e){}
  }

  function correct(){
    correctFinancing();
    correctActions();
  }
  function schedule(){[0,70,150,260].forEach(ms=>setTimeout(correct,ms));}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#gwBody [data-fin="cash"]')){explicitCash=true;return;}
    if(e.target?.closest?.('#gwBody [data-fin="finance"]'))explicitCash=false;
    if(e.target?.closest?.('#appNavNew,#s10NewAnalysis,[data-pt-new]'))explicitCash=false;
    if(e.target?.closest?.('#guidedSetup,[data-s8-tab="assumptions"]'))schedule();
  },true);
  document.addEventListener('change',e=>{if(e.target?.closest?.('#guidedSetup'))schedule();},true);
  document.addEventListener('propertythesis:analysis-loaded',()=>{
    explicitCash=num('f_mortgage')<=0;
    schedule();
  });

  try{
    if(typeof selectedAnalysisId!=='undefined'&&selectedAnalysisId&&num('f_mortgage')<=0)explicitCash=true;
  }catch(_e){}

  const prior=window.PropertyThesisGuidedWorkflowRefinement;
  window.PropertyThesisGuidedWorkflowRefinement={
    ...(prior||{}),
    version:VERSION,
    apply(){try{prior?.apply?.();}catch(_e){}correct();return true;},
    correct
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
