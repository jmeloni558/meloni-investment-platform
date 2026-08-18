'use strict';
(() => {
  if(window.__stage9Initialized)return;
  window.__stage9Initialized=true;

  function selectedProperty(){
    return (cloudProperties||[]).find(p=>p.id===selectedPropertyId)||null;
  }
  function fullAddress(p){
    if(!p)return '';
    const cityLine=[p.city,p.state,p.postal_code].filter(Boolean).join(' ').trim();
    return [p.address,cityLine].filter(Boolean).join(', ');
  }
  function syncPropertyToAnalysis(force=false){
    const p=selectedProperty();
    if(!p)return false;
    const addr=fullAddress(p);
    if(force || !state.name)state.name=p.name||state.name||'';
    if(force || !state.address)state.address=addr||state.address||'';

    const nameInput=document.getElementById('f_name');
    const addressInput=document.getElementById('f_address');
    const quickName=document.getElementById('propertyName');
    if(nameInput && (force || !nameInput.value))nameInput.value=p.name||'';
    if(addressInput && (force || !addressInput.value))addressInput.value=addr;
    if(quickName && (force || !quickName.value))quickName.value=p.name||'';
    return true;
  }

  const oldSwitch=window.switchTab;
  if(typeof oldSwitch==='function')window.switchTab=function(id){
    if(id==='assumptions')syncPropertyToAnalysis(true);
    const out=oldSwitch(id);
    if(id==='assumptions')setTimeout(()=>syncPropertyToAnalysis(true),0);
    return out;
  };

  if(typeof selectProperty==='function'){
    const oldSelect=selectProperty;
    selectProperty=function(id){
      const out=oldSelect(id);
      setTimeout(()=>{
        if(document.querySelector('.section.active')?.id==='assumptions')syncPropertyToAnalysis(true);
        window.Stage8Workflow?.refresh?.();
      },0);
      return out;
    };
  }

  function wireStepTwo(){
    const step=document.querySelector('[data-s8-tab="assumptions"]');
    if(step && !step.dataset.propertySync){
      step.dataset.propertySync='1';
      step.addEventListener('click',()=>syncPropertyToAnalysis(true),true);
    }
  }

  const start=()=>{
    wireStepTwo();
    const obs=new MutationObserver(wireStepTwo);
    const host=document.getElementById('stage8Workflow')||document.body;
    obs.observe(host,{childList:true,subtree:true});
  };
  window.Stage9PropertySync={sync:syncPropertyToAnalysis,fullAddress};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
