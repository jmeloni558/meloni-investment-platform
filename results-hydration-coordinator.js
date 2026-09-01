'use strict';
(()=>{
  const VERSION=5;
  if((window.__propertyThesisResultsHydrationCoordinatorV||0)>=VERSION)return;
  window.__propertyThesisResultsHydrationCoordinatorV=VERSION;

  let busy=false,lastRun=0,refreshGeneration=0;
  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);}catch(_e){}};

  function pinDecisionCenter(){try{window.PropertyThesisDecisionCenter?.pin?.();}catch(_e){}}
  function pinInvestmentThesis(){try{window.PropertyThesisInvestmentThesis?.pin?.();}catch(_e){}}
  function pinTopResults(){pinDecisionCenter();pinInvestmentThesis();}

  function stateSignature(){
    try{return window.PropertyThesisIncomeEngineBridge?.signature?.(state)||'';}catch(_e){return '';}
  }

  function refreshConsumers(expectedSignature='',generation=refreshGeneration){
    if(generation!==refreshGeneration)return false;
    if(expectedSignature&&stateSignature()!==expectedSignature)return false;
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
    requestAnimationFrame(()=>{if(generation!==refreshGeneration||expectedSignature&&stateSignature()!==expectedSignature)return;try{window.CashFlowChart?.draw?.();}catch(_e){}pinTopResults();});
    setTimeout(()=>{if(generation===refreshGeneration&&(!expectedSignature||stateSignature()===expectedSignature))pinTopResults();},30);
    setTimeout(()=>{if(generation===refreshGeneration&&(!expectedSignature||stateSignature()===expectedSignature))pinTopResults();},100);
    return true;
  }

  async function hydrate({force=false,freshSecondary=false}={}){
    if(busy){
      if(!force)return false;
      const queuedGeneration=++refreshGeneration;
      for(let i=0;i<100&&busy;i++)await new Promise(resolve=>setTimeout(resolve,20));
      if(busy||queuedGeneration!==refreshGeneration)return false;
      return hydrate({force:true,freshSecondary});
    }
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||(!force&&!dashboard.classList.contains('active')))return false;
    const now=Date.now();if(!force&&now-lastRun<150)return false;
    const signedIn=typeof cloudUser!=='undefined'&&!!cloudUser;
    if(!signedIn)return false;
    const bridge=window.PropertyThesisIncomeEngineBridge;
    if(!bridge?.requestServer)return false;
    const generation=++refreshGeneration;
    const expectedSignature=stateSignature();
    busy=true;lastRun=now;
    try{
      let base=bridge.current?.();
      if(!base?.years?.length)base=await bridge.requestServer({...state},{refresh:false});
      if(!base?.years?.length)throw new Error('Protected calculation result is unavailable.');
      if(generation!==refreshGeneration||stateSignature()!==expectedSignature)return false;
      result=base;

      const originalBrowserRender=bridge?.browserRender;
      try{originalBrowserRender?.();}catch(_e){}
      result=base;

      const secondary=window.PropertyThesisSecondaryEngine;
      if(freshSecondary){try{secondary?.clearCache?.();}catch(_e){}}
      let secondaryResult=secondary?.current?.();
      const offerMatches=secondaryResult?.offer&&window.PropertyThesisDecisionCenter?.offerMatchesState?.(secondaryResult.offer,state);
      if(!offerMatches){try{secondary?.clearCache?.();}catch(_e){}secondaryResult=await secondary?.request?.({refresh:false});}
      if(!secondaryResult?.offer)throw new Error(secondary?.status?.().lastError||'Advanced analysis result is unavailable.');
      if(generation!==refreshGeneration||stateSignature()!==expectedSignature)return false;

      refreshConsumers(expectedSignature,generation);
      setTimeout(()=>refreshConsumers(expectedSignature,generation),40);
      setTimeout(()=>refreshConsumers(expectedSignature,generation),140);
      setTimeout(()=>{if(generation!==refreshGeneration||stateSignature()!==expectedSignature)return;try{window.CashFlowChart?.draw?.();}catch(_e){}pinTopResults();},240);
      return true;
    }catch(e){
      console.warn('Results hydration incomplete:',e);
      status('Some review results are still loading. '+String(e?.message||e));
      refreshConsumers(expectedSignature,generation);
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
