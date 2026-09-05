'use strict';
(()=>{
  const VERSION=2;
  if((window.__reportDetailOrderVersion||0)>=VERSION)return;
  window.__reportDetailOrderVersion=VERSION;

  const ORDER=[
    'includeAssumptions',
    'includeValuation',
    'includeFinancing',
    'includeOperating',
    'includeDetailedCashflow',
    'includeDisposition',
    'includeSaleTax',
    'includeTaxOperations',
    'includeReturns',
    'includeInvestmentCashflow',
    'offerAnalysis',
    'includeSensitivity'
  ];

  const LABELS={
    includeAssumptions:'Acquisition & Operating Assumptions',
    includeValuation:'Income-Based Valuation',
    includeFinancing:'Financing Summary',
    includeOperating:'Projected Operating Performance',
    includeDetailedCashflow:'Detailed Cash Flow Table',
    includeDisposition:'Disposition & Tax Summary',
    includeSaleTax:'Detailed Taxes Due on Sale',
    includeTaxOperations:'Detailed Taxes From Operations',
    includeReturns:'Investment Return Analysis',
    includeInvestmentCashflow:'Total Investment Cash Flow / IRR',
    includeSensitivity:'Sensitivity Analysis'
  };

  function apply(){
    const grid=document.querySelector('#rbControls .rb-toggle-grid');
    if(!grid)return false;
    const byKey={};
    grid.querySelectorAll('[data-rb-pref]').forEach(input=>{
      const label=input.closest('.rb-toggle');
      if(label)byKey[input.dataset.rbPref]=label;
    });
    byKey.offerAnalysis=grid.querySelector('.pt-offer-report-toggle');
    ORDER.forEach((key,index)=>{
      const label=byKey[key];
      if(!label)return;
      const text=label.querySelector('span');
      if(text&&LABELS[key])text.textContent=LABELS[key];
      label.dataset.reportOrder=String(index+1).padStart(2,'0');
      grid.appendChild(label);
    });
    let note=grid.parentElement.querySelector('.rb-report-order-note');
    if(!note){note=document.createElement('p');note.className='rb-report-order-note';grid.insertAdjacentElement('afterend',note);}
    note.textContent='Listed in PDF reading order, left to right. Detail tables appear within their parent sections. The opening summary, snapshot and final conclusion are included automatically.';
    return true;
  }

  function selectAll(e){
    const btn=e.target?.closest?.('#rbSelectAll');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const inputs=[...document.querySelectorAll('#rbControls [data-rb-pref],#rbControls [data-pt-offer-report]')];
    inputs.forEach(input=>{
      if(!input.checked){
        input.checked=true;
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
    setTimeout(apply,0);
    setTimeout(()=>window.ReportBuilderV9Controls?.apply?.(),20);
  }

  function schedule(){setTimeout(apply,0);setTimeout(apply,80);setTimeout(apply,220);}
  document.addEventListener('click',selectAll,true);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll'))schedule();
  },true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);

  window.ReportDetailOrder={apply,schedule,order:[...ORDER]};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
