'use strict';
(() => {
  const VERSION=1;
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
    `;
    document.head.appendChild(st);
  }

  function apply(){
    injectStyles();
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
    if(valuationCard){
      const h=valuationCard.querySelector(':scope > h2');
      if(h)h.textContent='Valuation Benchmarks';
    }
    return true;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="assumptions"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.Stage15Layout={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();