'use strict';
(()=>{
  const VERSION=2;
  if((window.__marketRentPriorResearchFixVersion||0)>=VERSION)return;
  window.__marketRentPriorResearchFixVersion=VERSION;

  function savedSupport(){
    try{
      if(typeof selectedAnalysisId==='undefined'||!selectedAnalysisId)return null;
      if(typeof cloudAnalyses==='undefined'||!Array.isArray(cloudAnalyses))return null;
      const a=cloudAnalyses.find(x=>x?.id===selectedAnalysisId);
      return a?.assumptions?.marketRentSupport||null;
    }catch(_e){return null;}
  }

  function hasUsefulSupport(s){
    return !!(s && (
      Array.isArray(s.comparables)&&s.comparables.length ||
      Number.isFinite(Number(s.estimate)) ||
      Number.isFinite(Number(s.concludedRent)) ||
      Number.isFinite(Number(s.expectedRent)) ||
      s.analystNote
    ));
  }

  function restoreBeforeOpen(){
    try{
      const current=(typeof state!=='undefined'&&state)?state.marketRentSupport:null;
      if(hasUsefulSupport(current))return current;
      const saved=savedSupport();
      if(hasUsefulSupport(saved)&&typeof state!=='undefined'&&state){
        state.marketRentSupport=JSON.parse(JSON.stringify(saved));
        return state.marketRentSupport;
      }
    }catch(_e){}
    return null;
  }

  function loadModule(src,id){
    if(document.getElementById(id))return;
    const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.head.appendChild(s);
  }
  function activateUnderwriting(){
    loadModule('market-rent-underwriting.js?v=1&build=20260823-1305-market-rent-underwriting','ptMarketRentUnderwritingLoader');
    loadModule('report-market-rent-underwriting.js?v=1&build=20260823-1305-market-rent-underwriting','ptReportMarketRentUnderwritingLoader');
  }

  // This script is intentionally loaded before market-rent-support.js so this
  // capture listener restores cloud data before the Market Rent modal renders.
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-ptr-open]'))restoreBeforeOpen();
  },true);

  window.MarketRentPriorResearchFix={restore:restoreBeforeOpen,activateUnderwriting};
  activateUnderwriting();
})();
