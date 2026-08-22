'use strict';
(() => {
  const VERSION=2;
  if((window.__reportBuilderV8Version||0)>=VERSION)return;
  window.__reportBuilderV8Version=VERSION;
  const RK='meloni-review-reconciliation-v1';
  const money=v=>typeof fmtC==='function'?fmtC(v):(Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');
  const pct=(v,d=2)=>Number.isFinite(v)?(v*100).toFixed(d)+'%':'N/A';
  const mult=v=>Number.isFinite(v)?v.toFixed(2)+'x':'N/A';
  const key=()=>((state?.address||'').trim()||(state?.name||'').trim()||'current-analysis');
  const recon=()=>{try{return (JSON.parse(localStorage.getItem(RK)||'{}')||{})[key()]||{};}catch(e){return {};}};

  function styles(){
    let s=document.getElementById('rbV8Styles');
    if(!s){s=document.createElement('style');s.id='rbV8Styles';document.head.appendChild(s);}
    s.textContent=`
    #clientReport .rb-report{background:#f6f8fb!important;border:1px solid #d7e0e9!important;border-radius:16px!important;box-shadow:0 18px 48px rgba(25,49,78,.10)!important;overflow:hidden!important}
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
    #clientReport .rb-analysis-copy{margin:0 0 15px!important;padding:13px 15px!important;background:linear-gradient(90deg,#f0f5f9,#f8fbfd)!important;border-left:4px solid #5b87ad!important;border-radius:8px!important;color:#46566a!important;font-size:10.5px!important;line-height:1.67!important}
    #clientReport .rb-analysis-copy strong{color:#163f65!important}
    #clientReport .rb-analysis-summary{background:linear-gradient(145deg,#fff,#f8fbff)!important;border-left:5px solid #2563eb!important}
    #clientReport .rb-summary-block{margin:0 0 14px;font-size:11px;line-height:1.72;color:#405269}
    #clientReport .rb-summary-block:last-child{margin-bottom:0}
    #clientReport .rb-summary-block strong{display:block;margin-bottom:3px;color:#173f66;font-size:11.2px}
    #clientReport .rb-conclusion-box{margin-top:12px;padding:14px 16px;border-radius:9px;background:#edf5ff;border:1px solid #cfe0f5;color:#314a64;font-size:10.7px;line-height:1.68}
    #clientReport .rb-conclusion-box strong{color:#123f6a}
    #clientReport .rb-tablewrap{border-color:#dbe3eb!important;background:#fff!important}#clientReport th{background:#eef3f7!important;color:#31465d!important}#clientReport tbody tr:nth-child(even){background:#fbfcfd}
    #clientReport .rb-footer{margin-top:18px!important;padding:16px 28px 20px!important;background:#153f66!important;color:#dbe6ef!important;border:0!important}#clientReport .rb-footer .rb-footer-brand{color:#fff!important}
    @media(max-width:700px){#clientReport .rb-section,#clientReport .rb-findings,#clientReport .rb-conclusion{margin-left:14px!important;margin-right:14px!important}}
    @media print{#clientReport .rb-report{background:#fff!important;border:0!important;box-shadow:none!important;border-radius:0!important}#clientReport .rb-conclusion,#clientReport .rb-findings,#clientReport .rb-section{margin-left:0!important;margin-right:0!important;border-radius:0!important;box-shadow:none!important}#clientReport .rb-analysis-copy{font-size:7.5pt!important;line-height:1.45!important;padding:7pt 8pt!important;margin-bottom:8pt!important;background:#f4f7fa!important}#clientReport .rb-summary-block{font-size:8.2pt!important;line-height:1.5!important;margin-bottom:8pt!important}#clientReport .rb-conclusion-box{font-size:7.8pt!important;line-height:1.5!important;padding:8pt!important}#clientReport .rb-footer{background:#174f83!important;color:#eaf1f7!important}}
    `;
  }

  function valueData(){
    const a=[result.capValue,result.grmValue].filter(Number.isFinite);
    if(!a.length)return {lo:NaN,hi:NaN,ref:NaN,diff:NaN,diffPct:NaN};
    const lo=Math.min(...a),hi=Math.max(...a),mid=(lo+hi)/2,rv=Number(recon().reconciled),ref=Number.isFinite(rv)&&rv>0?rv:mid,diff=state.price-ref,diffPct=ref?diff/ref:NaN;
    return {lo,hi,ref,diff,diffPct,hasRecon:Number.isFinite(rv)&&rv>0};
  }

  function summaryParts(){
    const y1=result.years?.[0],last=result.years?.at(-1),v=valueData();
    if(!y1)return [];
    const eq=-result.initial,coc=eq?y1.atcf/eq:NaN;
    const financed=state.mortgage>0,dscr=financed?y1.dcr:NaN;
    const capMeets=Number.isFinite(result.cap)&&result.cap>=state.desiredCap;
    const irrMeets=Number.isFinite(result.IRR)&&result.IRR>=state.requiredReturn;
    const npvMeets=Number.isFinite(result.NPV)&&result.NPV>=0;
    const operatingPositive=Number.isFinite(y1.atcf)&&y1.atcf>=0;
    const valGap=Number.isFinite(v.diffPct)?Math.abs(v.diffPct):NaN;
    const acquisitionSentence=Number.isFinite(v.ref)
      ?`The modeled acquisition price of ${money(state.price)} is ${pct(valGap,1)} ${v.diff>0?'above':'below'} ${v.hasRecon?'the reconciled investment value':'the midpoint of the income-based value indications'}. ${v.diff>0?'This means the investment case must be supported by stronger-than-current income performance, favorable financing, future appreciation, or some combination of these factors.':'This provides a purchase basis that is favorable relative to the modeled income support.'}`
      :`The acquisition is modeled at ${money(state.price)}. Income-based valuation support should be considered together with the operating and return metrics below.`;
    const operatingSentence=`Year 1 NOI is ${money(y1.noi)}, producing a ${pct(result.cap)} capitalization rate versus the selected ${pct(state.desiredCap)} target. ${capMeets?'On a capitalization-rate basis, the property meets the selected income benchmark.':'The starting income yield is below the selected capitalization-rate benchmark.'} ${operatingPositive?`After-tax operating cash flow is positive at ${money(y1.atcf)} in Year 1${Number.isFinite(coc)?`, equal to approximately ${pct(coc)} on the initial cash investment`:''}.`:`After-tax operating cash flow is negative at ${money(y1.atcf)} in Year 1, so the investor must contribute additional cash beyond the initial acquisition investment.`}`;
    let financingSentence;
    if(!financed){financingSentence='The acquisition is modeled without debt, so the return profile is driven entirely by property operations, appreciation, taxes and sale proceeds rather than financial leverage.';}
    else if(Number.isFinite(dscr)){
      financingSentence=`The proposed financing produces Year 1 debt service of ${money(y1.debt)} and a DSCR of ${mult(dscr)}. ${dscr>=1.25?'Operating income provides a generally comfortable margin above a 1.25x reference level.':dscr>=1?'Operations cover scheduled debt service, but with a relatively limited cushion.':'NOI does not fully cover scheduled debt service, confirming that the proposed leverage creates a cash-flow shortfall that must be funded by the investor.'}`;
    }else financingSentence=`The proposed financing produces Year 1 debt service of ${money(y1.debt)}. Debt coverage should be reviewed together with the operating cash flow because leverage materially affects the investment return.`;
    const returnSentence=`Over the ${state.hold}-year modeled holding period, the analysis produces an IRR of ${pct(result.IRR)} versus the selected ${pct(state.requiredReturn)} required return and an NPV of ${money(result.NPV)}. ${irrMeets&&npvMeets?'Both return measures support the investment under the selected assumptions.':!irrMeets&&!npvMeets?'Both measures fall below the selected return requirement, indicating that the modeled investment does not fully compensate the investor at the chosen hurdle rate.':'The return measures are mixed, so the investment should be evaluated with particular attention to the assumptions driving the result.'} ${last&&last.year>1?`By Year ${last.year}, annual after-tax operating cash flow is ${money(last.atcf)}.`:''}`;
    const dependence=(!operatingPositive||!capMeets||!irrMeets)
      ?`The investment therefore depends meaningfully on ${state.appreciation>0?'future appreciation, ':''}${financed&&!state.interestOnly?'mortgage principal reduction, ':''}and eventual resale proceeds rather than on current income alone.`
      :'The modeled return is supported by current operations as well as the projected value realized at disposition.';
    return [
      ['Executive Summary',`${acquisitionSentence} ${operatingSentence}`],
      ['Financing & Cash Flow',financingSentence],
      ['Long-Term Investment Case',`${returnSentence} ${dependence}`]
    ];
  }

  function overallConclusion(){
    const y1=result.years?.[0],v=valueData();if(!y1)return'';
    const capGood=result.cap>=state.desiredCap,irrGood=result.IRR>=state.requiredReturn,npvGood=result.NPV>=0,cfGood=y1.atcf>=0;
    const score=[capGood,irrGood,npvGood,cfGood].filter(Boolean).length;
    if(score>=4)return`Under the selected assumptions, the property demonstrates strong investment fundamentals: current income supports the selected capitalization benchmark, operating cash flow is positive, and both IRR and NPV meet the investor's return requirement. The principal risks remain the durability of rent, expenses, financing terms and the disposition assumptions.`;
    if(score>=2)return`The property presents a mixed investment profile. Some return or operating measures are supportive, while others remain below the selected benchmarks. The investment may still be appropriate for an investor who places value on long-term appreciation or equity growth, but the acquisition terms should be weighed carefully against the weaker metrics.`;
    const gap=Number.isFinite(v.diffPct)&&v.diff>0?` The acquisition price is also ${pct(Math.abs(v.diffPct),1)} above the central income-supported indication.`:'';
    return`Under the selected assumptions, the property does not perform strongly as a conventional cash-flow investment. Current income, operating cash flow and/or modeled return measures fall below the selected benchmarks.${gap} A lower acquisition basis, higher sustainable rent, reduced operating costs or more favorable financing would be needed to materially strengthen the investment case.`;
  }

  function valText(){const v=valueData();if(!Number.isFinite(v.lo))return'';return `The direct-capitalization and GRM methods indicate an income-supported range of ${money(v.lo)} to ${money(v.hi)}. The acquisition price of ${money(state.price)} is ${pct(Math.abs(v.diffPct),1)} ${v.diff>0?'above':'below'} ${v.hasRecon?'the reconciled investment value':'the midpoint of the two income indications'}. ${result.cap>=state.desiredCap?`The modeled ${pct(result.cap)} cap rate meets or exceeds the ${pct(state.desiredCap)} target cap rate.`:`The modeled ${pct(result.cap)} cap rate is below the ${pct(state.desiredCap)} target. This does not necessarily mean the property's residential market value equals the income indication; rather, it shows the price level supported by the modeled income under the selected investor benchmark.`}`;}
  function finText(){const y=result.years[0];if(state.mortgage<=0)return'The acquisition is modeled as an all-cash purchase, eliminating scheduled debt service and lender coverage risk. Returns therefore reflect property operations and disposition performance without financial leverage.';const ltv=state.price?state.mortgage/state.price:NaN,dp=y.noi?y.debt/y.noi:NaN,pi=Number.isFinite(y.principal)?y.principal:0;return `Financing represents ${pct(ltv,1)} of the acquisition price. Year 1 debt service is ${money(y.debt)}, equal to ${pct(dp,1)} of Year 1 NOI. The resulting DSCR is ${mult(y.dcr)}, ${y.dcr>=1.25?'providing a generally comfortable margin above a 1.25x reference level':y.dcr>=1?'covering the scheduled debt service but leaving a relatively limited cushion':'meaning property operations do not fully cover the scheduled debt service'}. ${state.interestOnly?'Because the loan is modeled as interest-only, equity growth depends more heavily on appreciation and sale proceeds.':`Approximately ${money(pi)} of Year 1 debt service reduces principal, so amortization contributes to equity growth in addition to any appreciation.`}`;}
  function opText(){const y=result.years[0],last=result.years.at(-1),m=y.egi?y.noi/y.egi:NaN;const trend=last&&last.year>1?last.atcf-y.atcf:0;return `Year 1 potential gross income is ${money(y.pgi)}. After the ${pct(state.vacancy,1)} vacancy allowance and operating expenses equal to ${pct(state.opEx,1)} of EGI, Year 1 NOI is ${money(y.noi)}, a ${pct(m,1)} NOI margin on effective gross income. ${last.year>1?`With rent growth modeled at ${pct(state.rentGrowth,1)} annually beginning in Year 2, NOI grows to ${money(last.noi)} and after-tax operating cash flow reaches ${money(last.atcf)} by Year ${last.year}. ${trend>0?'The operating position improves over the holding period as modeled rents rise.':trend<0?'The operating position weakens over the holding period under the selected assumptions.':'Operating cash flow remains generally level over the modeled period.'}`:''} The projection remains sensitive to achievable rent, vacancy and operating expenses.`;}
  function dispText(){const principalPaid=(result.years||[]).reduce((s,y)=>s+(Number.isFinite(y.principal)?y.principal:0),0);return `At the end of the ${state.hold}-year holding period, the property is projected to sell for ${money(result.grossSale)} based on ${pct(state.appreciation,1)} annual appreciation. After selling expenses, projected net sale proceeds before debt and taxes are ${money(result.netSale)}. ${state.mortgage>0?`The modeled loan payoff is ${money(result.loanPayoff)}${principalPaid>0?`, after approximately ${money(principalPaid)} of principal reduction during the holding period`:''}. `:''}Estimated taxes due on sale are ${money(result.saleTax)}, leaving after-tax equity reversion of ${money(result.ater)}. This portion of the return is materially dependent on the appreciation, selling-cost and tax assumptions and should not be viewed as guaranteed.`;}
  function retText(){const y=result.years[0],eq=-result.initial,coc=eq?y.atcf/eq:NaN,meets=Number.isFinite(result.IRR)&&result.IRR>=state.requiredReturn&&result.NPV>=0;return `The modeled investment produces an IRR of ${pct(result.IRR)} versus the selected required return of ${pct(state.requiredReturn)}, with NPV of ${money(result.NPV)}. ${meets?'Both measures indicate that the modeled cash flows satisfy the selected return requirement.':'One or more return measures fall below the selected benchmark, suggesting that price, income, financing or exit assumptions may need improvement.'} Year 1 after-tax cash-on-cash return is ${pct(coc)}, based on an initial cash investment of ${money(eq)}. ${y.atcf<0?'Because Year 1 operating cash flow is negative, the investor should also consider the ongoing capital required to carry the property during the hold.':'Positive operating cash flow contributes to the return before disposition.'} IRR should be considered together with cash-flow durability, debt coverage and the assumptions used for resale.`;}
  const map={valuation:valText,financing:finText,operating:opText,disposition:dispText,returns:retText};

  function addSummary(){
    const report=document.querySelector('#clientReport .rb-report');if(!report||!result?.years?.length)return;
    report.querySelector('[data-rb-section="analysisSummary"]')?.remove();
    const sec=document.createElement('section');sec.className='rb-section rb-analysis-summary';sec.dataset.rbSection='analysisSummary';
    sec.innerHTML=`<div class="rb-section-head"><h2>Investment Analysis Summary</h2><p>Interpretation of the modeled acquisition, operations, financing, valuation and return profile.</p></div>${summaryParts().map(([h,t])=>`<div class="rb-summary-block"><strong>${h}</strong>${t}</div>`).join('')}<div class="rb-conclusion-box"><strong>Investment Conclusion:</strong> ${overallConclusion()}</div>`;
    const findings=report.querySelector('.rb-findings'),firstSection=report.querySelector('.rb-section');
    if(findings)findings.insertAdjacentElement('afterend',sec);else if(firstSection)firstSection.insertAdjacentElement('beforebegin',sec);else report.appendChild(sec);
  }
  function narratives(){if(!result||!state)return;for(const [id,fn] of Object.entries(map)){const sec=document.querySelector(`#clientReport [data-rb-section="${id}"]`);if(!sec)continue;sec.querySelector('.rb-analysis-copy')?.remove();const p=document.createElement('p');p.className='rb-analysis-copy';p.innerHTML=`<strong>Analysis:</strong> ${fn()}`;sec.querySelector('.rb-section-head')?.insertAdjacentElement('afterend',p);}}
  function polish(){const r=document.querySelector('#clientReport .rb-report');if(!r)return;addSummary();narratives();}
  function apply(){styles();polish();return true;}
  function schedule(){setTimeout(apply,0);setTimeout(apply,90);setTimeout(apply,240);}
  const old=window.ReportBuilderV1?.renderReport;if(typeof old==='function'&&!old.__v8){const w=function(...a){const o=old.apply(this,a);schedule();return o};w.__v8=true;window.ReportBuilderV1.renderReport=w;}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.ReportBuilderV8={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
