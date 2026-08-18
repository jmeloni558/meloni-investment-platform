'use strict';
(() => {
  if((window.__reviewCashflowStatementVersion||0)>=1)return;
  window.__reviewCashflowStatementVersion=1;

  function money(v){
    if(typeof fmtC==='function')return fmtC(v);
    return Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A';
  }

  function buildTable(){
    if(!result?.years?.length)return '';
    const years=result.years;
    const headers=years.map(y=>`<th>Year ${y.year}</th>`).join('');
    const rows=[
      ['Potential Gross Income',y=>y.pgi,''],
      ['− Vacancy and Credit Losses',y=>y.vac,''],
      ['= Effective Gross Income',y=>y.egi,'subtotal'],
      ['− Operating Expenses',y=>y.opex,''],
      ['= Net Operating Income',y=>y.noi,'subtotal'],
      ['− Debt Service',y=>y.debt,''],
      ['= Before-Tax Cash Flow',y=>y.noi-y.debt,'subtotal'],
      ['− Taxes from Operations',y=>y.opTax,''],
      ['= After-Tax Cash Flow',y=>y.atcf,'total']
    ];
    return `<div class="tablewrap review-cf-tablewrap"><table class="review-cf-table"><thead><tr><th>After-Tax Cash Flow (ATCF)</th>${headers}</tr></thead><tbody>${rows.map(([label,getter,cls])=>`<tr class="${cls}"><td>${label}</td>${years.map(y=>`<td>${money(getter(y))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function apply(){
    const canvas=document.getElementById('cfChart');
    const card=canvas?.closest('.card')||document.getElementById('reviewCashflowStatement');
    if(!card||!result?.years?.length)return false;
    card.id='reviewCashflowStatement';
    card.classList.remove('span-7');
    card.classList.add('span-12');
    card.innerHTML=`<div class="sectionhead"><div><h2>Projected After-Tax Cash Flow</h2><p>Year-by-year income statement matching rows 34–43 of the original workbook.</p></div><span class="badge">${result.years.length}-Year Projection</span></div>${buildTable()}`;
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reviewCashflowStatementWrapped){
    const wrapped=function(...args){
      const out=originalRender.apply(this,args);
      setTimeout(apply,0);
      return out;
    };
    wrapped.__reviewCashflowStatementWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReviewCashflowStatement={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();