'use strict';
(() => {
  const VERSION=8;
  if((window.__stage9Version||0)>=VERSION)return;
  window.__stage9Version=VERSION;
  window.__stage9Initialized=true;

  function selectedProperty(){return (cloudProperties||[]).find(p=>p.id===selectedPropertyId)||null}
  function formProperty(){
    const get=id=>document.getElementById(id)?.value?.trim()||'';
    const name=get('p_name'),address=get('p_address'),city=get('p_city'),st=get('p_state'),zip=get('p_zip');
    if(!name&&!address&&!city&&!zip)return null;
    return {name,address,city,state:st,postal_code:zip};
  }
  function propertySource(){return selectedProperty()||formProperty()}
  function fullAddress(p){if(!p)return '';const locality=[p.city,[p.state,p.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');return [p.address,locality].filter(Boolean).join(', ')}
  function syncPropertyToAnalysis(force=false){const p=propertySource();if(!p)return false;const addr=fullAddress(p),nm=p.name||p.address||'';if(force||!state.name)state.name=nm||state.name||'';if(force||!state.address)state.address=addr||state.address||'';const nameInput=document.getElementById('f_name'),addressInput=document.getElementById('f_address'),quickName=document.getElementById('propertyName');if(nameInput&&(force||!nameInput.value))nameInput.value=nm;if(addressInput&&(force||!addressInput.value))addressInput.value=addr;if(quickName&&(force||!quickName.value))quickName.value=nm;if(nameInput)state.name=nameInput.value;if(addressInput)state.address=addressInput.value;return true}

  function wireStepTwo(){const step=document.querySelector('[data-s8-tab="assumptions"]');if(step&&!step.dataset.propertySyncV8){step.dataset.propertySyncV8='1';step.addEventListener('click',()=>{syncPropertyToAnalysis(true);setTimeout(()=>syncPropertyToAnalysis(true),0)},true)}}

  function loadStage11(){
    const old=document.getElementById('stage11Script');if(old)old.remove();
    const s=document.createElement('script');s.id='stage11Script';s.src='stage11.js?v=4';document.body.appendChild(s);
  }

  function loadStage10(){
    const old=document.getElementById('stage10Script');if(old)old.remove();
    window.__stage10Loading=true;
    const s=document.createElement('script');s.id='stage10Script';s.src='stage10.js?v=6';
    s.onload=()=>{window.__stage10Loading=false;loadStage11()};
    s.onerror=()=>{window.__stage10Loading=false;loadStage11()};
    document.body.appendChild(s);
  }

  function start(){
    wireStepTwo();
    const host=document.getElementById('stage8Workflow')||document.body;
    const obs=new MutationObserver(wireStepTwo);obs.observe(host,{childList:true,subtree:true});
    loadStage10();
  }

  window.Stage9PropertySync={sync:syncPropertyToAnalysis,fullAddress,source:propertySource};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();