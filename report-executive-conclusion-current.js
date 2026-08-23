'use strict';
(()=>{
  const VERSION=6;
  if((window.__reportExecutiveConclusionCurrentVersion||0)>=VERSION)return;
  window.__reportExecutiveConclusionCurrentVersion=VERSION;

  const finite=v=>Number.isFinite(Number(v));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));

  function loadProForma(){
    if(window.PropertyThesisReportProForma?.version>=3){window.PropertyThesisReportProForma.schedule?.();return;}
    const old=document.getElementById('ptReportProFormaLoader');
    if(old&&old.dataset.version==='3')return;
    old?.remove();
    const s=document.createElement('script');s.id='ptReportProFormaLoader';s.dataset.version='3';s.src='report-pro-forma.js?v=3&build=20260823-1422-pro-forma-v3';s.async=false;s.onload=()=>window.PropertyThesisReportProForma?.schedule?.();
    (document.body||document.head||document.documentElement).appendChild(s);
  }

  function fallbackThesis(){
    if(typeof state==='undefined'||typeof result==='undefined'||!state||!result||!result.years?.length)return'';
    const y1=result.years[0]||{};
    const meetsReturn=finite(result.IRR)&&finite(state.requiredReturn)&&Number(result.IRR)>=Number(state.requiredReturn)&&finite(result.NPV)&&Number(result.NPV)>=0;
    const meetsCap=finite(result.cap)&&finite(state.desiredCap)&&Number(result.cap)>=Number(state.desiredCap);
    const financed=finite(state.mortgage)&&Number(state.mortgage)>0;
    const debtOk=!financed||!finite(y1.dcr)||Number(y1.dcr)>=1.20;
    if(meetsReturn&&meetsCap&&debtOk)return `The property presents a supportable investment opportunity at the modeled acquisition terms. Current income, projected return${financed?', and debt coverage':''} are aligned with the investor’s selected benchmarks. The opportunity should be pursued subject to verification of achievable rent, operating expenses, financing terms, and other market-derived assumptions.`;
    const issues=[];if(!meetsCap)issues.push('current income yield');if(!meetsReturn)issues.push('projected return');if(!debtOk)issues.push('debt coverage');
    const issueText=issues.length===1?issues[0]:issues.length===2?`${issues[0]} and ${issues[1]}`:`${issues.slice(0,-1).join(', ')}, and ${issues[issues.length-1]}`;
    return `The property presents a conditional investment opportunity at the modeled acquisition terms. The principal challenge is ${issueText||'the relationship between acquisition basis and modeled performance'}, which limits support for the current price. The opportunity becomes more compelling through a lower acquisition basis, stronger sustainable income, improved financing, or lower operating costs, subject to verification of the underlying market assumptions.`;
  }

  function currentNarrative(){let thesis=null;try{thesis=window.PropertyThesisInvestmentThesis?.build?.()||null;}catch(_e){}if(thesis?.narrative)return String(thesis.narrative).replace(/\s+/g,' ').trim();return fallbackThesis();}

  function renameSections(){
    const report=document.querySelector('#clientReport .rb-report');if(!report)return false;
    const front=report.querySelector(':scope > .rb-conclusion');const frontH=front?.querySelector('h2');if(frontH)frontH.textContent='Property Thesis';
    const final=report.querySelector(':scope > .rb-final-conclusion,[data-rb-section="finalConclusion"]');const finalH=final?.querySelector('.rb-section-head h2');if(finalH)finalH.textContent='Investment Conclusion';
    const finalSub=final?.querySelector('.rb-section-head p');if(finalSub)finalSub.textContent='Final reconciliation of income, market rent, financing, valuation, risk, and projected returns.';
    return !!(front||final);
  }

  function refineReportLabels(){
    const report=document.querySelector('#clientReport .rb-report');if(!report)return false;
    const assessmentLabel=report.querySelector('.rb-conclusion-box strong');if(assessmentLabel&&/^Investment Conclusion:?$/i.test((assessmentLabel.textContent||'').trim()))assessmentLabel.textContent='Investment Assessment:';
    for(const stat of report.querySelectorAll('.rb-stat')){
      const label=(stat.querySelector('span')?.textContent||'').replace(/\s+/g,' ').trim();if(!/^Acquisition Price vs\. Reconciled Value$/i.test(label))continue;
      const value=stat.querySelector('b');const note=stat.querySelector('small');if(value&&/^(N\/?A|Not entered)$/i.test((value.textContent||'').trim())){value.textContent='Not Reconciled';if(note)note.textContent='No reconciled investment value entered';}
    }
    return true;
  }

  function apply(){
    const box=document.querySelector('#clientReport .rb-report > .rb-conclusion');const p=box?.querySelector('p');renameSections();refineReportLabels();loadProForma();
    if(!p)return false;const text=currentNarrative();if(!text)return false;p.innerHTML=esc(text);box.dataset.currentExecutiveConclusion='6';return true;
  }

  function wrap(obj,key,flag){const fn=obj?.[key];if(typeof fn!=='function'||fn[flag])return;const wrapped=function(...args){const out=fn.apply(this,args);apply();setTimeout(apply,0);return out;};wrapped[flag]=true;obj[key]=wrapped;}
  function install(){wrap(window.ReportBuilderV1,'renderReport','__currentExecutiveConclusion');wrap(window.ReportBuilderV1,'render','__currentExecutiveConclusion');wrap(window.ReportBuilderV8,'apply','__currentExecutiveConclusion');wrap(window.ReportBuilderV8Presentation,'apply','__currentExecutiveConclusion');wrap(window.PropertyThesisReportBranding,'apply','__currentExecutiveConclusion');loadProForma();apply();}

  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbDownloadPdf,[data-hub-report],[data-pt-report]'))setTimeout(()=>{loadProForma();apply();},120);},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))setTimeout(apply,80);},true);
  window.ReportExecutiveConclusionCurrent={version:VERSION,apply,currentNarrative,renameSections,refineReportLabels};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();
