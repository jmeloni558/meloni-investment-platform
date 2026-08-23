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