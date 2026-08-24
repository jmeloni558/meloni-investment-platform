'use strict';
(()=>{
  const VERSION=8;
  if((window.__reportExecutiveConclusionCurrentVersion||0)>=VERSION)return;
  window.__reportExecutiveConclusionCurrentVersion=VERSION;

  const finite=v=>Number.isFinite(Number(v));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const cache=new Map();

  function fingerprint(){
    try{
      const s=typeof state!=='undefined'&&state?state:{};
      const r=typeof result!=='undefined'&&result?result:{};
      const y1=r.years?.[0]||{};
      return JSON.stringify([
        s.address||s.name||'',Number(s.price)||0,Number(s.monthlyRent)||0,Number(s.vacancyPct)||0,
        Number(s.operatingExpensePct)||0,Number(s.mortgage)||0,Number(s.mortRate)||0,Number(s.loanYears)||0,
        Number(s.desiredCap)||0,Number(s.requiredReturn)||0,Number(r.cap)||0,Number(r.IRR)||0,Number(r.NPV)||0,
        Number(y1.noi)||0,Number(y1.dcr)||0
      ]);
    }catch(_e){return 'default';}
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

  function synthesized(){let thesis=null;try{thesis=window.PropertyThesisInvestmentThesis?.build?.()||null;}catch(_e){}if(thesis?.narrative)return String(thesis.narrative).replace(/\s+/g,' ').trim();return fallbackThesis();}

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
    const box=document.querySelector('#clientReport .rb-report > .rb-conclusion');const p=box?.querySelector('p');renameSections();refineReportLabels();if(!p)return false;
    const key=fingerprint();
    const existing=(p.textContent||'').replace(/\s+/g,' ').trim();
    const prior=cache.get(key)||'';
    const generated=synthesized();
    const candidates=[existing,prior,generated].filter(Boolean);
    if(!candidates.length)return false;
    const best=candidates.sort((a,b)=>b.length-a.length)[0];
    cache.set(key,best);
    if(existing!==best)p.innerHTML=esc(best);
    box.dataset.currentExecutiveConclusion='8-fullest';
    return true;
  }

  function schedule(){[0,60,160,360,700].forEach(ms=>setTimeout(apply,ms));}
  function wrap(obj,key,flag){const fn=obj?.[key];if(typeof fn!=='function'||fn[flag])return;const wrapped=function(...args){const out=fn.apply(this,args);schedule();return out;};wrapped[flag]=true;obj[key]=wrapped;}
  function install(){wrap(window.ReportBuilderV1,'renderReport','__currentExecutiveConclusionV8');wrap(window.ReportBuilderV1,'render','__currentExecutiveConclusionV8');wrap(window.ReportBuilderV8,'apply','__currentExecutiveConclusionV8');wrap(window.ReportBuilderV8Presentation,'apply','__currentExecutiveConclusionV8');wrap(window.PropertyThesisReportBranding,'apply','__currentExecutiveConclusionV8');schedule();}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,[data-hub-report],[data-pt-report]'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.ReportExecutiveConclusionCurrent={version:VERSION,apply,schedule,currentNarrative:synthesized,renameSections,refineReportLabels};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();