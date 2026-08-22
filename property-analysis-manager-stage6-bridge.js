'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyAnalysisManagerStage6BridgeVersion||0)>=VERSION)return;
  window.__propertyAnalysisManagerStage6BridgeVersion=VERSION;

  function wire(){
    const tab=document.querySelector('.tab[data-tab="propertyhub"]');
    if(!tab||!window.__stage6Initialized||!window.PropertyAnalysisManager)return false;
    if(tab.dataset.ptAnalysisManagerBridge==='1')return true;
    const original=tab.onclick;
    tab.onclick=async function(...args){
      let out;
      try{out=original?.apply(this,args);if(out&&typeof out.then==='function')await out;}catch(e){console.error(e);}
      try{window.PropertyAnalysisManager.decorateCards();}catch(e){console.error(e);}
      return out;
    };
    tab.dataset.ptAnalysisManagerBridge='1';
    try{window.PropertyAnalysisManager.decorateCards();}catch(_e){}
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{if(wire()||++tries>80)clearInterval(timer);},125);
})();
