'use strict';
(() => {
  const VERSION=1;
  if((window.__reviewFinancingSummaryVersion||0)>=VERSION)return;
  window.__reviewFinancingSummaryVersion=VERSION;

  function injectStyles(){
    if(document.getElementById('reviewFinancingSummaryStyles'))return;
    const st=document.createElement('style');
    st.id='reviewFinancingSummaryStyles';
    st.textContent=`
      #reviewFinancingSummary{grid-column:span 12}
      #reviewFinancingSummary .fin-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:12px}
      #reviewFinancingSummary .fin-box{border:1px solid #e1e6ed;border-radius:10px;background:#fafbfd;padding:11px;min-width:0}
      #reviewFinancingSummary .fin-box .label{font-size:9px;color:#667085;font-weight:750;line-height:1.3;text-transform:uppercase;letter-spacing:.03em}
      #reviewFinancingSummary .fin-box .value{font-size:17px;font-weight:800;letter-spacing:-.02em;margin-top:4px;color:#172033}
      #reviewFinancingSummary .fin-box .note{font-size:9px;color:#667085;line-height:1.35;margin-top:4px}
      #reviewFinancingSummary .fin-foot{margin-top:10px;color:#667085;font-size:10px;line-height:1.45}
      @media(max-width:1100px){#reviewFinancingSummary .fin-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){#reviewFinancingSummary .fin-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:480px){#reviewFinancingSummary .fin-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function money(v,d=0){
    if(typeof fmtC==='function')return fmtC(v,d);
    return Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:d,maximumFractionDigits:d}):'N/A';
  }
  function pct(v){
    if(typeof fmtP==='function')return fmtP(v);
    return Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A';
  }
  function multiple(v){
    if(typeof fmtX==='function')return fmtX(v);
    return Number.isFinite(v)?v.toFixed(2)+'x':'N/A';
  }
  function box(label,value,note=''){
    return `<div class="fin-box"><div class="label">${label}</div><div class="value">${value}</div>${note?`<div class="note">${note}</div>`:''}</div>`;
  }

  function apply(){
    injectStyles();
    const dashboard=document.getElementById('dashboard');
    const grid=dashboard?.querySelector('.grid');
    const anchor=document.getElementById('reviewReconciliation')||document.getElementById('reviewDecisionSummary');
    if(!dashboard||!grid||!anchor||!result||!state||!result.years?.length)return false;

    let card=document.getElementById('reviewFinancingSummary');
    if(!card){
      card=document.createElement('div');
      card.id='reviewFinancingSummary';
      card.className='card span-12';
      anchor.insertAdjacentElement('afterend',card);
    }else if(card.previousElementSibling!==anchor){
      anchor.insertAdjacentElement('afterend',card);
    }

    const y1=result.years[0];
    const hold=Math.max(1,Math.round(state.hold||1));
    const yearsInHold=result.years.filter(y=>y.year<=hold);
    const totalPrincipal=yearsInHold.reduce((sum,y)=>sum+(Number.isFinite(y.principal)?y.principal:0),0);
    const structure=state.mortgage>0?(state.interestOnly?'Interest Only':'Amortizing'):'All Cash';
    const monthlyPayment=state.mortgage>0?result.monthlyPayment:0;
    const saleBalance=Number.isFinite(result.loanPayoff)?result.loanPayoff:0;
    const horizon=state.mortgage>0?`${state.loanYears} years`:'N/A';

    const boxes=[
      box('Loan Amount',money(state.mortgage),state.mortgage>0?`${((state.mortgage/state.price)*100).toFixed(1)}% of acquisition price.`:'No mortgage financing modeled.'),
      box('Loan Structure',structure,state.mortgage>0?`${horizon}${state.interestOnly?' interest-only horizon.':' amortization horizon.'}`:'Property analyzed as an all-cash acquisition.'),
      box('Mortgage Rate',state.mortgage>0?pct(state.mortRate):'N/A',state.mortgage>0?`Monthly payment: ${money(monthlyPayment,2)}.`:''),
      box('Year 1 Debt Service',money(y1.debt),state.mortgage>0?`Annual scheduled mortgage payments.`:'No debt service.'),
      box('Year 1 DSCR',Number.isFinite(y1.dcr)?multiple(y1.dcr):'N/A',Number.isFinite(y1.dcr)?'Year 1 NOI divided by annual debt service.':'Not applicable without debt service.'),
      box('Year 1 Interest',money(y1.interest),state.mortgage>0?'Interest component of Year 1 debt service.':''),
      box('Year 1 Principal',money(y1.principal),state.interestOnly?'No scheduled principal reduction during the interest-only period.':'Principal reduction during Year 1.'),
      box('Loan Balance at Sale',money(saleBalance),`Modeled payoff in Year ${hold}.`),
      box('Principal Paid During Hold',money(totalPrincipal),`Scheduled principal reduction through Year ${hold}.`),
      box('Financing Costs',money((result.pointCost||0)+(state.origFee||0)),`Points: ${state.points||0}; origination fee: ${money(state.origFee||0)}.`)
    ].join('');

    card.innerHTML=`<div class="sectionhead"><div><h2>Debt & Financing Summary</h2><p>Compact financing audit based on the current loan assumptions and the audited debt-service calculation.</p></div><span class="badge">${structure}</span></div><div class="fin-grid">${boxes}</div><div class="fin-foot">Loan balance at sale is the amount deducted from disposition proceeds in the investment cash-flow model. Principal paid during the hold reflects scheduled principal reduction only.</div>`;
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reviewFinancingSummaryWrapped){
    const wrapped=function(...args){const out=originalRender.apply(this,args);setTimeout(apply,0);return out;};
    wrapped.__reviewFinancingSummaryWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReviewFinancingSummary={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
