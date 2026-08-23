'use strict';
(()=>{
  const VERSION=3;
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

  function loadModule(src,id,onload){
    const existing=document.getElementById(id);
    if(existing){if(onload&&window.PropertyThesisMarketRentUnderwriting)setTimeout(onload,0);return existing;}
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    s.async=false;
    if(onload)s.addEventListener('load',onload,{once:true});
    (document.body||document.head||document.documentElement).appendChild(s);
    return s;
  }

  function activateUnderwriting(){
    const afterLoad=()=>{
      try{window.PropertyThesisMarketRentUnderwriting?.schedule?.();}catch(_e){}
      try{window.PropertyThesisMarketRentUnderwriting?.enhanceModal?.();}catch(_e){}
    };
    loadModule('market-rent-underwriting.js?v=1&build=20260823-1318-market-rent-underwriting','ptMarketRentUnderwritingLoader',afterLoad);
    loadModule('report-market-rent-underwriting.js?v=1&build=20260823-1318-market-rent-underwriting','ptReportMarketRentUnderwritingLoader');
    [0,100,300,700].forEach(ms=>setTimeout(afterLoad,ms));
  }

  function activateWhenReady(){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activateUnderwriting,{once:true});
    else setTimeout(activateUnderwriting,0);
  }

  // This script is intentionally loaded before market-rent-support.js so this
  // capture listener restores cloud data before the Market Rent modal renders.
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-ptr-open]')){
      restoreBeforeOpen();
      setTimeout(()=>{try{window.PropertyThesisMarketRentUnderwriting?.enhanceModal?.();}catch(_e){}},80);
      setTimeout(()=>{try{window.PropertyThesisMarketRentUnderwriting?.enhanceModal?.();}catch(_e){}},250);
    }
  },true);

  window.MarketRentPriorResearchFix={restore:restoreBeforeOpen,activateUnderwriting};
  activateWhenReady();
})();
