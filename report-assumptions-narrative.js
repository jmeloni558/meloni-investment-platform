'use strict';
(() => {
  const VERSION=1;
  if((window.__reportAssumptionsNarrativeVersion||0)>=VERSION)return;
  window.__reportAssumptionsNarrativeVersion=VERSION;

  const money=v=>typeof fmtC==='function'?fmtC(v):(Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');
  const pct=(v,d=1)=>Number.isFinite(v)?(v*100).toFixed(d)+'%':'N/A';

  function copy(){
    const y1=result?.years?.[0];
    if(!y1)return[];
    const repairs=Math.max(0,Number(state?.initialRepairs)||0);
    const totalCost=(Number(state?.price)||0)+repairs;
    const first=`The operating model begins with an acquisition price of ${money(state.price)}${repairs>0?` plus ${money(repairs)} of initial repairs and improvements, for a total modeled project cost of ${money(totalCost)}`:''}. The property is modeled with ${Math.max(1,Math.round(Number(state.units)||1))} unit${Math.max(1,Math.round(Number(state.units)||1))===1?'':'s'} at ${money(state.rent)} per month${Math.max(1,Math.round(Number(state.units)||1))>1?' per unit':''}. A ${pct(state.vacancy)} vacancy and credit-loss allowance is applied before operating expenses, which are modeled at ${pct(state.opEx)} of effective gross income. Under those assumptions, Year 1 effective gross income is ${money(y1.egi)} and Year 1 NOI is ${money(y1.noi)}.`;
    const second=`The long-term projection assumes annual rent growth of ${pct(state.rentGrowth)}, property appreciation of ${pct(state.appreciation)}, and a ${Math.round(Number(state.hold)||0)}-year holding period. Selling expenses are modeled at ${pct(state.sellCost)}, while depreciation and tax assumptions affect after-tax cash flow and the eventual disposition proceeds. These are forward-looking underwriting assumptions rather than guarantees; achievable rent, vacancy, expenses, appreciation, financing and tax treatment should be validated for the specific property and investor before relying on the projected returns.`;
    return[first,second];
  }

  function apply(){
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)return;
    const section=[...report.querySelectorAll('.rb-section')].find(s=>/Acquisition\s*&\s*Operating\s*Assumptions/i.test(s.querySelector('.rb-section-head h2')?.textContent||s.querySelector('h2')?.textContent||''));
    if(!section)return;
    let box=section.querySelector(':scope > .rb-assumptions-analysis');
    if(!box){
      box=document.createElement('div');
      box.className='rb-analysis-copy rb-assumptions-analysis';
      const head=section.querySelector(':scope > .rb-section-head');
      if(head)head.insertAdjacentElement('afterend',box);else section.prepend(box);
    }
    box.innerHTML=copy().map(t=>`<p>${t}</p>`).join('');
  }

  if(window.ReportBuilderV8?.apply&&!window.ReportBuilderV8.__assumptionsNarrativeWrapped){
    const base=window.ReportBuilderV8.apply;
    window.ReportBuilderV8.apply=function(...args){const out=base.apply(this,args);queueMicrotask(apply);return out;};
    window.ReportBuilderV8.__assumptionsNarrativeWrapped=true;
  }
  apply();
  window.ReportAssumptionsNarrative={apply};
})();