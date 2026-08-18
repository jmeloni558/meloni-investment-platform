'use strict';
(() => {
  if((window.__reviewTaxesSaleVersion||0)>=1)return;
  window.__reviewTaxesSaleVersion=1;

  function money(v){
    if(typeof fmtC==='function')return fmtC(v);
    return Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A';
  }
  function percent(v){
    if(typeof fmtP==='function')return fmtP(v);
    return Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A';
  }

  function buildTable(){
    if(!result||!state)return '';
    const hold=Math.max(1,Math.round(state.hold||1));
    const gainRate=hold===1?state.ordinaryTax:state.capGainsTax;
    const taxesGain=result.gain*gainRate;
    const depTax=result.accDep*state.depTax;
    const rows=[
      ['Net Sales Price',money(result.netSale),''],
      ['− Book Value',money(result.book),''],
      ['= Gain (Loss) on Sale',money(result.gain),'subtotal'],
      ['× Applicable Gain Tax Rate',percent(gainRate),''],
      ['= Taxes Due on Gain/Loss',money(taxesGain),'subtotal'],
      ['Accumulated Depreciation',money(result.accDep),''],
      ['× Depreciation Tax Rate',percent(state.depTax),''],
      ['= Taxes Due on Depreciation',money(depTax),'subtotal'],
      ['Taxes Due on Sale',money(result.saleTax),'total']
    ];
    return `<div class="tablewrap"><table><thead><tr><th>Taxes Due on Sale</th><th>Year ${hold} of Ownership</th></tr></thead><tbody>${rows.map(([label,value,cls])=>`<tr class="${cls}"><td>${label}</td><td>${value}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function apply(){
    const cf=document.getElementById('reviewCashflowStatement');
    const grid=document.querySelector('#dashboard .grid');
    if(!cf||!grid||!result||!state)return false;

    let taxOps=document.getElementById('reviewTaxesOperations');
    let card=document.getElementById('reviewTaxesSale');
    if(!card){
      card=document.createElement('div');
      card.id='reviewTaxesSale';
      card.className='card span-12';
      if(taxOps&&taxOps.parentElement===grid)taxOps.insertAdjacentElement('afterend',card);
      else cf.insertAdjacentElement('afterend',card);
    }else if(taxOps&&taxOps.parentElement===grid&&card.previousElementSibling!==taxOps){
      taxOps.insertAdjacentElement('afterend',card);
    }
    card.classList.remove('span-4','span-5','span-6','span-7','span-8');
    card.classList.add('span-12');
    const hold=Math.max(1,Math.round(state.hold||1));
    card.innerHTML=`<div class="sectionhead"><div><h2>Taxes Due on Sale</h2><p>Disposition tax calculation from the original workbook. This applies only in the year the property is sold.</p></div><span class="badge">Sale in Year ${hold}</span></div>${buildTable()}`;
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reviewTaxesSaleWrapped){
    const wrapped=function(...args){
      const out=originalRender.apply(this,args);
      setTimeout(apply,0);
      return out;
    };
    wrapped.__reviewTaxesSaleWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReviewTaxesSale={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
