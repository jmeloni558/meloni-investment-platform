'use strict';
(()=>{
  const VERSION=2;
  if((window.__propertyAnalysisManagerStage6BridgeVersion||0)>=VERSION)return;
  window.__propertyAnalysisManagerStage6BridgeVersion=VERSION;

  function decorate(){
    try{return !!window.PropertyAnalysisManager?.decorateCards?.();}
    catch(e){console.error('Property analysis manager decorate failed',e);return false;}
  }

  function wire(){
    const tab=document.querySelector('.tab[data-tab="propertyhub"]');
    if(!tab||typeof window.Stage6Dashboard?.render!=='function'||!window.PropertyAnalysisManager)return false;
    if(tab.dataset.ptAnalysisManagerBridge==='2')return true;

    tab.addEventListener('click',()=>{
      setTimeout(decorate,0);
      setTimeout(decorate,150);
      setTimeout(decorate,400);
    },false);
    tab.dataset.ptAnalysisManagerBridge='2';

    decorate();
    setTimeout(decorate,150);
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    if(wire()||++tries>120)clearInterval(timer);
  },100);
})();
