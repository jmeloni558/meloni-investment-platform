'use strict';
(()=>{
  const VERSION=1;
  if((window.__salesCompsStep6RelocatorV||0)>=VERSION)return;
  window.__salesCompsStep6RelocatorV=VERSION;

  function ensureStyle(){
    if(document.getElementById('ptSalesStep6RelocatorStyle'))return;
    const s=document.createElement('style');
    s.id='ptSalesStep6RelocatorStyle';
    s.textContent=`
      [data-pt-sales-evidence]{display:none!important}
      #ptSalesCompsStepHost [data-pt-sales-evidence]{display:block!important;margin-top:0!important}
      #ptSalesCompsStepHost{min-height:12px}
    `;
    document.head.appendChild(s);
  }

  function place(){
    ensureStyle();
    const host=document.getElementById('ptSalesCompsStepHost');
    if(!host)return false;
    let card=document.querySelector('[data-pt-sales-evidence]');
    if(!card){
      try{window.PropertyThesisSalesComps?.render?.();}catch(_e){}
      card=document.querySelector('[data-pt-sales-evidence]');
    }
    if(card&&card.parentElement!==host)host.appendChild(card);
    return !!card;
  }

  function schedule(){
    [0,40,120,260].forEach(ms=>setTimeout(place,ms));
  }

  document.addEventListener('propertythesis:subject-recognized',schedule);
  document.addEventListener('propertythesis:analysis-loaded',schedule);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('.gw-step,[data-edit],#gwNext,#gwBack'))schedule();
  },true);
  const mo=new MutationObserver(()=>{if(document.getElementById('ptSalesCompsStepHost'))schedule();});
  function start(){ensureStyle();mo.observe(document.body,{childList:true,subtree:true});schedule();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

(()=>{
  const VERSION=2;
  if((window.__ptGuidedLastPassV||0)>=VERSION)return;
  window.__ptGuidedLastPassV=VERSION;

  let explicitCash=false;
  let applyingFinance=false;
  let saving=false;

  const activeStep=()=>{
    const el=document.querySelector('#gwSteps .gw-step.active[data-step]');
    return el?Number(el.dataset.step):-1;
  };
  const src=id=>document.getElementById(id);
  const num=id=>Number(src(id)?.value)||0;
  const isExisting=()=>{try{return typeof selectedAnalysisId!=='undefined'&&!!selectedAnalysisId;}catch(_e){return false;}};

  function write(id,value){
    const el=src(id);if(!el)return false;
    if(String(el.value)===String(value))return true;
    el.value=String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function shouldFinance(){
    if(explicitCash)return false;
    if(isExisting()&&num('f_mortgage')<=0)return false;
    return true;
  }

  function enforceFinancing(){
    if(activeStep()!==3||applyingFinance||!shouldFinance())return;
    applyingFinance=true;
    try{
      const price=num('f_price');
      if(num('f_mortgage')<=0&&price>0)write('f_mortgage',Math.round(price*.80));
      if(num('f_mortRate')<=0)write('f_mortRate',6.5);
      if(num('f_loanYears')<=0)write('f_loanYears',30);
      const io=src('f_interestOnly');
      if(io&&String(io.value)!=='false')write('f_interestOnly','false');
      const fields=document.querySelector('#gwBody [data-src="f_mortgage"]');
      const finance=document.querySelector('#gwBody [data-fin="finance"]');
      if(!fields&&finance)finance.click();
    }finally{applyingFinance=false;}
    setTimeout(()=>{
      if(activeStep()!==3||!shouldFinance())return;
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
    if(b){b.disabled=true;if(b.textContent!=='Saving…')b.textContent='Saving…';}
    try{
      try{if(typeof readFields==='function')readFields();}catch(_e){}
      let ok=false;
      try{if(typeof saveCurrentCloud==='function')ok=!!(await saveCurrentCloud(false));}catch(_e){}
      if(!ok){try{if(typeof saveLocal==='function'){saveLocal();ok=true;}}catch(_e){}}
      try{if(typeof setStatus==='function')setStatus(ok?'Analysis progress saved.':'Unable to save analysis progress.');}catch(_e){}
    }finally{
      saving=false;
      if(b)b.disabled=false;
      enforceActions();
    }
  }

  async function saveAndReview(){
    if(saving)return;
    saving=true;
    const b=document.getElementById('gwSave');
    if(b){b.disabled=true;if(b.textContent!=='Calculating & Saving…')b.textContent='Calculating & Saving…';b.setAttribute('aria-busy','true');}
    try{
      const controller=window.GuidedContinueController;
      if(!controller?.recalculate)throw new Error('Calculation workflow is not ready.');
      await controller.recalculate();
      const ok=typeof saveCurrentCloud==='function'?!!(await saveCurrentCloud(false)):false;
      if(!ok)throw new Error('The analysis could not be saved.');
      if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('dashboard');
      else if(controller?.run)await controller.run();
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
      if(b){b.disabled=false;b.removeAttribute('aria-busy');}
      enforceActions();
    }
  }

  function enforceActions(){
    const b=document.getElementById('gwSave');if(!b)return;
    const review=activeStep()===6;
    if(b.classList.contains('gw-hide'))b.classList.remove('gw-hide');
    if(b.style.display!=='inline-flex')b.style.display='inline-flex';
    const wanted=review?'Calculate, Save & Review Results':'Save Progress';
    if(!saving&&b.textContent!==wanted)b.textContent=wanted;
    if(b.dataset.ptCoreAction!==(review?'review':'save')){
      b.dataset.ptCoreAction=review?'review':'save';
      b.onclick=e=>{
        e.preventDefault();
        e.stopPropagation();
        if(activeStep()===6)saveAndReview();else saveProgress();
      };
    }
  }

  function enforce(){enforceFinancing();enforceActions();}
  const scheduleCore=()=>[0,25,70,150,300].forEach(ms=>setTimeout(enforce,ms));

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#gwBody [data-fin="cash"]')){explicitCash=true;return;}
    if(e.target?.closest?.('#gwBody [data-fin="finance"]'))explicitCash=false;
    if(e.target?.closest?.('#appNavNew,#s10NewAnalysis,[data-pt-new]'))explicitCash=false;
    if(e.target?.closest?.('#guidedSetup,[data-s8-tab="assumptions"]'))scheduleCore();
  },true);
  document.addEventListener('propertythesis:analysis-loaded',()=>{
    explicitCash=isExisting()&&num('f_mortgage')<=0;
    scheduleCore();
  });

  function observe(){
    const host=document.getElementById('guidedSetup');if(!host)return false;
    new MutationObserver(()=>queueMicrotask(enforce)).observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    scheduleCore();
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{if(observe()||++tries>80)clearInterval(timer);},100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleCore,{once:true});else scheduleCore();
})();
