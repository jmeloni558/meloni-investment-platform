'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptGuidedCoreStabilityV||0)>=VERSION)return;
  window.__ptGuidedCoreStabilityV=VERSION;

  let explicitCash=false;
  let applyingFinance=false;
  let saving=false;

  const activeStep=()=>{
    const el=document.querySelector('#gwSteps .gw-step.active[data-step]');
    return el?Number(el.dataset.step):-1;
  };
  const source=id=>document.getElementById(id);
  const n=id=>Number(source(id)?.value)||0;

  function write(id,value){
    const el=source(id);if(!el)return false;
    if(String(el.value)===String(value))return true;
    el.value=String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function isExistingSavedAnalysis(){
    try{return typeof selectedAnalysisId!=='undefined'&&!!selectedAnalysisId;}catch(_e){return false;}
  }

  function financingShouldDefaultOpen(){
    if(explicitCash)return false;
    if(isExistingSavedAnalysis()&&n('f_mortgage')<=0)return false;
    return true;
  }

  function applyFinancing(){
    if(activeStep()!==3||applyingFinance||!financingShouldDefaultOpen())return;
    applyingFinance=true;
    try{
      const price=n('f_price');
      if(n('f_mortgage')<=0&&price>0)write('f_mortgage',Math.round(price*.80));
      if(n('f_mortRate')<=0)write('f_mortRate',6.5);
      if(n('f_loanYears')<=0)write('f_loanYears',30);
      const io=source('f_interestOnly');
      if(io&&String(io.value)!=='false')write('f_interestOnly','false');

      const finance=document.querySelector('#gwBody [data-fin="finance"]');
      const fields=document.querySelector('#gwBody [data-src="f_mortgage"]');
      if(!fields&&finance)finance.click();
    }finally{applyingFinance=false;}

    setTimeout(()=>{
      if(activeStep()!==3||!financingShouldDefaultOpen())return;
      const finance=document.querySelector('#gwBody [data-fin="finance"]');
      const cash=document.querySelector('#gwBody [data-fin="cash"]');
      finance?.classList.add('active');
      cash?.classList.remove('active');
      if(!document.querySelector('#gwBody [data-src="f_mortgage"]'))finance?.click();
    },0);
  }

  async function saveProgress(){
    if(saving)return;
    saving=true;
    const b=document.getElementById('gwSave');
    if(b){b.disabled=true;b.textContent='Saving…';}
    try{
      try{if(typeof readFields==='function')readFields();}catch(_e){}
      let ok=false;
      try{if(typeof saveCurrentCloud==='function')ok=!!(await saveCurrentCloud(false));}catch(_e){}
      if(!ok){try{if(typeof saveLocal==='function'){saveLocal();ok=true;}}catch(_e){}}
      try{if(typeof setStatus==='function')setStatus(ok?'Analysis progress saved.':'Unable to save analysis progress.');}catch(_e){}
    }finally{
      saving=false;
      enforceActions();
      if(b)b.disabled=false;
    }
  }

  async function saveAndReview(){
    if(saving)return;
    saving=true;
    const b=document.getElementById('gwSave');
    if(b){b.disabled=true;b.textContent='Calculating & Saving…';b.setAttribute('aria-busy','true');}
    try{
      const controller=window.GuidedContinueController;
      if(!controller?.recalculate)throw new Error('Calculation workflow is not ready.');
      await controller.recalculate();
      let ok=false;
      if(typeof saveCurrentCloud==='function')ok=!!(await saveCurrentCloud(false));
      if(!ok)throw new Error('The analysis could not be saved.');
      if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('dashboard');
      else controller?.run?.();
      try{await window.PropertyThesisResultsHydration?.hydrate?.({force:true,freshSecondary:true});}catch(_e){}
      try{window.Stage15Layout?.apply?.();}catch(_e){}
      try{if(typeof setStatus==='function')setStatus('Analysis calculated and saved — review the results');}catch(_e){}
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(err){
      const box=document.getElementById('gwValidation');
      if(box){box.innerHTML=`<b>Unable to calculate and save the analysis.</b><div>${String(err?.message||err)}</div>`;box.classList.add('show');}
      try{if(typeof setStatus==='function')setStatus('Unable to calculate and save: '+String(err?.message||err));}catch(_e){}
    }finally{
      saving=false;
      enforceActions();
      if(b){b.disabled=false;b.removeAttribute('aria-busy');}
    }
  }

  function enforceActions(){
    const b=document.getElementById('gwSave');if(!b)return;
    const review=activeStep()===6;
    b.classList.remove('gw-hide');
    b.style.display='inline-flex';
    b.textContent=review?'Calculate, Save & Review Results':'Save Progress';
    b.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      if(review)saveAndReview();else saveProgress();
    };
  }

  function enforce(){
    applyFinancing();
    enforceActions();
  }

  function schedule(){[0,25,80,160,320].forEach(ms=>setTimeout(enforce,ms));}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#gwBody [data-fin="cash"]')){explicitCash=true;return;}
    if(e.target?.closest?.('#gwBody [data-fin="finance"]'))explicitCash=false;
    if(e.target?.closest?.('#appNavNew,#s10NewAnalysis,[data-pt-new]'))explicitCash=false;
    if(e.target?.closest?.('#guidedSetup,[data-s8-tab="assumptions"]'))schedule();
  },true);

  document.addEventListener('propertythesis:analysis-loaded',()=>{
    explicitCash=isExistingSavedAnalysis()&&n('f_mortgage')<=0;
    schedule();
  });

  const startObserver=()=>{
    const host=document.getElementById('guidedSetup');
    if(!host)return false;
    const mo=new MutationObserver(()=>queueMicrotask(enforce));
    mo.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    schedule();
    return true;
  };

  let tries=0;
  const timer=setInterval(()=>{if(startObserver()||++tries>80)clearInterval(timer);},100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
