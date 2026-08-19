'use strict';
(() => {
  const VERSION=1;
  if((window.__workflowNavigationControllerVersion||0)>=VERSION)return;
  window.__workflowNavigationControllerVersion=VERSION;

  const PRIMARY=new Set(['assumptions','dashboard','report']);

  function directActivate(id){
    const target=document.getElementById(id);
    if(!target)return false;
    document.querySelectorAll('.section').forEach(sec=>sec.classList.toggle('active',sec===target));
    document.querySelectorAll('.nav [data-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===id));
    document.querySelectorAll('#stage8Workflow [data-s8-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.s8Tab===id));
    try{window.Stage8Workflow?.refresh?.();}catch(e){}
    try{window.Stage10Workflow?.refresh?.();}catch(e){}
    if(id==='dashboard'){
      try{window.Stage15Layout?.apply?.();}catch(e){}
      try{if(typeof render==='function')render();}catch(e){}
    }
    if(id==='report'){
      try{window.ReportBuilderV1?.renderReport?.();}catch(e){}
      setTimeout(()=>{
        try{window.ReportBuilderV2?.apply?.();}catch(e){}
        try{window.ReportBuilderV3?.apply?.();}catch(e){}
        try{window.ReportBuilderV4?.apply?.();}catch(e){}
        try{window.UserBranding?.applyReportBranding?.();}catch(e){}
      },0);
    }
    window.scrollTo({top:0,behavior:'smooth'});
    return true;
  }

  function reviewResults(){
    try{if(typeof readFields==='function')readFields();}catch(e){try{if(typeof setStatus==='function')setStatus('Please review the analysis inputs: '+e.message);}catch(_e){}return;}
    try{if(typeof render==='function')render();}catch(e){}
    try{if(typeof setStatus==='function')setStatus('Analysis updated — review the results');}catch(e){}
    directActivate('dashboard');
  }

  function newAnalysis(){
    try{window.Stage10Workflow?.newAnalysis?.();}catch(e){}
    setTimeout(()=>directActivate('assumptions'),0);
    setTimeout(()=>{
      directActivate('assumptions');
      ['f_price','f_land','f_units','f_rent','quickPrice','quickRent'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
      document.getElementById('f_address')?.focus();
    },100);
  }

  function capture(e){
    const newBtn=e.target?.closest?.('#s10NewAnalysis');
    if(newBtn){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      newAnalysis();return;
    }
    const reviewBtn=e.target?.closest?.('#s10ReviewResults');
    if(reviewBtn){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      reviewResults();return;
    }
    const step=e.target?.closest?.('#stage8Workflow [data-s8-tab]');
    if(step&&PRIMARY.has(step.dataset.s8Tab)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      if(step.dataset.s8Tab==='dashboard')reviewResults();
      else directActivate(step.dataset.s8Tab);
    }
  }

  function start(){document.addEventListener('click',capture,true);}
  window.WorkflowNavigationController={go:directActivate,reviewResults,newAnalysis};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
