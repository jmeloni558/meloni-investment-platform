'use strict';
(() => {
  const VERSION=1;
  if((window.__reviewTotalInvestmentCashflowVersion||0)>=VERSION)return;
  window.__reviewTotalInvestmentCashflowVersion=VERSION;

  function money(v){
    if(typeof fmtC==='function')return fmtC(v);
    return Number.isFinite(v)?(v<0?'(':'')+Math.abs(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})+(v<0?')':''):'N/A';
  }
  function percent(v){
    if(typeof fmtP==='function')return fmtP(v);
    return Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A';
  }

  function buildTable(){
    if(!result?.years?.length||!Array.isArray(result.cfs))return '';
    const years=result.years;
    const headers=['Year 0',...years.map(y=>'Year '+y.year)];
    const initial=[result.initial,...years.map(()=>0)];
    const operating=[0,...years.map(y=>y.atcf)];
    const reversion=[0,...years.map((y,i)=>i===years.length-1?result.ater:0)];
    const total=result.cfs.slice(0,headers.length);
    const rows=[
      ['Initial Investment',initial,''],
      ['After-Tax Operating Cash Flow',operating,''],
      ['After-Tax Equity Reversion',reversion,'subtotal'],
      ['Total Investment Cash Flow',total,'total']
    ];
    return `<div class="tablewrap"><table><thead><tr><th>Investment Cash Flow</th>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,vals,cls])=>`<tr class="${cls}"><td>${label}</td>${vals.map(v=>`<td>${money(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function apply(){
    const grid=document.querySelector('#dashboard .grid');
    const anchor=document.getElementById('reviewTaxesSale')||document.getElementById('reviewTaxesOperations')||document.getElementById('reviewCashflowStatement');
    if(!grid||!anchor||!result?.years?.length)return false;
    let card=document.getElementById('reviewTotalInvestmentCashflow');
    if(!card){
      card=document.createElement('div');
      card.id='reviewTotalInvestmentCashflow';
      card.className='card span-12';
      anchor.insertAdjacentElement('afterend',card);
    }else if(card.previousElementSibling!==anchor){
      anchor.insertAdjacentElement('afterend',card);
    }
    card.classList.remove('span-4','span-5','span-6','span-7','span-8');
    card.classList.add('span-12');
    const hold=result.years.length;
    const irr=result.IRR;
    const npv=result.NPV;
    card.innerHTML=`<div class="sectionhead"><div><h2>Total Investment Cash Flow / IRR</h2><p>Audit trail of the cash-flow series used to calculate the investment's internal rate of return.</p></div><span class="badge">IRR ${percent(irr)}</span></div>${buildTable()}<div class="callout" style="margin-top:12px"><strong>Calculated IRR: ${percent(irr)}</strong><p>The IRR is calculated from the Year 0 initial investment, each year's after-tax operating cash flow, and the after-tax equity reversion added in Year ${hold}. NPV at the selected required return is ${money(npv)}.</p></div>`;
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reviewTotalInvestmentCashflowWrapped){
    const wrapped=function(...args){
      const out=originalRender.apply(this,args);
      setTimeout(apply,0);
      return out;
    };
    wrapped.__reviewTotalInvestmentCashflowWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReviewTotalInvestmentCashflow={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
