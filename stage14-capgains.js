'use strict';
(() => {
  const VERSION=2;
  if((window.__stage14TaxGuidanceVersion||0)>=VERSION)return;
  window.__stage14TaxGuidanceVersion=VERSION;

  function injectStyles(){
    if(document.getElementById('stage14TaxGuidanceStyles'))return;
    const st=document.createElement('style');
    st.id='stage14TaxGuidanceStyles';
    st.textContent=`
      .tax-rate-line{position:relative;display:block;width:100%}
      .tax-rate-line input{width:100%;box-sizing:border-box;padding-right:34px!important;border-radius:6px!important}
      .tax-rate-percent{position:absolute;right:11px;top:50%;transform:translateY(-50%);display:block;color:#667085;font-weight:800;font-size:12px;line-height:1;pointer-events:none;background:transparent;border:0;padding:0;min-width:0}
      .tax-rate-note{display:block;margin:3px 0 5px;color:#667085;font-size:9px;line-height:1.35;font-weight:500}
      .tax-guide{margin-top:7px!important;padding:9px 10px!important;border:1px solid #d9e4ee!important;border-radius:8px!important;background:#f8fbfd!important;color:#475467!important;font-size:10px!important;line-height:1.45!important;font-family:inherit!important;font-weight:400!important;letter-spacing:normal!important}
      .tax-guide b{color:#174f83!important;font-size:inherit!important;font-family:inherit!important}
      .tax-guide p{margin:3px 0 0!important;font-size:inherit!important;line-height:1.45!important;font-family:inherit!important;font-weight:400!important}
      .tax-guide strong{font-size:inherit!important;font-family:inherit!important}
      .tax-guide a{color:#175c92!important;font-weight:700!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important}
      .tax-guide a:hover{text-decoration:underline!important}
    `;
    document.head.appendChild(st);
  }

  function wrapPercent(input){
    let line=input.closest('.tax-rate-line');
    if(!line){line=document.createElement('div');line.className='tax-rate-line';input.parentNode.insertBefore(line,input);line.appendChild(input);}
    if(!line.querySelector('.tax-rate-percent')){const pct=document.createElement('span');pct.className='tax-rate-percent';pct.textContent='%';line.appendChild(pct);}
  }

  function addNote(field,label,text){
    if(field.querySelector('.tax-rate-note[data-note="'+label+'"]'))return;
    const note=document.createElement('span');note.className='tax-rate-note';note.dataset.note=label;note.textContent=text;field.querySelector('label')?.insertAdjacentElement('afterend',note);
  }

  function addGuide(field,key,html){
    if(field.querySelector('.tax-guide[data-guide="'+key+'"]'))return;
    const box=document.createElement('div');box.className='guidance-box tax-guide';box.dataset.guide=key;box.innerHTML=html;field.appendChild(box);
  }

  function applyOrdinary(){
    const input=document.getElementById('f_ordinaryTax'),field=input?.closest('.field');if(!input||!field)return false;
    const label=field.querySelector('label');if(label)label.textContent='Ordinary Income Tax Rate (%)';
    input.step='1';input.inputMode='numeric';
    if(input.value.trim()!==''&&document.activeElement!==input){const v=Number(input.value);if(Number.isFinite(v))input.value=String(Math.round(v));}
    if(!input.dataset.wholeTaxPercent){input.dataset.wholeTaxPercent='1';input.addEventListener('blur',()=>{const v=Number(input.value);if(Number.isFinite(v))input.value=String(Math.round(v));});}
    wrapPercent(input);
    addNote(field,'ordinary','Estimated federal marginal ordinary income tax rate used for taxable operating income.');
    addGuide(field,'ordinaryTax','<b>How to choose this assumption</b><p>Use an estimate of the investor\'s <strong>federal marginal ordinary income tax rate</strong> based on taxable income and filing status. Federal tax brackets are progressive, so only the portion of income within a bracket is taxed at that bracket\'s rate.</p><p>For tax year 2026, individual federal marginal rates are <strong>10%, 12%, 22%, 24%, 32%, 35% and 37%</strong>. This model uses the selected rate as a simplified estimate; actual tax results can differ.</p><p><a href="https://www.irs.gov/filing/federal-income-tax-rates-and-brackets" target="_blank" rel="noopener">Look up current federal income tax rates and brackets with the IRS ↗</a></p>');
    return true;
  }

  function applyDep(){
    const input=document.getElementById('f_depTax'),field=input?.closest('.field');if(!input||!field)return false;
    const label=field.querySelector('label');if(label)label.textContent='Depreciation Tax Rate (%)';
    wrapPercent(input);
    addNote(field,'dep','Estimated federal rate applied to the depreciation-related portion of gain when the property is sold.');
    addGuide(field,'depTax','<b>How to choose this assumption</b><p>When depreciable real estate is sold at a gain, the depreciation-related portion is generally treated as <strong>unrecaptured Section 1250 gain</strong>. For individuals, that portion is taxed at a <strong>maximum federal rate of 25%</strong>.</p><p><strong>25%</strong> therefore remains a reasonable default for this model, although the investor\'s actual rate can be lower depending on taxable income and other circumstances.</p><p><a href="https://www.irs.gov/taxtopics/tc409" target="_blank" rel="noopener">Review capital-gain rates and unrecaptured Section 1250 gain with the IRS ↗</a></p>');
    return true;
  }

  function applyCap(){
    const input=document.getElementById('f_capGainsTax'),field=input?.closest('.field');if(!input||!field)return false;
    const label=field.querySelector('label');if(label)label.textContent='Capital Gains Tax Rate (%)';
    wrapPercent(input);
    addNote(field,'cap','Estimated federal long-term capital gains tax rate applied to the non-depreciation portion of taxable gain on sale.');
    addGuide(field,'capGainsTax','<b>How to choose this assumption</b><p>For investment property held <strong>more than one year</strong>, the non-depreciation portion of taxable gain is generally subject to federal long-term capital-gains rates of <strong>0%, 15%, or 20%</strong>, depending on taxable income and filing status.</p><p><strong>15%</strong> remains a reasonable default for many investors, but it is not universal. The depreciation-related portion of gain is handled separately by the depreciation tax-rate assumption.</p><p><a href="https://www.irs.gov/taxtopics/tc409" target="_blank" rel="noopener">Review current capital gains tax rates with the IRS ↗</a></p>');
    return true;
  }

  function apply(){injectStyles();const a=applyOrdinary(),b=applyDep(),c=applyCap();return a&&b&&c;}
  function start(){let tries=0;const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);document.querySelector('[data-s8-tab="assumptions"]')?.addEventListener('click',()=>setTimeout(apply,0));}
  window.Stage14TaxGuidance={apply,applyOrdinary,applyDep,applyCap};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();