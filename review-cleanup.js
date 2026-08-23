'use strict';
(() => {
  if((window.__reviewCleanupVersion||0)>=1)return;
  window.__reviewCleanupVersion=1;

  function hideCardFor(id){
    const el=document.getElementById(id);
    const card=el?.closest('.card');
    if(card)card.style.display='none';
  }

  function apply(){
    hideCardFor('snapshot');
    hideCardFor('financing');
    hideCardFor('saleSummary');
    hideCardFor('modelHealth');
    return true;
  }

  function start(){
    apply();
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
    const originalRender=window.render;
    if(typeof originalRender==='function'&&!originalRender.__reviewCleanupWrapped){
      const wrapped=function(...args){const out=originalRender.apply(this,args);setTimeout(apply,0);return out;};
      wrapped.__reviewCleanupWrapped=true;
      window.render=wrapped;
    }
  }

  window.ReviewCleanup={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
