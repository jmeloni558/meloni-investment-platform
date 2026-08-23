'use strict';
(()=>{
  const VERSION=5;
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
    if(existing){if(onload)setTimeout(onload,0);return existing;}
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
      try{window.PropertyThesisMarketRentResultsOrder?.schedule?.();}catch(_e){}
      try{window.PropertyThesisMarketRentConclusion?.schedule?.();}catch(_e){}
    };
    loadModule('market-rent-underwriting.js?v=1&build=20260823-1318-market-rent-underwriting','ptMarketRentUnderwritingLoader',afterLoad);
    loadModule('report-market-rent-underwriting.js?v=1&build=20260823-1318-market-rent-underwriting','ptReportMarketRentUnderwritingLoader',afterLoad);
    loadModule('market-rent-results-order.js?v=1&build=20260823-1322-market-rent-order','ptMarketRentResultsOrderLoader',afterLoad);
    loadModule('market-rent-conclusion-integration.js?v=1&build=20260823-1338-market-rent-conclusion','ptMarketRentConclusionLoader',afterLoad);
    [0,100,300,700,1500].forEach(ms=>setTimeout(afterLoad,ms));
  }

  function activateWhenReady(){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activateUnderwriting,{once:true});
    else setTimeout(activateUnderwriting,0);
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-ptr-open]')){
      restoreBeforeOpen();
      setTimeout(()=>{try{window.PropertyThesisMarketRentUnderwriting?.enhanceModal?.();}catch(_e){}},80);
      setTimeout(()=>{try{window.PropertyThesisMarketRentUnderwriting?.enhanceModal?.();}catch(_e){}},250);
    }
    if(e.target?.closest?.('[data-s8-tab="dashboard"],[data-tab="dashboard"],#appNavReview,[data-app-review],[data-hub-open],[data-pt-open],[data-s8-tab="report"],[data-tab="report"],[data-hub-report],[data-pt-report],#rbDownloadPdf')){
      setTimeout(()=>{try{window.PropertyThesisMarketRentResultsOrder?.schedule?.();}catch(_e){}try{window.PropertyThesisMarketRentConclusion?.schedule?.();}catch(_e){}},40);
    }
    if(e.target?.closest?.('[data-ptru-impact]')){
      [250,750,1500,3000].forEach(ms=>setTimeout(()=>{try{window.PropertyThesisMarketRentConclusion?.schedule?.();}catch(_e){}},ms));
    }
  },true);

  window.MarketRentPriorResearchFix={restore:restoreBeforeOpen,activateUnderwriting};
  activateWhenReady();
})();
