'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV7Version||0)>=VERSION)return;
  window.__reportBuilderV7Version=VERSION;

  const RECON_KEY='meloni-review-reconciliation-v1';
  function money(v){return typeof fmtC==='function'?fmtC(v):(Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');}
  function pct(v,d=2){return Number.isFinite(v)?(v*100).toFixed(d)+'%':'N/A';}
  function mult(v){return Number.isFinite(v)?v.toFixed(2)+'x':'N/A';}
  function analysisKey(){const a=(state?.address||'').trim(),n=(state?.name||'').trim();return a||n||'current-analysis';}
  function recon(){try{return (JSON.parse(localStorage.getItem(RECON_KEY)||'{}')||{})[analysisKey()]||{};}catch(e){return {};}}

  function injectStyles(){
    if(document.getElementById('reportBuilderV7Styles'))return;
    const st=document.createElement('style');
    st.id='reportBuilderV7Styles';
    st.textContent=`
      #clientReport .rb-report{background:#f7f9fc!important;border:1px solid #d7e0e9!important;border-radius:16px!important;box-shadow:0 18px 48px rgba(25,49,78,.10)!important;overflow:hidden!important}
      #clientReport .rb-cover{padding:38px 38px 30px!important;background:linear-gradient(125deg,#123f6a 0%,#174f83 58%,#2a689e 100%)!important;color:#fff!important;border:0!important;position:relative!important}
      #clientReport .rb-cover:before{content:'';position:absolute;right:-80px;top:-110px;width:260px;height:260px;border:1px solid rgba(255,255,255,.12);border-radius:50%}
      #clientReport .rb-cover:after{content:''!important;position:absolute!important;left:38px!important;right:auto!important;bottom:0!important;width:86px!important;height:5px!important;background:#d7b66f!important;border-radius:4px!important}
      #clientReport .rb-brand{color:#dce9f5!important;font-size:10px!important;letter-spacing:.22em!important}
      #clientReport .rb-cover h1{color:#fff!important;font-size:34px!important;letter-spacing:-.035em!important;margin:10px 0 7px!important;max-width:700px}
      #clientReport .rb-cover .address{color:#e8f0f7!important;font-size:15px!important}
      #clientReport .rb-meta{margin-top:22px!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px 24px!important;color:#dce7f1!important;font-size:10px!important;max-width:760px}
      #clientReport .rb-meta b{color:#fff!important}
      #clientReport .rb-conclusion{margin:22px 28px 0!important;padding:20px 22px!important;background:#fff!important;border:1px solid #dbe4ed!important;border-left:5px solid #d7b66f!important;border-radius:12px!important;box-shadow:0 6px 18px rgba(25,49,78,.05)}
      #clientReport .rb-conclusion h2{font-size:15px!important;color:#163f65!important;letter-spacing:-.01em}
      #clientReport .rb-conclusion p{font-size:11.5px!important;line-height:1.7!important;color:#44546a!important}
      #clientReport .rb-findings{margin:14px 28px 0!important;padding:18px!important;background:#edf3f8!important;border:1px solid #d9e4ee!important;border-radius:12px!important}
      #clientReport .rb-findings h2{color:#163f65!important}
      #clientReport .rb-finding{background:#fff!important;border-color:#dbe4ed!important;box-shadow:0 3px 10px rgba(25,49,78,.035)}
      #clientReport .rb-finding.good{border-top:3px solid #2f855a!important}
      #clientReport .rb-finding.warn{border-top:3px solid #c77b30!important}
      #clientReport .rb-section{margin:14px 28px 0!important;padding:22px!important;background:#fff!important;border:1px solid #dde5ed!important;border-radius:12px!important;box-shadow:0 5px 16px rgba(25,49,78,.045)!important}
      #clientReport .rb-section-head{padding-bottom:10px!important;margin-bottom:13px!important;border-bottom:1px solid #e6ebf0!important}
      #clientReport .rb-section-head h2{font-size:16px!important;color:#163f65!important;letter-spacing:-.02em!important}
      #clientReport .rb-section-head p{font-size:9.5px!important;color:#728095!important}
      #clientReport .rb-stat{background:#f8fafc!important;border-color:#e1e7ed!important}
      #clientReport .rb-stat b{color:#174f83!important}
      #clientReport .rb-panel{background:#fbfcfe!important;border-color:#e0e7ee!important}
      #clientReport .rb-analysis-copy{margin:0 0 15px!important;padding:13px 15px!important;background:linear-gradient(90deg,#f1f6fa,#f8fbfd)!important;border-left:4px solid #5b87ad!important;border-radius:8px!important;color:#46566a!important;font-size:10.5px!important;line-height:1.65!important}
      #clientReport .rb-analysis-copy strong{color:#163f65!important}
      #clientReport .rb-tablewrap{border-color:#dbe3eb!important;background:#fff!important}
      #clientReport th{background:#eef3f7!important;color:#31465d!important}
      #clientReport tbody tr:nth-child(even){background:#fbfcfd}
      #clientReport .rb-footer{margin-top:18px!important;padding:16px 28px 20px!important;background:#153f66!important;color:#dbe6ef!important;border:0!important}
      #clientReport .rb-footer .rb-footer-brand{color:#fff!important}
      @media(max-width:700px){#clientReport .rb-meta{grid-template-columns:1fr!important}#clientReport .rb-section,#clientReport .rb-findings,#clientReport .rb-conclusion{margin-left:14px!important;margin-right:14px!important}}
      @media print{
        #clientReport .rb-report{background:#fff!important;border:0!important;box-shadow:none!important;border-radius:0!important}
        #clientReport .rb-cover{padding:20pt!important;background:#174f83!important}
        #clientReport .rb-cover h1{font-size:22pt!important}
        #clientReport .rb-cover:before{display:none!important}
        #clientReport .rb-cover:after{left:20pt!important;width:65pt!important;background:#d7b66f!important}
        #clientReport .rb-conclusion,#clientReport .rb-findings,#clientReport .rb-section{margin-left:0!important;margin-right:0!important;border-radius:0!important;box-shadow:none!important}
        #clientReport .rb-analysis-copy{font-size:7.5pt!important;line-height:1.45!important;padding:7pt 8pt!important;margin-bottom:8pt!important;background:#f4f7fa!important}
        #clientReport .rb-footer{margin-top:8pt!important;background:#174f83!important;color:#eaf1f7!important}
      }
    `;
    document.head.appendChild(st);
  }

  function valuationText(){
    const vals=[result?.capValue,result?.grmValue].filter(Number.isFinite);
    if(!vals.length)return 'The income approaches should be considered together with property-specific risks, market evidence and the investor’s return objectives.';
    const low=Math.min(...vals),high=Math.max(...vals),mid=(low+high)/2;
    const rd=recon(),rv=Number(rd.reconciled),ref=Number.isFinite(rv)&&rv>0?rv:mid;
    const diff=state.price-ref,rel=ref?Math.abs(diff/ref):NaN;
    let text=`The direct-capitalization and GRM methods indicate an income-supported range of ${money(low)} to ${money(high)}. `;
    text+=`The acquisition price of ${money(state.price)} is ${Number.isFinite(rel)?pct(rel,1):'N/A'} ${diff>0?'above':'below'} ${Number.isFinite(rv)&&rv>0?'the reconciled investment value':'the midpoint of the two income indications'}. `;
    text+=result.cap>=state.desiredCap?`The modeled ${pct(result.cap)} cap rate meets or exceeds the ${pct(state.desiredCap)} target cap rate.`:`The modeled ${pct(result.cap)} cap rate is below the ${pct(state.desiredCap)} target, indicating that price and/or income may need improvement to meet the selected benchmark.`;
    return text;
  }
  function financingText(){
    const y=result?.years?.[0];if(!y)return '';
    if(state.mortgage<=0)return 'The acquisition is modeled as an all-cash purchase, eliminating scheduled debt service and lender coverage risk. Returns therefore reflect property operations and disposition performance without financial leverage.';
    const ltv=state.price?state.mortgage/state.price:NaN,debtPct=y.noi?y.debt/y.noi:NaN;
    let text=`Financing represents ${pct(ltv,1)} of the acquisition price. Year 1 debt service is ${money(y.debt)}, equal to ${pct(debtPct,1)} of Year 1 NOI. `;
    text+=Number.isFinite(y.dcr)?`The resulting DSCR is ${mult(y.dcr)}, ${y.dcr>=1.25?'providing a generally comfortable margin above a 1.25x reference level':'which is below a commonly used 1.25x reference level and indicates tighter debt coverage'}. `:'';
    text+=state.interestOnly?'Because the loan is modeled as interest-only, scheduled principal reduction is limited and more of the investment’s equity growth depends on appreciation and sale proceeds.':'The amortizing structure reduces principal during the holding period, creating additional equity through loan paydown.';
    return text;
  }
  function operatingText(){
    const y=result?.years?.[0],last=result?.years?.at?.(-1);if(!y)return '';
    const noiMargin=y.egi?y.noi/y.egi:NaN;
    let text=`Year 1 potential gross income is ${money(y.pgi)}. After the ${pct(state.vacancy,1)} vacancy allowance and operating expenses equal to ${pct(state.opEx,1)} of EGI, Year 1 NOI is ${money(y.noi)}, a ${pct(noiMargin,1)} NOI margin on effective gross income. `;
    if(last&&last.year>1)text+=`With rent growth modeled at ${pct(state.rentGrowth,1)} annually beginning in Year 2, NOI grows to ${money(last.noi)} by Year ${last.year}. `;
    text+=`These results are particularly sensitive to the accuracy of the starting rent, vacancy allowance and operating-expense ratio.`;
    return text;
  }
  function dispositionText(){
    const gross=result?.grossSale,net=result?.netSale;let text=`At the end of the ${state.hold}-year holding period, the property is projected to sell for ${money(gross)} based on ${pct(state.appreciation,1)} annual appreciation. `;
    text+=`After selling expenses, projected net sale proceeds before debt and taxes are ${money(net)}. `;
    if(state.mortgage>0)text+=`The modeled loan payoff at sale is ${money(result.loanPayoff)}. `;
    text+=`Estimated taxes due on sale are ${money(result.saleTax)}, leaving after-tax equity reversion of ${money(result.ater)}. The disposition outcome is therefore materially dependent on the assumed appreciation rate, selling costs and tax assumptions.`;
    return text;
  }
  function returnsText(){
    const y=result?.years?.[0],eq=-result?.initial,coc=eq&&y?y.atcf/eq:NaN;
    let text=`The modeled investment produces an IRR of ${pct(result.IRR)} compared with the selected required return of ${pct(state.requiredReturn)}, and NPV of ${money(result.NPV)}. `;
    text+=Number.isFinite(result.IRR)&&result.IRR>=state.requiredReturn&&result.NPV>=0?'Both measures indicate that the modeled cash flows satisfy the selected return requirement. ':'One or more return measures fall below the selected benchmark, suggesting that price, income, financing or exit assumptions may need improvement. ';
    if(Number.isFinite(coc))text+=`Year 1 after-tax cash-on-cash return is ${pct(coc)}, based on an initial cash investment of ${money(eq)}. `;
    text+='IRR should be interpreted together with cash flow durability, debt coverage and the reasonableness of the resale assumptions rather than as a stand-alone decision metric.';
    return text;
  }

  const narrativeMap={valuation:valuationText,financing:financingText,operating:operatingText,disposition:dispositionText,returns:returnsText};
  function addNarratives(){
    if(!result||!state)return false;
    Object.entries(narrativeMap).forEach(([id,fn])=>{
      const section=document.querySelector(`#clientReport [data-rb-section="${id}"]`);
      if(!section)return;
      section.querySelector('.rb-analysis-copy')?.remove();
      const head=section.querySelector('.rb-section-head');
      const p=document.createElement('p');
      p.className='rb-analysis-copy';
      p.innerHTML=`<strong>Analysis:</strong> ${fn()}`;
      head?.insertAdjacentElement('afterend',p);
    });
    return true;
  }

  function polishLabels(){
    const report=document.querySelector('#clientReport .rb-report');if(!report)return false;
    const cover=report.querySelector('.rb-cover h1');if(cover)cover.textContent='Investment Property Analysis';
    const brand=report.querySelector('.rb-brand');if(brand)brand.textContent='MELONI REALTY • INVESTMENT ADVISORY';
    return true;
  }

  function apply(){injectStyles();polishLabels();addNarratives();return true;}
  function schedule(){setTimeout(apply,0);setTimeout(apply,90);setTimeout(apply,240);}
  const oldRender=window.ReportBuilderV1?.renderReport;
  if(typeof oldRender==='function'&&!oldRender.__pass7Wrapped){
    const wrapped=function(...args){const out=oldRender.apply(this,args);schedule();return out;};
    wrapped.__pass7Wrapped=true;window.ReportBuilderV1.renderReport=wrapped;
  }
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  const host=document.getElementById('report');
  if(host){new MutationObserver(()=>{if(document.querySelector('#clientReport .rb-report'))schedule();}).observe(host,{childList:true,subtree:true});}
  window.ReportBuilderV7={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
