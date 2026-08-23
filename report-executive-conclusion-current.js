'use strict';
(()=>{
  const VERSION=2;
  if((window.__reportExecutiveConclusionCurrentVersion||0)>=VERSION)return;
  window.__reportExecutiveConclusionCurrentVersion=VERSION;

  const money=v=>typeof fmtC==='function'?fmtC(v):(Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');
  const pct=v=>typeof fmtP==='function'?fmtP(v):(Number.isFinite(Number(v))?(Number(v)*100).toFixed(2)+'%':'N/A');
  const mult=v=>typeof fmtX==='function'?fmtX(v):(Number.isFinite(Number(v))?Number(v).toFixed(2)+'x':'N/A');
  const finite=v=>Number.isFinite(Number(v));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));

  function reconValue(){
    try{
      const key=((state?.address||'').trim()||(state?.name||'').trim()||'current-analysis');
      const all=JSON.parse(localStorage.getItem('meloni-review-reconciliation-v1')||'{}')||{};
      const v=Number(all?.[key]?.reconciled);
      return finite(v)&&v>0?v:null;
    }catch(_e){return null;}
  }

  function currentNarrative(){
    if(typeof state==='undefined'||typeof result==='undefined'||!state||!result||!result.years?.length)return'';
    const y1=result.years[0];
    const support=[Number(result.capValue),Number(result.grmValue)].filter(Number.isFinite);
    const low=support.length?Math.min(...support):NaN,high=support.length?Math.max(...support):NaN;
    const recon=reconValue();
    let thesis='';try{thesis=window.PropertyThesisInvestmentThesis?.narrative?.()||'';}catch(_e){}

    const valuation=finite(low)&&finite(high)
      ? `The income approaches indicate a property value range of ${money(low)} to ${money(high)} based on the selected capitalization rate and gross rent multiplier benchmarks.`
      : 'The income-supported valuation range is not available from the current assumptions.';
    const reconciliation=recon
      ? `The reconciled investment value is ${money(recon)} compared with an acquisition price of ${money(state.price)}.`
      : `A reconciled investment value has not been entered; the modeled acquisition price is ${money(state.price)}.`;
    const performance=`The projected IRR is ${pct(result.IRR)} versus the required return of ${pct(state.requiredReturn)}. Year 1 performance includes a ${pct(result.cap)} capitalization rate, ${mult(result.grm)} GRM, ${finite(y1.dcr)?mult(y1.dcr)+' DSCR':'no modeled debt-service coverage ratio'}, and NPV of ${money(result.NPV)}.`;
    if(thesis)return `${thesis} ${valuation} ${reconciliation} ${performance}`;
    const meets=finite(result.IRR)&&finite(state.requiredReturn)&&result.IRR>=state.requiredReturn&&finite(result.NPV)&&Number(result.NPV)>=0;
    const assessment=meets
      ? 'Based on the modeled assumptions, the principal return benchmarks are currently met; the acquisition should still be evaluated in conjunction with property-specific risks and the investor’s objectives.'
      : 'Based on the modeled assumptions, one or more return benchmarks are not currently met and the acquisition terms should be reviewed in conjunction with the investor’s objectives.';
    return `${valuation} ${reconciliation} ${performance} ${assessment}`;
  }

  function apply(){
    const box=document.querySelector('#clientReport .rb-report > .rb-conclusion');
    const p=box?.querySelector('p');
    if(!p)return false;
    const text=currentNarrative();
    if(!text)return false;
    p.innerHTML=esc(text);
    box.dataset.currentExecutiveConclusion='2';
    return true;
  }

  function wrap(obj,key,flag){
    const fn=obj?.[key];
    if(typeof fn!=='function'||fn[flag])return;
    const wrapped=function(...args){const out=fn.apply(this,args);apply();setTimeout(apply,0);return out;};
    wrapped[flag]=true;
    obj[key]=wrapped;
  }

  function install(){
    wrap(window.ReportBuilderV1,'renderReport','__currentExecutiveConclusion');
    wrap(window.ReportBuilderV1,'render','__currentExecutiveConclusion');
    wrap(window.ReportBuilderV8,'apply','__currentExecutiveConclusion');
    wrap(window.ReportBuilderV8Presentation,'apply','__currentExecutiveConclusion');
    wrap(window.PropertyThesisReportBranding,'apply','__currentExecutiveConclusion');
    apply();
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbDownloadPdf'))setTimeout(apply,120);
  },true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))setTimeout(apply,80);},true);

  window.ReportExecutiveConclusionCurrent={version:VERSION,apply,currentNarrative};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();
