'use strict';
(() => {
  const VERSION=2;
  if((window.__stage15LayoutVersion||0)>=VERSION)return;
  window.__stage15LayoutVersion=VERSION;

  function injectStyles(){
    if(document.getElementById('stage15LayoutStyles'))return;
    const st=document.createElement('style');
    st.id='stage15LayoutStyles';
    st.textContent=`
      .finance-tax-divider{margin:18px 0 12px;padding-top:16px;border-top:1px solid #e4e7ec}
      .finance-tax-divider h2{margin:0 0 4px}
      .finance-tax-divider p{margin:0;color:#667085;font-size:10px;line-height:1.4}
      .layout-hidden-card{display:none!important}
      .finance-field-note{display:block;margin:3px 0 5px;color:#667085;font-size:9px;line-height:1.35;font-weight:500}
      .mort-rate-line{position:relative;display:block;width:100%}
      .mort-rate-line input{width:100%;box-sizing:border-box;padding-right:34px!important;border-radius:6px!important}
      .mort-rate-percent{position:absolute;right:11px;top:50%;transform:translateY(-50%);display:block;color:#667085;font-weight:800;font-size:12px;line-height:1;pointer-events:none;background:transparent;border:0;padding:0;min-width:0}
    `;
    document.head.appendChild(st);
  }

  function addFinanceNote(id,text){
    const input=document.getElementById(id),field=input?.closest('.field');
    if(!input||!field)return false;
    if(!field.querySelector('.finance-field-note')){
      const note=document.createElement('span');
      note.className='finance-field-note';
      note.textContent=text;
      field.querySelector('label')?.insertAdjacentElement('afterend',note);
    }
    return true;
  }

  function applyFinanceGuidance(){
    const financeFields=document.getElementById('financeFields');
    if(!financeFields)return false;

    addFinanceNote('f_mortgage','Total loan amount used to finance the acquisition. Enter 0 for an all-cash purchase.');
    addFinanceNote('f_interestOnly','Select YES only when the loan requires interest payments without scheduled principal reduction during the loan term.');
    addFinanceNote('f_mortRate','Annual interest rate charged on the mortgage.');
    addFinanceNote('f_loanYears','Number of years used to amortize or model the mortgage balance and financing costs.');
    addFinanceNote('f_points','Upfront mortgage discount points; 1 point equals 1% of the mortgage amount.');
    addFinanceNote('f_origFee','Dollar amount of the lender origination fee paid at acquisition.');

    const rate=document.getElementById('f_mortRate');
    if(rate){
      let line=rate.closest('.mort-rate-line');
      if(!line){line=document.createElement('div');line.className='mort-rate-line';rate.parentNode.insertBefore(line,rate);line.appendChild(rate);}
      if(!line.querySelector('.mort-rate-percent')){const pct=document.createElement('span');pct.className='mort-rate-percent';pct.textContent='%';line.appendChild(pct);}
    }

    const financeCard=financeFields.closest('.card');
    if(financeCard){
      [...financeCard.querySelectorAll(':scope > .inputnote')].forEach(note=>{
        if(/Mortgage points are entered as points/i.test(note.textContent||''))note.remove();
      });
    }
    return true;
  }

  function applyLayout(){
    const financeFields=document.getElementById('financeFields');
    const taxFields=document.getElementById('taxFields');
    const valuationFields=document.getElementById('valuationFields');
    const requiredInput=document.getElementById('f_requiredReturn');
    if(!financeFields||!taxFields||!valuationFields||!requiredInput)return false;

    const requiredField=requiredInput.closest('.field');
    if(requiredField&&requiredField.parentElement!==valuationFields) valuationFields.appendChild(requiredField);

    const financeCard=financeFields.closest('.card');
    const taxCard=taxFields.closest('.card');
    if(!financeCard||!taxCard)return false;

    if(!financeCard.querySelector('.finance-tax-divider')){
      const divider=document.createElement('div');
      divider.className='finance-tax-divider';
      divider.innerHTML='<h2>Taxes</h2><p>Tax assumptions used for operating income and projected disposition.</p>';
      financeCard.appendChild(divider);
    }
    financeCard.appendChild(taxFields);

    if(taxCard!==financeCard) taxCard.classList.add('layout-hidden-card');

    const valuationCard=valuationFields.closest('.card');
    if(valuationCard){const h=valuationCard.querySelector(':scope > h2');if(h)h.textContent='Valuation Benchmarks';}
    return true;
  }

  function apply(){injectStyles();const a=applyFinanceGuidance();const b=applyLayout();return a&&b;}

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="assumptions"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.Stage15Layout={apply,applyFinanceGuidance,applyLayout};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();