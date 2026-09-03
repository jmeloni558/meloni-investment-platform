'use strict';
(()=>{
  const VERSION=5;
  if((window.__secondaryServerEngineBridgeVersion||0)>=VERSION)return;
  window.__secondaryServerEngineBridgeVersion=VERSION;

  const cache=new Map(),pending=new Map(),failedAt=new Map();
  let lastError='',lastServerAt=null;
  const STATE_KEYS=['price','land','units','rent','rentGrowth','vacancy','opEx','depLife','appreciation','hold','sellCost','mortgage','interestOnly','mortRate','loanYears','points','origFee','ordinaryTax','depTax','capGainsTax','requiredReturn','desiredCap','desiredGrm','initialRepairs','offerAnalysis'];
  const SCENARIO_KEYS=['mortgage','mortRate','loanYears','interestOnly','points','origFee'];
  function safe(v){try{return JSON.parse(JSON.stringify(v));}catch(_e){return v;}}
  function calculationState(src){const out={};for(const k of STATE_KEYS)out[k]=safe(src?.[k]);return out;}
  function calculationScenario(src){const out={};for(const k of SCENARIO_KEYS)out[k]=safe(src?.[k]);return out;}
  function snapshot(){
    const s=typeof state==='object'&&state?state:{},sc=typeof scenarioState==='object'&&scenarioState?scenarioState:{};
    return {state:calculationState(s),scenarioState:{B:calculationScenario(sc.B||{}),C:calculationScenario(sc.C||{})}};
  }
  function signature(x=snapshot()){return JSON.stringify(x);}
  function authError(e){const status=Number(e?.status||e?.context?.status||0),message=String(e?.message||e||'');return status===401||/auth|jwt|session|sign-in|unauthor|401/i.test(message);}
  async function invokeServer(x,session){
    const headers=session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{},invoke=cloudClient.functions.invoke('propertythesis-income-engine',{body:{action:'secondary',state:x.state,scenarioState:x.scenarioState},headers});
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Protected secondary engine timed out')),8000));
    const {data,error}=await Promise.race([invoke,timeout]);
    if(error)throw error;
    if(data?.error)throw new Error(data.error+(data?.details?' — '+data.details:''));
    if(!data?.result?.offer||!data?.result?.sensitivity||!Array.isArray(data?.result?.scenarios))throw new Error('Protected secondary engine returned an incomplete result');
    return data.result;
  }
  async function callServer(x){
    if(typeof cloudClient==='undefined'||!cloudClient)throw new Error('Supabase client unavailable');
    let session=(await cloudClient.auth.getSession()).data?.session||null;
    try{return await invokeServer(x,session);}catch(e){if(!authError(e)||!cloudClient.auth.refreshSession)throw e;session=(await cloudClient.auth.refreshSession()).data?.session||null;return invokeServer(x,session);}
  }
  function refreshConsumers(){
    try{window.renderScenarios?.();}catch(_e){}
    try{window.InvestmentOfferAnalysis?.apply?.();}catch(_e){}
    try{window.ReportSensitivityAnalysis?.apply?.(true);}catch(_e){}
    try{window.ReportInvestmentOfferAnalysis?.apply?.();}catch(_e){}
    try{window.PropertyThesisSecondaryServerUI?.apply?.();}catch(_e){}
  }
  async function request({refresh=true,force=false}={}){
    const x=snapshot(),sig=signature(x);
    if(cache.has(sig))return cache.get(sig);
    if(pending.has(sig))return pending.get(sig);
    if(!force&&Date.now()-(failedAt.get(sig)||0)<10000)return null;
    if(force)failedAt.delete(sig);
    const job=(async()=>{
      try{
        const r=await callServer(x);
        cache.set(sig,r);failedAt.delete(sig);lastError='';lastServerAt=new Date();
        if(refresh&&signature()===sig)setTimeout(()=>{if(signature()===sig)refreshConsumers();},0);
        return r;
      }catch(e){
        failedAt.set(sig,Date.now());if(signature()===sig){lastError=String(e?.message||e);try{window.PropertyThesisSecondaryServerUI?.apply?.();}catch(_e){}}
        return null;
      }finally{pending.delete(sig);}
    })();
    pending.set(sig,job);return job;
  }
  function current(){return cache.get(signature())||null;}
  function getOffer(){return current()?.offer||null;}
  function getSensitivity(){return current()?.sensitivity||null;}
  function getScenarios(){return current()?.scenarios||null;}

  const originalRenderScenarios=window.renderScenarios;
  if(typeof originalRenderScenarios==='function'&&!originalRenderScenarios.__secondaryServerWrapped){
    const wrapped=function(){
      const rows=getScenarios();
      if(!rows){const out=originalRenderScenarios.apply(this,arguments);request();return out;}
      const host=document.getElementById('scenarioCards');
      if(host){host.innerHTML=['A','B','C'].map(k=>{const s=typeof getScenarioState==='function'?getScenarioState(k):{};return `<div class="scenario-card"><h3>Scenario ${k}</h3><div class="field"><label>Mortgage</label><input id="sc_${k}_mortgage" type="number" value="${s.mortgage}" ${k==='A'?'disabled':''}></div><div class="field"><label>Rate %</label><input id="sc_${k}_mortRate" type="number" value="${Number(s.mortRate||0)*100}" ${k==='A'?'disabled':''}></div><div class="field"><label>Years</label><input id="sc_${k}_loanYears" type="number" value="${s.loanYears}" ${k==='A'?'disabled':''}></div><div class="field"><label>Interest Only</label><select id="sc_${k}_interestOnly" ${k==='A'?'disabled':''}><option value="false">NO</option><option value="true" ${s.interestOnly?'selected':''}>YES</option></select></div></div>`}).join('');}
      const table=document.getElementById('scenarioTable');
      if(table&&typeof tableHTML==='function'&&typeof cell==='function')table.innerHTML=tableHTML(['Scenario','Mortgage','Monthly Payment','DSCR','IRR','NPV'],rows.map(r=>({cells:[cell('Scenario '+r.key),cell(fmtC(Number(r.mortgage)||0)),cell(fmtC(Number(r.monthlyPayment)||0,2)),cell(fmtX(Number(r.dcr))),cell(fmtP(Number(r.IRR))),cell(fmtC(Number(r.NPV)))]})));
      return rows;
    };
    wrapped.__secondaryServerWrapped=true;wrapped.__original=originalRenderScenarios;window.renderScenarios=wrapped;
  }

  const oldRender=window.render;
  if(typeof oldRender==='function'&&!oldRender.__secondaryServerPrefetchWrapped){
    const wrapped=function(){const out=oldRender.apply(this,arguments);setTimeout(()=>request(),0);return out;};
    wrapped.__secondaryServerPrefetchWrapped=true;wrapped.__original=oldRender;window.render=wrapped;
  }
  function boot(){
    request();
    try{cloudClient?.auth?.onAuthStateChange?.((_e,s)=>{if(s?.user)setTimeout(()=>request(),0)});}catch(_e){}
  }
  window.PropertyThesisSecondaryEngine={version:VERSION,request,current,getOffer,getSensitivity,getScenarios,clearCache:()=>cache.clear(),status:()=>({lastError,lastServerAt,cached:cache.size,pending:pending.size})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
