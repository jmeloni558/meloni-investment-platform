'use strict';
(() => {
  if(window.__stage9Initialized)return;
  window.__stage9Initialized=true;

  function selectedProperty(){
    return (cloudProperties||[]).find(p=>p.id===selectedPropertyId)||null;
  }
  function formProperty(){
    const get=id=>document.getElementById(id)?.value?.trim()||'';
    const name=get('p_name'),address=get('p_address'),city=get('p_city'),st=get('p_state'),zip=get('p_zip');
    if(!name&&!address&&!city&&!st&&!zip)return null;
    return {name,address,city,state:st,postal_code:zip};
  }
  function propertySource(){
    // Prefer the selected cloud record. Fall back to whatever the user has
    // currently entered in the Step 1 / Property Record fields, even before save.
    return selectedProperty()||formProperty();
  }
  function fullAddress(p){
    if(!p)return '';
    const locality=[p.city,[p.state,p.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return [p.address,locality].filter(Boolean).join(', ');
  }
  function syncPropertyToAnalysis(force=false){
    const p=propertySource();
    if(!p)return false;
    const addr=fullAddress(p);
    const nm=p.name||p.address||'';

    if(force || !state.name)state.name=nm||state.name||'';
    if(force || !state.address)state.address=addr||state.address||'';

    const nameInput=document.getElementById('f_name');
    const addressInput=document.getElementById('f_address');
    const quickName=document.getElementById('propertyName');
    if(nameInput && (force || !nameInput.value))nameInput.value=nm;
    if(addressInput && (force || !addressInput.value))addressInput.value=addr;
    if(quickName && (force || !quickName.value))quickName.value=nm;

    // Keep the underlying analysis state and visible inputs aligned.
    if(nameInput)state.name=nameInput.value;
    if(addressInput)state.address=addressInput.value;
    return true;
  }

  // The guided Step 2 button uses the app's lexical switchTab function, so
  // intercept the actual click itself instead of relying only on window.switchTab.
  function wireStepTwo(){
    const step=document.querySelector('[data-s8-tab="assumptions"]');
    if(step && !step.dataset.propertySyncV2){
      step.dataset.propertySyncV2='1';
      step.addEventListener('click',()=>{
        syncPropertyToAnalysis(true);
        setTimeout(()=>syncPropertyToAnalysis(true),0);
        setTimeout(()=>syncPropertyToAnalysis(true),75);
      },true);
    }
  }

  // Also cover any other code path that exposes switchTab on window.
  const oldWindowSwitch=window.switchTab;
  if(typeof oldWindowSwitch==='function')window.switchTab=function(id){
    if(id==='assumptions')syncPropertyToAnalysis(true);
    const out=oldWindowSwitch(id);
    if(id==='assumptions')setTimeout(()=>syncPropertyToAnalysis(true),0);
    return out;
  };

  // When a property is selected, immediately stage its identity for Step 2.
  if(typeof selectProperty==='function'){
    const oldSelect=selectProperty;
    selectProperty=function(id){
      const out=oldSelect(id);
      setTimeout(()=>{
        syncPropertyToAnalysis(false);
        window.Stage8Workflow?.refresh?.();
      },0);
      return out;
    };
  }

  // When a property is saved, copy the final saved record into the analysis state.
  if(typeof savePropertyCloud==='function'){
    const oldSaveProperty=savePropertyCloud;
    savePropertyCloud=async function(){
      const out=await oldSaveProperty();
      syncPropertyToAnalysis(true);
      return out;
    };
  }

  function start(){
    wireStepTwo();
    const obs=new MutationObserver(wireStepTwo);
    const host=document.getElementById('stage8Workflow')||document.body;
    obs.observe(host,{childList:true,subtree:true});

    // Preserve a user's unsaved Step 1 property entry as the draft source.
    ['p_name','p_address','p_city','p_state','p_zip'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&!el.dataset.analysisCarryover){
        el.dataset.analysisCarryover='1';
        el.addEventListener('change',()=>syncPropertyToAnalysis(false));
      }
    });
  }

  window.Stage9PropertySync={sync:syncPropertyToAnalysis,fullAddress,source:propertySource};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
