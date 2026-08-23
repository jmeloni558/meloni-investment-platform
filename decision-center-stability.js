'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisDecisionCenterStabilityV||0)>=VERSION)return;
  window.__propertyThesisDecisionCenterStabilityV=VERSION;

  const finite=v=>Number.isFinite(Number(v));
  const num=v=>Number(v);
  const near=(a,b,t=.000001)=>finite(a)&&finite(b)&&Math.abs(num(a)-num(b))<=t*Math.max(1,Math.abs(num(a)),Math.abs(num(b)));

  function matchesCurrent(offer){
    let s=null;try{s=state;}catch(_e){}
    const base=window.PropertyThesisIncomeEngineBridge?.current?.();
    if(!offer||!s||!base?.years?.length)return false;
    if(!near(offer.price,s.price)||!near(offer.rent,s.rent)||!near(offer.desiredCap,s.desiredCap)||!near(offer.requiredReturn,s.requiredReturn))return false;
    if(finite(offer.cap)&&finite(base.cap)&&!near(offer.cap,base.cap,.00001))return false;
    if(finite(offer.IRR)&&finite(base.IRR)&&!near(offer.IRR,base.IRR,.00001))return false;
    if(finite(offer?.y1?.noi)&&finite(base?.years?.[0]?.noi)&&!near(offer.y1.noi,base.years[0].noi,.00001))return false;
    return true;
  }

  function pin(){
    const setup=document.getElementById('reviewAnalysisSetup');
    const card=document.getElementById('ptDecisionCenter');
    if(setup&&card&&card.previousElementSibling!==setup)setup.insertAdjacentElement('afterend',card);
    return !!(setup&&card);
  }

  function install(){
    const api=window.PropertyThesisDecisionCenter;
    if(!api||api.__ptStable)return false;
    const oldApply=api.apply;
    api.offerMatchesState=(offer)=>matchesCurrent(offer);
    api.apply=function(){
      const offer=window.PropertyThesisSecondaryEngine?.getOffer?.();
      if(!matchesCurrent(offer)){
        try{window.PropertyThesisSecondaryEngine?.clearCache?.();}catch(_e){}
        Promise.resolve(window.PropertyThesisSecondaryEngine?.request?.({refresh:false})).then(()=>setTimeout(()=>{try{oldApply?.();pin();}catch(_e){}},0));
        return false;
      }
      const out=oldApply?.();pin();return out;
    };
    api.pin=pin;
    api.__ptStable=true;
    return true;
  }

  function refresh(){
    install();
    try{window.PropertyThesisDecisionCenter?.apply?.();}catch(_e){}
    pin();
  }

  function observe(){
    const grid=document.querySelector('#dashboard .grid');if(!grid||grid.__ptDecisionPinObserved)return false;
    grid.__ptDecisionPinObserved=true;
    const mo=new MutationObserver(()=>{if(document.getElementById('dashboard')?.classList.contains('active'))setTimeout(pin,0);});
    mo.observe(grid,{childList:true});
    return true;
  }

  function start(){
    [0,80,220,500].forEach(ms=>setTimeout(()=>{refresh();observe();},ms));
    document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="dashboard"],[data-tab="dashboard"],#appNavReview,[data-app-review],#gwNext,#gwSave'))[0,80,200].forEach(ms=>setTimeout(refresh,ms));},true);
  }

  window.PropertyThesisDecisionCenterStability={version:VERSION,matchesCurrent,pin,refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
