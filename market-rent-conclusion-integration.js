'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptMarketRentConclusionIntegrationV||0)>=VERSION)return;
  window.__ptMarketRentConclusionIntegrationV=VERSION;

  const finite=v=>Number.isFinite(Number(v));
  const n=v=>Number(v);
  const money=v=>finite(v)?n(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const pct=v=>finite(v)?(n(v)*100).toFixed(1)+'%':'—';
  const ratio=v=>finite(v)?n(v).toFixed(2)+'x':'—';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));

  function support(){try{return state?.marketRentSupport||null;}catch(_e){return null;}}
  function scenarioRows(s){return Array.isArray(s?.rentScenarioImpacts?.rows)?s.rentScenarioImpacts.rows:[];}
  function rentValues(s){
    let current=finite(s?.currentRent)?n(s.currentRent):NaN;
    try{if(!finite(current)&&finite(state?.rent))current=n(state.rent);}catch(_e){}
    const expected=finite(s?.expectedRent)?n(s.expectedRent):finite(s?.concludedRent)?n(s.concludedRent):finite(s?.estimate)?n(s.estimate):current;
    const low=finite(s?.lowRent)?n(s.lowRent):finite(s?.rangeLow)?n(s.rangeLow):NaN;
    const high=finite(s?.highRent)?n(s.highRent):finite(s?.rangeHigh)?n(s.rangeHigh):NaN;
    return {current,low,expected,high};
  }
  function rowPass(r){
    if(!r)return false;
    let s=null;try{s=state;}catch(_e){}
    if(!s)return false;
    const irrOk=!finite(s.requiredReturn)||!finite(r.irr)||n(r.irr)>=n(s.requiredReturn);
    const capOk=!finite(s.desiredCap)||!finite(r.cap)||n(r.cap)>=n(s.desiredCap);
    const npvOk=!finite(r.npv)||n(r.npv)>=0;
    const financed=finite(s.mortgage)&&n(s.mortgage)>0;
    const debtOk=!financed||!finite(r.dcr)||n(r.dcr)>=1.20;
    return irrOk&&capOk&&npvOk&&debtOk;
  }
  function assessment(){
    const s=support();if(!s)return null;
    const rows=scenarioRows(s),v=rentValues(s);
    const low=rows.find(r=>String(r.label).toLowerCase()==='low');
    const expected=rows.find(r=>String(r.label).toLowerCase()==='expected');
    const high=rows.find(r=>String(r.label).toLowerCase()==='high');
    const lowPass=rowPass(low),expectedPass=rowPass(expected),highPass=rowPass(high);
    let key='uncalculated',label='Rent Range Not Yet Tested',tone='neutral';
    if(rows.length){
      if(lowPass){key='resilient';label='Resilient Across Rent Range';tone='good';}
      else if(expectedPass){key='expected';label='Works at Expected Rent';tone='warn';}
      else if(highPass){key='high';label='High-Rent Dependent';tone='bad';}
      else {key='fail';label='Rent Range Does Not Clear Benchmarks';tone='bad';}
    }
    const currentGap=finite(v.current)&&finite(v.expected)&&v.current>0?(v.expected-v.current)/v.current:NaN;
    const rentcastGap=finite(s.estimate)&&finite(v.expected)&&n(s.estimate)>0?(v.expected-n(s.estimate))/n(s.estimate):NaN;
    const parts=[];
    if(key==='resilient')parts.push(`The Low rent case of ${money(v.low)}/month still clears the selected return, income-yield and debt-coverage screens, indicating meaningful downside resilience.`);
    else if(key==='expected')parts.push(`The Expected rent case of ${money(v.expected)}/month clears the selected benchmarks, but the Low case of ${money(v.low)}/month does not; the investment conclusion therefore depends on achieving the expected rent.`);
    else if(key==='high')parts.push(`Only the High rent case of ${money(v.high)}/month clears the selected benchmarks, making the investment materially dependent on upside rent execution.`);
    else if(key==='fail')parts.push(`Even the High rent case of ${money(v.high)}/month does not clear all selected benchmarks, so rent improvement alone does not resolve the current investment constraints.`);
    else parts.push('The Low / Expected / High rent scenarios have not yet been calculated through the protected engine.');
    if(finite(currentGap)&&Math.abs(currentGap)>=.05)parts.push(`Expected rent is ${pct(Math.abs(currentGap))} ${currentGap>0?'above':'below'} the current or asking rent, so the underwriting includes a meaningful rent-execution assumption.`);
    else if(finite(currentGap))parts.push('Expected rent is generally consistent with the current or asking rent.');
    if(finite(rentcastGap)&&Math.abs(rentcastGap)>=.075)parts.push(`Expected rent is ${pct(Math.abs(rentcastGap))} ${rentcastGap>0?'above':'below'} the RentCast estimate and should be supported by the selected rental comparables and analyst rationale.`);
    else if(finite(rentcastGap))parts.push('Expected rent is generally consistent with the RentCast estimate.');
    let action='';
    if(key==='resilient')action='Rent sensitivity supports proceeding, subject to confirming the selected rental comparables and the expected rent conclusion.';
    else if(key==='expected')action='Verify that the expected rent is achievable before relying on the investment conclusion; the downside rent case does not preserve all selected benchmarks.';
    else if(key==='high')action='Do not rely on the base investment conclusion without strong evidence that the high rent case is achievable and sustainable.';
    else if(key==='fail')action='Rework price, financing, expenses or return targets; rent upside by itself does not cure the modeled shortfall.';
    else action='Calculate the protected Low / Expected / High rent impacts before treating the market-rent conclusion as fully tested.';
    const lowIrr=low?.irr,highIrr=high?.irr,lowDcr=low?.dcr,highDcr=high?.dcr;
    return {key,label,tone,text:parts.join(' '),action,values:v,rows,lowPass,expectedPass,highPass,currentGap,rentcastGap,lowIrr,highIrr,lowDcr,highDcr};
  }

  function styles(){
    if(document.getElementById('ptMarketRentConclusionStyles'))return;
    const st=document.createElement('style');st.id='ptMarketRentConclusionStyles';st.textContent=`
      .ptmri-decision{margin-top:11px;border:1px solid #dce6ee;border-left:4px solid #5b87ad;border-radius:9px;padding:10px 11px;background:#f8fbfd}.ptmri-decision.good{border-left-color:#12b76a;background:#f6fef9}.ptmri-decision.warn{border-left-color:#f79009;background:#fffbf5}.ptmri-decision.bad{border-left-color:#f04438;background:#fff8f7}.ptmri-decision strong{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#667085}.ptmri-decision b{display:block;margin:3px 0;font-size:12px;color:#344054}.ptmri-decision p{margin:0;font-size:8.8px;line-height:1.5;color:#667085}
      #clientReport .ptmri-report-conclusion{margin:11px 0;padding:11px 13px;border-left:4px solid #5b87ad;background:#f5f9fc;border-radius:7px;font-size:9.2px;line-height:1.55;color:#475467}#clientReport .ptmri-report-conclusion.good{border-left-color:#12b76a;background:#f4fbf7}#clientReport .ptmri-report-conclusion.warn{border-left-color:#f79009;background:#fffbf3}#clientReport .ptmri-report-conclusion.bad{border-left-color:#f04438;background:#fff7f6}#clientReport .ptmri-report-conclusion b{display:block;margin-bottom:4px;color:#344054}
      @media print{#clientReport .ptmri-report-conclusion{font-size:7.2pt!important}}
    `;document.head.appendChild(st);
  }

  function enhanceDecision(){
    styles();const a=assessment(),card=document.getElementById('ptDecisionCenter');if(!a||!card)return false;
    card.querySelector('.ptmri-decision')?.remove();
    const host=card.querySelector('.ptdc-confidence')||card.querySelector('.ptdc-body');if(!host)return false;
    const box=document.createElement('div');box.className=`ptmri-decision ${a.tone}`;box.innerHTML=`<strong>Market Rent Resilience</strong><b>${esc(a.label)}</b><p>${esc(a.text)}</p>`;host.insertAdjacentElement('afterend',box);
    const constraint=card.querySelector('.ptdc-constraint');
    if(constraint&&['high','fail'].includes(a.key)){
      const b=constraint.querySelector('b'),p=constraint.querySelector('p');
      if(b&&/No single constraint/i.test(b.textContent||''))b.textContent='Market rent execution';
      if(p&&/Current pricing, income and return benchmarks/i.test(p.textContent||''))p.textContent=a.action;
    }
    return true;
  }

  function ensureList(box){let ul=box?.querySelector('ul');if(ul)return ul;if(!box)return null;box.querySelector('div')?.remove();ul=document.createElement('ul');box.appendChild(ul);return ul;}
  function enhanceThesis(){
    const a=assessment(),card=document.getElementById('ptInvestmentThesis');if(!a||!card)return false;
    const narrative=card.querySelector('.ptit-narrative');
    if(narrative&&!narrative.dataset.ptRentIntegrated){narrative.dataset.ptRentIntegrated='1';narrative.textContent=(narrative.textContent.trim()+' '+a.text).trim();}
    card.querySelectorAll('[data-pt-rent-thesis]').forEach(x=>x.remove());
    const boxes=card.querySelectorAll('.ptit-box');
    const target=(a.key==='resilient'?boxes[0]:boxes[1])||boxes[1]||boxes[0];
    const ul=ensureList(target);if(ul){const li=document.createElement('li');li.dataset.ptRentThesis='1';li.textContent=a.key==='resilient'?`Rent downside resilience: ${a.label}.`:`Market rent risk: ${a.label}. ${a.action}`;ul.insertBefore(li,ul.firstChild);}
    const strategy=card.querySelector('.ptit-strategy p');
    if(strategy&&!strategy.dataset.ptRentIntegrated){strategy.dataset.ptRentIntegrated='1';strategy.textContent=(strategy.textContent.trim()+' '+a.action).trim();}
    return true;
  }

  function enhanceReport(){
    styles();const a=assessment();if(!a)return false;
    const rentSection=document.querySelector('#clientReport .pt-market-rent-report');
    if(rentSection){rentSection.querySelector('.ptmri-report-conclusion')?.remove();const box=document.createElement('div');box.className=`ptmri-report-conclusion ${a.tone}`;box.innerHTML=`<b>Market Rent Risk Conclusion - ${esc(a.label)}</b>${esc(a.text)} ${esc(a.action)}`;const copy=rentSection.querySelector('.pt-rent-analysis-copy');if(copy)copy.insertAdjacentElement('afterend',box);else rentSection.prepend(box);}
    const exec=document.querySelector('#clientReport .rb-report > .rb-conclusion p');
    if(exec&&!exec.querySelector('[data-pt-rent-exec]')){const span=document.createElement('span');span.dataset.ptRentExec='1';span.textContent=' Market rent underwriting: '+a.text+' '+a.action;exec.appendChild(span);}
    return true;
  }

  function applyAll(){enhanceDecision();enhanceThesis();enhanceReport();}
  function schedule(){[0,60,160,320,650].forEach(ms=>setTimeout(applyAll,ms));}
  function wrapApi(obj,key,flag){const fn=obj?.[key];if(typeof fn!=='function'||fn[flag])return;const wrapped=function(...args){const out=fn.apply(this,args);Promise.resolve(out).finally(()=>setTimeout(applyAll,0));return out;};wrapped[flag]=true;wrapped.__original=fn;obj[key]=wrapped;}
  function install(){
    wrapApi(window.PropertyThesisDecisionCenter,'apply','__ptRentConclusionWrapped');
    wrapApi(window.PropertyThesisInvestmentThesis,'apply','__ptRentConclusionWrapped');
    wrapApi(window.ReportExecutiveConclusionCurrent,'apply','__ptRentConclusionWrapped');
    wrapApi(window.ReportMarketRentUnderwriting,'apply','__ptRentConclusionWrapped');
    const h=window.PropertyThesisResultsHydration;if(h&&typeof h.hydrate==='function'&&!h.hydrate.__ptRentConclusionWrapped){const original=h.hydrate;const wrapped=async function(){const out=await original.apply(this,arguments);applyAll();return out;};wrapped.__ptRentConclusionWrapped=true;wrapped.__original=original;h.hydrate=wrapped;}
    schedule();
  }
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="dashboard"],[data-tab="dashboard"],[data-s8-tab="report"],[data-tab="report"],[data-hub-open],[data-pt-open],[data-hub-report],[data-pt-report],#gwNext,#gwSave,#rbRefresh,#rbDownloadPdf,[data-ptru-impact],[data-ptr-use]'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.PropertyThesisMarketRentConclusion={version:VERSION,assessment,enhanceDecision,enhanceThesis,enhanceReport,applyAll,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
