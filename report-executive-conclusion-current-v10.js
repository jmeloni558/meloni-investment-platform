'use strict';
(()=>{
  const VERSION=10;
  if((window.__reportExecutiveConclusionCurrentVersion||0)>=VERSION)return;
  window.__reportExecutiveConclusionCurrentVersion=VERSION;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const finite=v=>Number.isFinite(Number(v));
  const money=v=>finite(v)?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):null;

  function baseNarrative(){
    try{
      const t=window.PropertyThesisInvestmentThesis?.build?.();
      if(t?.narrative)return String(t.narrative).replace(/\s+/g,' ').trim();
    }catch(_e){}
    return '';
  }

  function marketRentNarrative(){
    let s=null;try{s=state?.marketRentSupport||null;}catch(_e){}
    if(!s)return '';
    const concluded=finite(s.concludedRent)?Number(s.concludedRent):null;
    const estimate=finite(s.estimate)?Number(s.estimate):null;
    const low=finite(s.rangeLow??s.rentRangeLow)?Number(s.rangeLow??s.rentRangeLow):null;
    const high=finite(s.rangeHigh??s.rentRangeHigh)?Number(s.rangeHigh??s.rentRangeHigh):null;
    const comps=(Array.isArray(s.comparables)?s.comparables:[]).filter(c=>c?.included!==false);
    const parts=[];
    if(concluded!=null&&estimate!=null){
      const diff=concluded-estimate;
      if(Math.abs(diff)<25)parts.push(`The concluded market rent of ${money(concluded)} is generally consistent with the RentCast estimate of ${money(estimate)}.`);
      else parts.push(`The concluded market rent of ${money(concluded)} is ${diff>0?'above':'below'} the RentCast estimate of ${money(estimate)} and should be supported by the selected comparable evidence.`);
    }else if(concluded!=null)parts.push(`The concluded market rent is ${money(concluded)} based on the current underwriting.`);
    if(low!=null&&high!=null)parts.push(`The current RentCast indicated range is ${money(low)} to ${money(high)} per month.`);
    if(comps.length)parts.push(`${comps.length} selected rental comparable${comps.length===1?'':'s'} provide supporting market evidence.`);
    if(!parts.length)return '';
    return `Market rent underwriting: ${parts.join(' ')}`;
  }

  function compose(){
    const base=baseNarrative();
    const rent=marketRentNarrative();
    return [base,rent].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  }

  function renameSections(){
    const report=document.querySelector('#clientReport .rb-report');if(!report)return false;
    const front=report.querySelector(':scope > .rb-conclusion');const frontH=front?.querySelector('h2');if(frontH)frontH.textContent='Property Thesis';
    const final=report.querySelector(':scope > .rb-final-conclusion,[data-rb-section="finalConclusion"]');const finalH=final?.querySelector('.rb-section-head h2');if(finalH)finalH.textContent='Investment Conclusion';
    const finalSub=final?.querySelector('.rb-section-head p');if(finalSub)finalSub.textContent='Final reconciliation of income, market rent, financing, valuation, risk, and projected returns.';
    return true;
  }

  function refineReportLabels(){
    const report=document.querySelector('#clientReport .rb-report');if(!report)return false;
    const assessmentLabel=report.querySelector('.rb-conclusion-box strong');if(assessmentLabel&&/^Investment Conclusion:?$/i.test((assessmentLabel.textContent||'').trim()))assessmentLabel.textContent='Investment Assessment:';
    for(const stat of report.querySelectorAll('.rb-stat')){
      const label=(stat.querySelector('span')?.textContent||'').replace(/\s+/g,' ').trim();
      if(!/^Acquisition Price vs\. Reconciled Value$/i.test(label))continue;
      const value=stat.querySelector('b'),note=stat.querySelector('small');
      if(value&&/^(N\/?A|Not entered)$/i.test((value.textContent||'').trim())){value.textContent='Not Reconciled';if(note)note.textContent='No reconciled investment value entered';}
    }
    return true;
  }

  function apply(){
    const box=document.querySelector('#clientReport .rb-report > .rb-conclusion'),p=box?.querySelector('p');
    renameSections();refineReportLabels();if(!p)return false;
    const text=compose();if(!text)return false;
    p.innerHTML=esc(text);box.dataset.currentExecutiveConclusion='10-deterministic';return true;
  }
  function schedule(){[0,80,220,500].forEach(ms=>setTimeout(apply,ms));}
  function wrap(obj,key,flag){const fn=obj?.[key];if(typeof fn!=='function'||fn[flag])return;const wrapped=function(...args){const out=fn.apply(this,args);schedule();return out;};wrapped[flag]=true;obj[key]=wrapped;}
  function install(){wrap(window.ReportBuilderV1,'renderReport','__ptThesisV10');wrap(window.ReportBuilderV1,'render','__ptThesisV10');wrap(window.ReportBuilderV8,'apply','__ptThesisV10');wrap(window.ReportBuilderV8Presentation,'apply','__ptThesisV10');wrap(window.PropertyThesisReportBranding,'apply','__ptThesisV10');schedule();}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,[data-hub-report],[data-pt-report]'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.ReportExecutiveConclusionCurrent={version:VERSION,apply,schedule,currentNarrative:compose,renameSections,refineReportLabels};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();