'use strict';
(() => {
  const VERSION=7;
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
      #s10ReviewResultsBottom{display:none!important}
      .finance-field-note,.valuation-field-note{display:block;margin:3px 0 5px;color:#667085;font-size:9px;line-height:1.35;font-weight:500}
      .mort-rate-line,.valuation-percent-line{position:relative;display:block;width:100%}
      .mort-rate-line input,.valuation-percent-line input{width:100%;box-sizing:border-box;padding-right:34px!important;border-radius:6px!important}
      .mort-rate-percent,.valuation-percent{position:absolute;right:11px;top:50%;transform:translateY(-50%);display:block;color:#667085;font-weight:800;font-size:12px;line-height:1;pointer-events:none;background:transparent;border:0;padding:0;min-width:0}
      .analysis-benchmark-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}
      .analysis-benchmark-grid .field{min-width:0}
      .analysis-benchmark-grid .address-setup-field{grid-column:1/-1;width:min(100%,720px);justify-self:center;text-align:center}
      .analysis-benchmark-grid .address-setup-field label{display:block;text-align:center}
      .analysis-benchmark-grid .address-setup-field input{text-align:center}
      .analysis-benchmark-grid .valuation-metric-field{display:grid;grid-template-rows:auto 42px auto;align-content:start}
      .analysis-benchmark-grid .valuation-metric-field .valuation-field-note{min-height:42px}
      .analysis-name-hidden{display:none!important}
      #financeFields .field:has(#f_mortgage),#financeFields .field:has(#f_interestOnly){display:grid;grid-template-rows:auto 42px auto;align-content:start}
      #financeFields .field:has(#f_mortgage) .finance-field-note,#financeFields .field:has(#f_interestOnly) .finance-field-note{min-height:42px}
      #taxFields .field:has(#f_ordinaryTax),#taxFields .field:has(#f_depTax){display:grid;grid-template-rows:auto 56px auto 1fr;align-content:start}
      #taxFields .field:has(#f_ordinaryTax) .tax-rate-note,#taxFields .field:has(#f_depTax) .tax-rate-note{min-height:56px}
      @media(max-width:900px){.analysis-benchmark-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){.analysis-benchmark-grid{grid-template-columns:1fr}.analysis-benchmark-grid .address-setup-field{grid-column:1}.analysis-benchmark-grid .valuation-metric-field{display:block}.analysis-benchmark-grid .valuation-metric-field .valuation-field-note{min-height:0}#financeFields .field:has(#f_mortgage),#financeFields .field:has(#f_interestOnly),#taxFields .field:has(#f_ordinaryTax),#taxFields .field:has(#f_depTax){display:block}#financeFields .field:has(#f_mortgage) .finance-field-note,#financeFields .field:has(#f_interestOnly) .finance-field-note,#taxFields .field:has(#f_ordinaryTax) .tax-rate-note,#taxFields .field:has(#f_depTax) .tax-rate-note{min-height:0}}
    `;
    document.head.appendChild(st);
  }

  function addFinanceNote(id,text){
    const input=document.getElementById(id),field=input?.closest('.field');
    if(!input||!field)return false;
    if(!field.querySelector('.finance-field-note')){
      const note=document.createElement('span');note.className='finance-field-note';note.textContent=text;
      field.querySelector('label')?.insertAdjacentElement('afterend',note);
    }
    return true;
  }

  function wrapPercent(input,lineClass,percentClass){
    let line=input.closest('.'+lineClass);
    if(!line){line=document.createElement('div');line.className=lineClass;input.parentNode.insertBefore(line,input);line.appendChild(input);}
    if(!line.querySelector('.'+percentClass)){const pct=document.createElement('span');pct.className=percentClass;pct.textContent='%';line.appendChild(pct);}
  }

  function applyFinanceGuidance(){
    const financeFields=document.getElementById('financeFields');if(!financeFields)return false;
    addFinanceNote('f_mortgage','Total loan amount used to finance the acquisition. Enter 0 for an all-cash purchase.');
    addFinanceNote('f_interestOnly','Select YES only when the loan requires interest payments without scheduled principal reduction during the loan term.');
    addFinanceNote('f_mortRate','Annual interest rate charged on the mortgage.');
    addFinanceNote('f_loanYears','Number of years used to amortize or model the mortgage balance and financing costs.');
    addFinanceNote('f_points','Upfront mortgage discount points; 1 point equals 1% of the mortgage amount.');
    addFinanceNote('f_origFee','Dollar amount of the lender origination fee paid at acquisition.');
    const rate=document.getElementById('f_mortRate');if(rate)wrapPercent(rate,'mort-rate-line','mort-rate-percent');
    const financeCard=financeFields.closest('.card');
    if(financeCard){[...financeCard.querySelectorAll(':scope > .inputnote')].forEach(note=>{if(/Mortgage points are entered as points/i.test(note.textContent||''))note.remove();});}
    return true;
  }

  function addValuationNote(input,text){
    const field=input?.closest('.field');if(!field)return;
    if(!field.querySelector('.valuation-field-note')){const note=document.createElement('span');note.className='valuation-field-note';note.textContent=text;field.querySelector('label')?.insertAdjacentElement('afterend',note);}
  }

  function applyValuationSetup(){
    const address=document.getElementById('f_address');
    const name=document.getElementById('f_name');
    const required=document.getElementById('f_requiredReturn');
    const cap=document.getElementById('f_desiredCap');
    const grm=document.getElementById('f_desiredGrm');
    const valuationFields=document.getElementById('valuationFields');
    if(!address||!required||!cap||!grm||!valuationFields)return false;

    const setupCard=address.closest('.card');if(!setupCard)return false;
    const propertyId=address.closest('.property-id');if(!propertyId)return false;
    propertyId.classList.add('analysis-benchmark-grid');

    if(name){const nf=name.closest('.field');if(nf)nf.classList.add('analysis-name-hidden');}
    const addressField=address.closest('.field');
    if(addressField){
      addressField.classList.add('address-setup-field');
      const label=addressField.querySelector('label');if(label)label.textContent='Property Address';
    }

    const requiredField=required.closest('.field'),capField=cap.closest('.field'),grmField=grm.closest('.field');
    [requiredField,capField,grmField].forEach(f=>{if(f){f.classList.add('valuation-metric-field');if(f.parentElement!==propertyId)propertyId.appendChild(f);}});

    const rLabel=requiredField?.querySelector('label');if(rLabel)rLabel.textContent='Required Rate of Return (%)';
    const cLabel=capField?.querySelector('label');if(cLabel)cLabel.textContent='Desired Capitalization Rate (%)';
    const gLabel=grmField?.querySelector('label');if(gLabel)gLabel.textContent='Desired Gross Rent Multiplier';

    wrapPercent(required,'valuation-percent-line','valuation-percent');
    wrapPercent(cap,'valuation-percent-line','valuation-percent');

    addValuationNote(required,'Minimum annual return the investor wants the property to achieve; used as the discount rate for NPV and as a return benchmark.');
    addValuationNote(cap,'Target market or investor cap rate used to convert Year 1 NOI into an indicated value. Higher cap rates generally imply lower values.');
    addValuationNote(grm,'Target ratio of property value to annual potential gross rent; used as a simplified income-based valuation benchmark.');

    const valuationCard=valuationFields.closest('.card');if(valuationCard&&valuationCard!==setupCard)valuationCard.classList.add('layout-hidden-card');
    return true;
  }

  function applyTaxLayout(){
    const financeFields=document.getElementById('financeFields');const taxFields=document.getElementById('taxFields');
    if(!financeFields||!taxFields)return false;
    const financeCard=financeFields.closest('.card');const taxCard=taxFields.closest('.card');if(!financeCard||!taxCard)return false;
    if(!financeCard.querySelector('.finance-tax-divider')){const divider=document.createElement('div');divider.className='finance-tax-divider';divider.innerHTML='<h2>Taxes</h2><p>Tax assumptions used for operating income and projected disposition.</p>';financeCard.appendChild(divider);}
    financeCard.appendChild(taxFields);
    if(taxCard!==financeCard)taxCard.classList.add('layout-hidden-card');
    return true;
  }

  function removeDuplicateReview(){document.getElementById('s10ReviewResultsBottom')?.remove();return true;}

  function apply(){injectStyles();removeDuplicateReview();const a=applyFinanceGuidance();const b=applyValuationSetup();const c=applyTaxLayout();return a&&b&&c;}
  function start(){let tries=0;const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);document.querySelector('[data-s8-tab="assumptions"]')?.addEventListener('click',()=>setTimeout(apply,0));}
  window.Stage15Layout={apply,applyFinanceGuidance,applyValuationSetup,applyTaxLayout,removeDuplicateReview};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();