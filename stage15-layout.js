'use strict';
(() => {
  const VERSION=12;
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
      #assumptions .s8-help,#dashboard .s8-help{display:none!important}
      .finance-field-note,.valuation-field-note{display:block;margin:3px 0 5px;color:#667085;font-size:9px;line-height:1.35;font-weight:500}
      .mort-rate-line,.valuation-percent-line{position:relative;display:block;width:100%}
      .mort-rate-line input,.valuation-percent-line input{width:100%;box-sizing:border-box;padding-right:34px!important;border-radius:6px!important}
      .mort-rate-percent,.valuation-percent{position:absolute;right:11px;top:50%;transform:translateY(-50%);display:block;color:#667085;font-weight:800;font-size:12px;line-height:1;pointer-events:none;background:transparent;border:0;padding:0;min-width:0}
      .guidance-box[data-guide="rentGrowth"]{margin-top:7px!important;padding:9px 10px!important;border:1px solid #d9e4ee!important;border-radius:8px!important;background:#f8fbfd!important;color:#475467!important;font-size:10px!important;line-height:1.45!important;font-family:inherit!important;font-weight:400!important;letter-spacing:normal!important}
      .guidance-box[data-guide="rentGrowth"] b{color:#174f83!important;font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="rentGrowth"] p{margin:3px 0 0!important;font-size:inherit!important;line-height:1.45!important;font-family:inherit!important;font-weight:400!important}
      .guidance-box[data-guide="rentGrowth"] strong{font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="rentGrowth"] a{color:#175c92!important;font-weight:700!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="rentGrowth"] a:hover{text-decoration:underline!important}
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
      #reviewAnalysisSetup{margin-bottom:0}
      #reviewAnalysisSetup .sectionhead{align-items:flex-start}
      #reviewAnalysisSetup .sectionhead .actions{display:flex!important;align-items:center;gap:8px}
      #reviewAnalysisSetup .analysis-benchmark-grid{margin-top:12px}
      #reviewSaveCloud{white-space:nowrap}
      @media(max-width:900px){.analysis-benchmark-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){.analysis-benchmark-grid{grid-template-columns:1fr}.analysis-benchmark-grid .address-setup-field{grid-column:1}.analysis-benchmark-grid .valuation-metric-field{display:block}.analysis-benchmark-grid .valuation-metric-field .valuation-field-note{min-height:0}#financeFields .field:has(#f_mortgage),#financeFields .field:has(#f_interestOnly),#taxFields .field:has(#f_ordinaryTax),#taxFields .field:has(#f_depTax){display:block}#financeFields .field:has(#f_mortgage) .finance-field-note,#financeFields .field:has(#f_interestOnly) .finance-field-note,#taxFields .field:has(#f_ordinaryTax) .tax-rate-note,#taxFields .field:has(#f_depTax) .tax-rate-note{min-height:0}#reviewAnalysisSetup .sectionhead{display:block}#reviewAnalysisSetup .sectionhead .actions{margin-top:10px}}
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

  function applyRentGrowthGuidance(){
    const input=document.getElementById('f_rentGrowth'),field=input?.closest('.field');
    if(!input||!field)return false;
    if(!field.querySelector('.guidance-box[data-guide="rentGrowth"]')){
      const box=document.createElement('div');
      box.className='guidance-box';
      box.dataset.guide='rentGrowth';
      box.innerHTML='<b>How to choose this assumption</b><p>This is the annual percentage change applied to the starting monthly rent beginning in <strong>Year 2</strong>, and it compounds in later years. Enter <strong>2%</strong> for 2% annual rent growth, <strong>0%</strong> for no growth, or a negative percentage if rents are expected to decline.</p><p>Use recent local rent trends, lease renewals and competing rental data when available. A conservative assumption is appropriate when future rent growth is uncertain.</p><p><a href="https://www.zillow.com/research/data/" target="_blank" rel="noopener">Research rent trends with Zillow Observed Rent Index data ↗</a></p>';
      field.appendChild(box);
    }
    return true;
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

  function syncReviewSetup(){
    const map=['f_address','f_requiredReturn','f_desiredCap','f_desiredGrm'];
    for(const id of map){
      const source=document.getElementById(id),mirror=document.getElementById('review_'+id);
      if(source&&mirror&&document.activeElement!==mirror)mirror.value=source.value;
    }
  }

  function wireReviewSetup(){
    const map=['f_address','f_requiredReturn','f_desiredCap','f_desiredGrm'];
    for(const id of map){
      const source=document.getElementById(id),mirror=document.getElementById('review_'+id);
      if(!source||!mirror)continue;
      if(!source.dataset.reviewSync){
        source.dataset.reviewSync='1';
        source.addEventListener('input',()=>{const m=document.getElementById('review_'+id);if(m&&document.activeElement!==m)m.value=source.value;});
      }
      if(!mirror.dataset.sourceSync){
        mirror.dataset.sourceSync='1';
        mirror.addEventListener('input',()=>{source.value=mirror.value;});
        mirror.addEventListener('change',()=>{
          source.value=mirror.value;
          try{if(typeof readFields==='function')readFields();if(typeof render==='function')render();}catch(e){}
          setTimeout(syncReviewSetup,0);
        });
      }
    }
  }

  async function saveReviewToCloud(){
    if(typeof saveCurrentCloud!=='function'){
      if(typeof setStatus==='function')setStatus('Cloud save is not available yet.');
      return;
    }
    const signedIn=!!window.cloudUser||typeof cloudUser!=='undefined'&&!!cloudUser;
    await saveCurrentCloud(false);
    if(signedIn){
      try{if(typeof switchTab==='function')switchTab('dashboard')}catch(e){}
      setTimeout(()=>{apply();syncReviewSetup();},0);
    }
  }

  function wireReviewCloudSave(){
    const btn=document.getElementById('reviewSaveCloud');
    if(btn&&!btn.dataset.wired){btn.dataset.wired='1';btn.addEventListener('click',saveReviewToCloud);}
  }

  function applyReviewSetup(){
    const dashboard=document.getElementById('dashboard');
    const sourceAddress=document.getElementById('f_address');
    const sourceCard=sourceAddress?.closest('.card');
    const grid=dashboard?.querySelector('.grid');
    if(!dashboard||!sourceCard||!grid)return false;

    const oldQuick=dashboard.querySelector('.quickbar')?.closest('.card');
    if(oldQuick)oldQuick.classList.add('layout-hidden-card');

    let review=document.getElementById('reviewAnalysisSetup');
    if(!review){
      review=sourceCard.cloneNode(true);
      review.id='reviewAnalysisSetup';
      review.classList.add('span-12');
      review.querySelectorAll('[id]').forEach(el=>{el.id='review_'+el.id;});
      let actions=review.querySelector('.sectionhead .actions');
      if(!actions){actions=document.createElement('div');actions.className='actions';review.querySelector('.sectionhead')?.appendChild(actions);}
      actions.innerHTML='<button class="btn primary" id="reviewSaveCloud" type="button">Save Analysis to Cloud</button>';
      const p=review.querySelector('.sectionhead p');
      if(p)p.textContent='Desired valuation benchmarks carried forward from Analysis Setup for direct comparison with the calculated results below.';
      const hiddenName=review.querySelector('.analysis-name-hidden');if(hiddenName)hiddenName.remove();
      grid.insertBefore(review,grid.firstChild);
    }else if(!document.getElementById('reviewSaveCloud')){
      let actions=review.querySelector('.sectionhead .actions');
      if(!actions){actions=document.createElement('div');actions.className='actions';review.querySelector('.sectionhead')?.appendChild(actions);}
      actions.innerHTML='<button class="btn primary" id="reviewSaveCloud" type="button">Save Analysis to Cloud</button>';
    }
    syncReviewSetup();
    wireReviewSetup();
    wireReviewCloudSave();
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

  function apply(){injectStyles();removeDuplicateReview();const r=applyRentGrowthGuidance();const a=applyFinanceGuidance();const b=applyValuationSetup();const c=applyTaxLayout();const d=applyReviewSetup();return r&&a&&b&&c&&d;}
  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="assumptions"]')?.addEventListener('click',()=>setTimeout(apply,0));
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(()=>{apply();syncReviewSetup();},0));
  }
  window.Stage15Layout={apply,applyRentGrowthGuidance,applyFinanceGuidance,applyValuationSetup,applyReviewSetup,applyTaxLayout,removeDuplicateReview,syncReviewSetup,saveReviewToCloud};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();