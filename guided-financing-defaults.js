'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptGuidedFinancingDefaultsV||0)>=VERSION)return;
  window.__ptGuidedFinancingDefaultsV=VERSION;

  function isNewOrBlankAnalysis(){
    try{
      if(typeof selectedAnalysisId!=='undefined'&&selectedAnalysisId)return false;
    }catch(_e){}
    return true;
  }

  function setSource(id,value){
    const el=document.getElementById(id);
    if(!el)return false;
    el.value=String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function applyDefaults(){
    if(!isNewOrBlankAnalysis())return false;
    const active=document.querySelector('#gwSteps .gw-step.active[data-step="3"]');
    if(!active)return false;

    const mortgage=document.getElementById('f_mortgage');
    const rate=document.getElementById('f_mortRate');
    const structure=document.getElementById('f_interestOnly');

    if(rate&&(!Number.isFinite(Number(rate.value))||Number(rate.value)===0))setSource('f_mortRate',6.5);
    if(structure&&String(structure.value)!=='false')setSource('f_interestOnly','false');

    const financeBtn=document.querySelector('#gwBody [data-fin="finance"]');
    const financeFields=document.querySelector('#gwBody [data-src="f_mortgage"]');
    if(financeBtn&&!financeFields&&(!mortgage||Number(mortgage.value)<=0)){
      financeBtn.click();
      setTimeout(()=>{
        const r=document.getElementById('f_mortRate');
        const s=document.getElementById('f_interestOnly');
        if(r&&(!Number.isFinite(Number(r.value))||Number(r.value)===0))setSource('f_mortRate',6.5);
        if(s&&String(s.value)!=='false')setSource('f_interestOnly','false');
      },0);
    }
    return true;
  }

  function schedule(){[0,40,120,260].forEach(ms=>setTimeout(applyDefaults,ms));}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#gwSteps [data-step="3"],#gwNext,[data-s8-tab="assumptions"],#appNavNew,#s10NewAnalysis'))schedule();
  },true);

  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#f_mortRate,#f_interestOnly'))return;
    if(document.querySelector('#gwSteps .gw-step.active[data-step="3"]'))setTimeout(applyDefaults,0);
  },true);

  window.PropertyThesisGuidedFinancingDefaults={version:VERSION,apply:applyDefaults,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
