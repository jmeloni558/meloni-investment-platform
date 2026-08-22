'use strict';
(()=>{
  const VERSION=4;
  if((window.__guidedContinueControllerV||0)>=VERSION)return;
  window.__guidedContinueControllerV=VERSION;

  const n=v=>Number(v)||0;

  function syncVisible(){
    const root=document.getElementById('gwBody');
    if(!root)return;
    root.querySelectorAll('[data-src]').forEach(input=>{
      const src=document.getElementById(input.dataset.src);
      if(!src)return;
      src.value=input.value;
      src.dispatchEvent(new Event('input',{bubbles:true}));
      src.dispatchEvent(new Event('change',{bubbles:true}));
    });
  }

  function currentStep(){
    const active=document.querySelector('#gwSteps .gw-step.active[data-step]');
    return active?Number(active.dataset.step):0;
  }

  function valid(i){
    const missing=[];
    const address=document.getElementById('f_address')?.value?.trim()||'';
    const price=n(document.getElementById('f_price')?.value);
    const units=n(document.getElementById('f_units')?.value);
    const hold=n(document.getElementById('f_hold')?.value);
    const rent=n(document.getElementById('f_rent')?.value);
    if(i===0){
      if(!address)missing.push('property address');
      if(price<=0)missing.push('acquisition price');
      if(units<=0)missing.push('number of units');
      if(hold<=0)missing.push('expected holding period');
    }
    if(i===1&&rent<=0)missing.push('monthly rent');
    if(missing.length){
      try{if(typeof setStatus==='function')setStatus('Please enter '+missing.join(', ')+' before continuing.');}catch(e){}
      return false;
    }
    return true;
  }

  function activateDashboard(){
    try{window.WorkflowNavigationController?.go?.('dashboard');return;}catch(e){}
    const target=document.getElementById('dashboard');
    if(!target)throw new Error('Review Results section is unavailable.');
    document.querySelectorAll('.section').forEach(sec=>sec.classList.toggle('active',sec===target));
    document.querySelectorAll('#stage8Workflow [data-s8-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.s8Tab==='dashboard'));
    try{window.Stage8Workflow?.refresh?.();}catch(e){}
    try{window.Stage10Workflow?.refresh?.();}catch(e){}
    try{window.Stage15Layout?.apply?.();}catch(e){}
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function run(){
    syncVisible();
    const i=currentStep();
    if(i<5){
      if(!valid(i))return;
      try{window.GuidedAnalysisSetup?.go?.(i+1);}catch(err){
        try{if(typeof setStatus==='function')setStatus('Unable to advance the setup: '+err.message);}catch(_e){}
      }
      setTimeout(()=>{try{window.GuidedAssumptionGuidance?.apply?.();window.GuidedPage1Cleanup?.apply?.();bindButton();}catch(e){}},0);
      return;
    }
    try{
      if(typeof readFields==='function')readFields();
      if(typeof render==='function')render();
      try{window.InitialRepairsModel?.enhanceResults?.();}catch(e){}
      if(typeof setStatus==='function')setStatus('Analysis updated — review the results');
      activateDashboard();
    }catch(err){
      try{if(typeof setStatus==='function')setStatus('Please review the inputs: '+err.message);}catch(_e){}
    }
  }

  function capture(e){
    if(!e.target?.closest?.('#gwNext'))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();run();
  }

  function bindButton(){
    const btn=document.getElementById('gwNext');
    if(!btn)return false;
    btn.onclick=e=>{e.preventDefault();e.stopPropagation();run();};
    return true;
  }

  function start(){
    window.addEventListener('click',capture,true);
    let tries=0;const timer=setInterval(()=>{if(bindButton())clearInterval(timer);if(++tries>60)clearInterval(timer)},120);
    const host=document.getElementById('guidedSetup');
    if(host){new MutationObserver(()=>bindButton()).observe(host,{childList:true,subtree:true});}
  }

  window.GuidedContinueController={run,bindButton};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
