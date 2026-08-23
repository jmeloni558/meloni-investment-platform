'use strict';
(() => {
  const VERSION=1;
  if((window.__reviewTaxesOperationsVersion||0)>=VERSION)return;
  window.__reviewTaxesOperationsVersion=VERSION;

  function money(v){
    if(typeof fmtC==='function')return fmtC(v);
    return Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A';
  }

  function percent(v){
    if(typeof fmtP==='function')return fmtP(v);
    return Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A';
  }

  function pointsAmort(y){
    if(!state?.loanYears||y.year>state.loanYears)return 0;
    return (result?.pointCost||0)/state.loanYears;
  }

  function originationAmort(y){
    if(!state?.loanYears||y.year>state.loanYears)return 0;
    return (state?.origFee||0)/state.loanYears;
  }

  function buildTable(){
    if(!result?.years?.length)return '';
    const years=result.years;
    const headers=years.map(y=>`<th>Year ${y.year}</th>`).join('');
    const rows=[
      ['Net Operating Income',y=>money(y.noi),''],
      ['− Interest',y=>money(y.interest),''],
      ['− Depreciation',()=>money(result.depreciation),''],
      ['− Amortization of Points',y=>money(pointsAmort(y)),''],
      ['− Amortization of Origination Fee',y=>money(originationAmort(y)),''],
      ['= Taxable Income',y=>money(y.taxable),'subtotal'],
      ['× Ordinary Income Tax Rate',()=>percent(state.ordinaryTax),''],
      ['= Taxes from Operations',y=>money(y.opTax),'total']
    ];
    return `<div class="tablewrap"><table class="review-taxes-operations-table"><thead><tr><th>Taxes From Operations</th>${headers}</tr></thead><tbody>${rows.map(([label,getter,cls])=>`<tr class="${cls}"><td>${label}</td>${years.map(y=>`<td>${getter(y)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function apply(){
    const dashboard=document.getElementById('dashboard');
    const grid=dashboard?.querySelector('.grid');
    const cashflow=document.getElementById('reviewCashflowStatement');
    if(!grid||!cashflow||!result?.years?.length)return false;

    let card=document.getElementById('reviewTaxesOperations');
    if(!card){
      card=document.createElement('div');
      card.id='reviewTaxesOperations';
      card.className='card span-12';
      cashflow.insertAdjacentElement('afterend',card);
    }else if(card.previousElementSibling!==cashflow){
      cashflow.insertAdjacentElement('afterend',card);
    }

    card.classList.remove('span-4','span-5','span-6','span-7','span-8');
    card.classList.add('span-12');
    card.innerHTML=`<div class="sectionhead"><div><h2>Taxes From Operations</h2><p>Year-by-year operating-tax calculation matching rows 1–9 of the original Taxes From Operations worksheet.</p></div><span class="badge">${result.years.length}-Year Projection</span></div>${buildTable()}`;
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reviewTaxesOperationsWrapped){
    const wrapped=function(...args){
      const out=originalRender.apply(this,args);
      setTimeout(apply,0);
      return out;
    };
    wrapped.__reviewTaxesOperationsWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReviewTaxesOperations={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();