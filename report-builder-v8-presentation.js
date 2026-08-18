'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV8Version||0)>=VERSION)return;
  window.__reportBuilderV8Version=VERSION;
  const RK='meloni-review-reconciliation-v1';
  const money=v=>typeof fmtC==='function'?fmtC(v):(Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');
  const pct=(v,d=2)=>Number.isFinite(v)?(v*100).toFixed(d)+'%':'N/A';
  const mult=v=>Number.isFinite(v)?v.toFixed(2)+'x':'N/A';
  const key=()=>((state?.address||'').trim()||(state?.name||'').trim()||'current-analysis');
  const recon=()=>{try{return (JSON.parse(localStorage.getItem(RK)||'{}')||{})[key()]||{};}catch(e){return {};}};

  function styles(){
    if(document.getElementById('rbV8Styles'))return;
    const s=document.createElement('style');s.id='rbV8Styles';s.textContent=`
    #clientReport .rb-report{background:#f6f8fb!important;border:1px solid #d7e0e9!important;border-radius:16px!important;box-shadow:0 18px 48px rgba(25,49,78,.10)!important;overflow:hidden!important}
    #clientReport .rb-cover{padding:40px 40px 32px!important;background:linear-gradient(125deg,#123e68,#174f83 58%,#2d6b9f)!important;color:#fff!important;border:0!important;position:relative!important}
    #clientReport .rb-cover:before{content:'';position:absolute;right:-90px;top:-125px;width:285px;height:285px;border:1px solid rgba(255,255,255,.13);border-radius:50%}
    #clientReport .rb-cover:after{content:''!important;position:absolute!important;left:40px!important;right:auto!important;bottom:0!important;width:90px!important;height:5px!important;background:#d8b56d!important;border-radius:4px!important}
    #clientReport .rb-brand{color:#dbe8f3!important;font-size:10px!important;letter-spacing:.22em!important}
    #clientReport .rb-cover h1{color:#fff!important;font-size:34px!important;letter-spacing:-.035em!important;margin:10px 0 7px!important}
    #clientReport .rb-cover .address{color:#e9f1f7!important;font-size:15px!important}
    #clientReport .rb-meta{margin-top:22px!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px 24px!important;color:#dce7f1!important;font-size:10px!important;max-width:760px}
    #clientReport .rb-meta b{color:#fff!important}
    #clientReport .rb-conclusion{margin:22px 28px 0!important;padding:20px 22px!important;background:#fff!important;border:1px solid #dbe4ed!important;border-left:5px solid #d8b56d!important;border-radius:12px!important;box-shadow:0 6px 18px rgba(25,49,78,.05)}
    #clientReport .rb-conclusion h2{font-size:16px!important;color:#163f65!important}
    #clientReport .rb-conclusion p{font-size:11.5px!important;line-height:1.7!important;color:#43546a!important}
    #clientReport .rb-findings{margin:14px 28px 0!important;padding:18px!important;background:#edf3f8!important;border:1px solid #d8e3ec!important;border-radius:12px!important}
    #clientReport .rb-finding{background:#fff!important;border-color:#dbe4ed!important;box-shadow:0 3px 10px rgba(25,49,78,.035)}
    #clientReport .rb-finding.good{border-top:3px solid #2f855a!important}#clientReport .rb-finding.warn{border-top:3px solid #c77b30!important}
    #clientReport .rb-section{margin:14px 28px 0!important;padding:22px!important;background:#fff!important;border:1px solid #dde5ed!important;border-radius:12px!important;box-shadow:0 5px 16px rgba(25,49,78,.045)!important}
    #clientReport .rb-section-head{padding-bottom:10px!important;margin-bottom:13px!important;border-bottom:1px solid #e6ebf0!important}
    #clientReport .rb-section-head h2{font-size:16px!important;color:#163f65!important;letter-spacing:-.02em!important}
    #clientReport .rb-section-head p{font-size:9.5px!important;color:#728095!important}
    #clientReport .rb-stat{background:#f8fafc!important;border-color:#e1e7ed!important}#clientReport .rb-stat b{color:#174f83!important}
    #clientReport .rb-panel{background:#fbfcfe!important;border-color:#e0e7ee!important}
    #clientReport .rb-analysis-copy{margin:0 0 15px!important;padding:13px 15px!important;background:linear-gradient(90deg,#f0f5f9,#f8fbfd)!important;border-left:4px solid #5b87ad!important;border-radius:8px!important;color:#46566a!important;font-size:10.5px!important;line-height:1.65!important}
    #clientReport .rb-analysis-copy strong{color:#163f65!important}
    #clientReport .rb-tablewrap{border-color:#dbe3eb!important;background:#fff!important}#clientReport th{background:#eef3f7!important;color:#31465d!important}#clientReport tbody tr:nth-child(even){background:#fbfcfd}
    #clientReport .rb-footer{margin-top:18px!important;padding:16px 28px 20px!important;background:#153f66!important;color:#dbe6ef!important;border:0!important}#clientReport .rb-footer .rb-footer-brand{color:#fff!important}
    @media(max-width:700px){#clientReport .rb-meta{grid-template-columns:1fr!important}#clientReport .rb-section,#clientReport .rb-findings,#clientReport .rb-conclusion{margin-left:14px!important;margin-right:14px!important}}
    @media print{#clientReport .rb-report{background:#fff!important;border:0!important;box-shadow:none!important;border-radius:0!important}#clientReport .rb-cover{padding:20pt!important;background:#174f83!important}#clientReport .rb-cover:before{display:none!important}#clientReport .rb-cover:after{left:20pt!important;background:#d8b56d!important}#clientReport .rb-conclusion,#clientReport .rb-findings,#clientReport .rb-section{margin-left:0!important;margin-right:0!important;border-radius:0!important;box-shadow:none!important}#clientReport .rb-analysis-copy{font-size:7.5pt!important;line-height:1.45!important;padding:7pt 8pt!important;margin-bottom:8pt!important;background:#f4f7fa!important}#clientReport .rb-footer{background:#174f83!important;color:#eaf1f7!important}}
    `;document.head.appendChild(s);
  }
  function valText(){const a=[result.capValue,result.grmValue].filter(Number.isFinite);if(!a.length)return'';const lo=Math.min(...a),hi=Math.max(...a),mid=(lo+hi)/2,rv=Number(recon().reconciled),ref=Number.isFinite(rv)&&rv>0?rv:mid,d=state.price-ref,r=ref?Math.abs(d/ref):NaN;return `The direct-capitalization and GRM methods indicate an income-supported range of ${money(lo)} to ${money(hi)}. The acquisition price of ${money(state.price)} is ${pct(r,1)} ${d>0?'above':'below'} ${Number.isFinite(rv)&&rv>0?'the reconciled investment value':'the midpoint of the two income indications'}. ${result.cap>=state.desiredCap?`The modeled ${pct(result.cap)} cap rate meets or exceeds the ${pct(state.desiredCap)} target cap rate.`:`The modeled ${pct(result.cap)} cap rate is below the ${pct(state.desiredCap)} target, indicating that price and/or income may need improvement to meet the selected benchmark.`}`;}
  function finText(){const y=result.years[0];if(state.mortgage<=0)return'The acquisition is modeled as an all-cash purchase, eliminating scheduled debt service and lender coverage risk. Returns therefore reflect property operations and disposition performance without financial leverage.';const ltv=state.price?state.mortgage/state.price:NaN,dp=y.noi?y.debt/y.noi:NaN;return `Financing represents ${pct(ltv,1)} of the acquisition price. Year 1 debt service is ${money(y.debt)}, equal to ${pct(dp,1)} of Year 1 NOI. The resulting DSCR is ${mult(y.dcr)}, ${y.dcr>=1.25?'providing a generally comfortable margin above a 1.25x reference level':'which is below a commonly used 1.25x reference level and indicates tighter debt coverage'}. ${state.interestOnly?'Because the loan is modeled as interest-only, more of the investment’s equity growth depends on appreciation and sale proceeds.':'The amortizing structure creates additional equity through scheduled principal reduction.'}`;}
  function opText(){const y=result.years[0],last=result.years.at(-1),m=y.egi?y.noi/y.egi:NaN;return `Year 1 potential gross income is ${money(y.pgi)}. After the ${pct(state.vacancy,1)} vacancy allowance and operating expenses equal to ${pct(state.opEx,1)} of EGI, Year 1 NOI is ${money(y.noi)}, a ${pct(m,1)} NOI margin on effective gross income. ${last.year>1?`With rent growth modeled at ${pct(state.rentGrowth,1)} annually beginning in Year 2, NOI grows to ${money(last.noi)} by Year ${last.year}. `:''}These results are particularly sensitive to the starting rent, vacancy allowance and operating-expense ratio.`;}
  function dispText(){return `At the end of the ${state.hold}-year holding period, the property is projected to sell for ${money(result.grossSale)} based on ${pct(state.appreciation,1)} annual appreciation. After selling expenses, projected net sale proceeds before debt and taxes are ${money(result.netSale)}. ${state.mortgage>0?`The modeled loan payoff is ${money(result.loanPayoff)}. `:''}Estimated taxes due on sale are ${money(result.saleTax)}, leaving after-tax equity reversion of ${money(result.ater)}. The disposition result is materially dependent on appreciation, selling costs and tax assumptions.`;}
  function retText(){const y=result.years[0],eq=-result.initial,coc=eq?y.atcf/eq:NaN,meets=Number.isFinite(result.IRR)&&result.IRR>=state.requiredReturn&&result.NPV>=0;return `The modeled investment produces an IRR of ${pct(result.IRR)} versus the selected required return of ${pct(state.requiredReturn)}, with NPV of ${money(result.NPV)}. ${meets?'Both measures indicate that the modeled cash flows satisfy the selected return requirement.':'One or more return measures fall below the selected benchmark, suggesting that price, income, financing or exit assumptions may need improvement.'} Year 1 after-tax cash-on-cash return is ${pct(coc)}, based on an initial cash investment of ${money(eq)}. IRR should be considered together with cash-flow durability, debt coverage and the resale assumptions.`;}
  const map={valuation:valText,financing:finText,operating:opText,disposition:dispText,returns:retText};
  function narratives(){if(!result||!state)return;for(const [id,fn] of Object.entries(map)){const sec=document.querySelector(`#clientReport [data-rb-section="${id}"]`);if(!sec)continue;sec.querySelector('.rb-analysis-copy')?.remove();const p=document.createElement('p');p.className='rb-analysis-copy';p.innerHTML=`<strong>Analysis:</strong> ${fn()}`;sec.querySelector('.rb-section-head')?.insertAdjacentElement('afterend',p);}}
  function polish(){const r=document.querySelector('#clientReport .rb-report');if(!r)return;const b=r.querySelector('.rb-brand');if(b)b.textContent='MELONI REALTY • INVESTMENT ADVISORY';narratives();}
  function apply(){styles();polish();return true;}
  function schedule(){setTimeout(apply,0);setTimeout(apply,90);setTimeout(apply,240);}
  const old=window.ReportBuilderV1?.renderReport;if(typeof old==='function'&&!old.__v8){const w=function(...a){const o=old.apply(this,a);schedule();return o};w.__v8=true;window.ReportBuilderV1.renderReport=w;}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.ReportBuilderV8={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
