'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV5FixesVersion||0)>=VERSION)return;
  window.__reportBuilderV5FixesVersion=VERSION;

  const PREF_KEY='meloni-report-builder-v1';
  const ALL_KEYS=[
    'includeAssumptions','includeValuation','includeFinancing','includeOperating','includeDisposition','includeReturns',
    'includeDetailedCashflow','includeTaxOperations','includeSaleTax','includeInvestmentCashflow','includeSensitivity'
  ];

  function readPrefs(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){return {};}}
  function writePrefs(p){try{localStorage.setItem(PREF_KEY,JSON.stringify(p));}catch(e){}}

  function syncAllCheckboxes(value){
    document.querySelectorAll('[data-rb-pref]').forEach(el=>{
      if(ALL_KEYS.includes(el.dataset.rbPref))el.checked=!!value;
    });
  }

  function rebuildReport(){
    try{if(typeof result==='undefined'||!result||typeof state==='undefined'||!state)return false;}catch(e){return false;}
    try{window.ReportBuilderV1?.renderReport?.();}catch(e){}
    setTimeout(()=>{
      try{window.ReportBuilderV2?.apply?.();}catch(e){}
      try{window.ReportBuilderV3?.apply?.();}catch(e){}
      try{window.ReportBuilderV4?.apply?.();}catch(e){}
    },0);
    return true;
  }

  function handleIncludeAll(e){
    const btn=e.target?.closest?.('#rbSelectAll');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const p=readPrefs();
    ALL_KEYS.forEach(k=>p[k]=true);
    writePrefs(p);
    syncAllCheckboxes(true);
    rebuildReport();
  }

  function scheduleRebuild(){
    setTimeout(rebuildReport,0);
    setTimeout(rebuildReport,80);
    setTimeout(rebuildReport,220);
  }

  function isAnalysisLoadTarget(el){
    if(!el)return false;
    const id=el.id||'';
    if(['loadNamedBtn','loadBtn','loadCloudAnalysis','loadCloudAnalysisBtn','loadSelectedAnalysis','loadAnalysisBtn'].includes(id))return true;
    const text=(el.textContent||'').trim().toLowerCase();
    return /^(load|open)\b/.test(text)&&!!el.closest?.('#cloud, #dashboard, #assumptions, .workspace-actions, .library');
  }

  document.addEventListener('click',handleIncludeAll,true);
  document.addEventListener('click',e=>{
    const target=e.target?.closest?.('button,[role="button"]');
    if(target?.matches?.('[data-s8-tab="report"],[data-tab="report"]'))scheduleRebuild();
    if(isAnalysisLoadTarget(target))scheduleRebuild();
  },true);

  const originalSwitchTab=window.switchTab;
  if(typeof originalSwitchTab==='function'&&!originalSwitchTab.__reportV5Wrapped){
    const wrapped=function(id,...args){
      const out=originalSwitchTab.call(this,id,...args);
      if(id==='report')scheduleRebuild();
      return out;
    };
    wrapped.__reportV5Wrapped=true;
    window.switchTab=wrapped;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reportV5Wrapped){
    const wrapped=function(...args){
      const out=originalRender.apply(this,args);
      scheduleRebuild();
      return out;
    };
    wrapped.__reportV5Wrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{
      const controls=document.getElementById('rbControls');
      const host=document.getElementById('clientReport');
      if(controls&&host){rebuildReport();clearInterval(timer);return;}
      if(++tries>50)clearInterval(timer);
    },125);
  }

  window.ReportBuilderV5Fixes={rebuildReport,scheduleRebuild};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
