'use strict';
(()=>{
  const VERSION=4;
  if((window.__propertyThesisResultsHydrationCoordinatorV||0)>=VERSION)return;
  window.__propertyThesisResultsHydrationCoordinatorV=VERSION;

  let busy=false,lastRun=0;
  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);}catch(_e){}};

  function pinDecisionCenter(){try{window.PropertyThesisDecisionCenter?.pin?.();}catch(_e){}}
  function pinInvestmentThesis(){try{window.PropertyThesisInvestmentThesis?.pin?.();}catch(_e){}}
  function pinTopResults(){pinDecisionCenter();pinInvestmentThesis();}

  function refreshConsumers(){
    const modules=[
      'ReviewValuation','ReviewCashflowStatement','ReviewTaxesOperations','ReviewTaxesSale',
      'ReviewFinancingSummary','ReviewTotalInvestmentCashflow','ReviewReconciliation',
      'ReviewDecisionSummary','InvestmentOfferAnalysis','PropertyThesisDecisionCenter','PropertyThesisInvestmentThesis'
    ];
    for(const name of modules){try{window[name]?.apply?.();}catch(e){console.warn(name+' refresh skipped',e);}}
    try{window.InitialRepairsModel?.enhanceResults?.();}catch(_e){}
    try{window.Stage15Layout?.apply?.();}catch(_e){}
    try{window.PropertyThesisSecondaryServerUI?.apply?.();}catch(_e){}
    try{window.CashFlowChart?.draw?.();}catch(_e){}
    pinTopResults();
    requestAnimationFrame(()=>{try{window.CashFlowChart?.draw?.();}catch(_e){}pinTopResults();});
    setTimeout(pinTopResults,30);
    setTimeout(pinTopResults,100);
  }

  async function hydrate({force=false}={}){
    if(busy)return false;
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||(!force&&!dashboard.classList.contains('active')))return false;
    const now=Date.now();if(!force&&now-lastRun<150)return false;
    const bridge=window.PropertyThesisIncomeEngineBridge;
    if(!bridge?.requestServer)return false;
    busy=true;lastRun=now;
    try{
      let base=bridge.current?.();
      if(!base?.years?.length)base=await bridge.requestServer({...state},{refresh:false});
      if(!base?.years?.length)throw new Error('Protected calculation result is unavailable.');
      result=base;

      const originalBrowserRender=bridge?.browserRender;
      try{originalBrowserRender?.();}catch(_e){}
      result=base;

      const secondary=window.PropertyThesisSecondaryEngine;
      let secondaryResult=secondary?.current?.();
      const offerMatches=secondaryResult?.offer&&window.PropertyThesisDecisionCenter?.offerMatchesState?.(secondaryResult.offer,state);
      if(!offerMatches){try{secondary?.clearCache?.();}catch(_e){}secondaryResult=await secondary?.request?.({refresh:false});}
      if(!secondaryResult?.offer)throw new Error(secondary?.status?.().lastError||'Advanced analysis result is unavailable.');

      refreshConsumers();
      setTimeout(refreshConsumers,40);
      setTimeout(refreshConsumers,140);
      setTimeout(()=>{try{window.CashFlowChart?.draw?.();}catch(_e){}pinTopResults();},240);
      return true;
    }catch(e){
      console.warn('Results hydration incomplete:',e);
      status('Some review results are still loading. '+String(e?.message||e));
      refreshConsumers();
      return false;
    }finally{busy=false;}
  }

  function schedule(force=false){[0,80,220].forEach(ms=>setTimeout(()=>hydrate({force}),ms));}
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-s8-tab="dashboard"],[data-tab="dashboard"],#appNavReview,[data-app-review],[data-hub-open],[data-pt-open]'))schedule(true);
  },true);
  window.addEventListener('pageshow',()=>schedule(false));

  window.PropertyThesisResultsHydration={version:VERSION,hydrate,refresh:refreshConsumers,pinDecisionCenter,pinInvestmentThesis,pinTopResults};
})();
