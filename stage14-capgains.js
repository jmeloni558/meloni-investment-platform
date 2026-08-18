'use strict';
(() => {
  const VERSION=1;
  if((window.__stage14CapGainsVersion||0)>=VERSION)return;
  window.__stage14CapGainsVersion=VERSION;

  function injectStyles(){
    if(document.getElementById('stage14CapGainsStyles'))return;
    const st=document.createElement('style');
    st.id='stage14CapGainsStyles';
    st.textContent=`
      .cap-gains-line{position:relative;display:block;width:100%}
      .cap-gains-line input{width:100%;box-sizing:border-box;padding-right:34px!important;border-radius:6px!important}
      .cap-gains-percent{position:absolute;right:11px;top:50%;transform:translateY(-50%);display:block;color:#667085;font-weight:800;font-size:12px;line-height:1;pointer-events:none;background:transparent;border:0;padding:0;min-width:0}
      .cap-gains-note{display:block;margin:3px 0 5px;color:#667085;font-size:9px;line-height:1.35;font-weight:500}
      .guidance-box[data-guide="capGainRate"]{margin-top:7px!important;padding:9px 10px!important;border:1px solid #d9e4ee!important;border-radius:8px!important;background:#f8fbfd!important;color:#475467!important;font-size:10px!important;line-height:1.45!important;font-family:inherit!important;font-weight:400!important;letter-spacing:normal!important}
      .guidance-box[data-guide="capGainRate"] b{color:#174f83!important;font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="capGainRate"] p{margin:3px 0 0!important;font-size:inherit!important;line-height:1.45!important;font-family:inherit!important;font-weight:400!important}
      .guidance-box[data-guide="capGainRate"] strong{font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="capGainRate"] a{color:#175c92!important;font-weight:700!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="capGainRate"] a:hover{text-decoration:underline!important}
    `;
    document.head.appendChild(st);
  }

  function apply(){
    injectStyles();
    const input=document.getElementById('f_capGainRate'),field=input?.closest('.field');
    if(!input||!field)return false;
    const label=field.querySelector('label');if(label)label.textContent='Capital Gains Tax Rate (%)';
    if(!field.querySelector('.cap-gains-note')){
      const note=document.createElement('span');note.className='cap-gains-note';
      note.textContent='Estimated federal long-term capital gains tax rate applied to the non-depreciation portion of taxable gain on sale.';
      label?.insertAdjacentElement('afterend',note);
    }
    let line=input.closest('.cap-gains-line');
    if(!line){line=document.createElement('div');line.className='cap-gains-line';input.parentNode.insertBefore(line,input);line.appendChild(input);}
    if(!line.querySelector('.cap-gains-percent')){const pct=document.createElement('span');pct.className='cap-gains-percent';pct.textContent='%';line.appendChild(pct);}
    if(!field.querySelector('.guidance-box[data-guide="capGainRate"]')){
      const box=document.createElement('div');box.className='guidance-box';box.dataset.guide='capGainRate';
      box.innerHTML='<b>How to choose this assumption</b><p>For investment property held <strong>more than one year</strong>, the non-depreciation portion of taxable gain is generally subject to federal long-term capital-gains rates. The standard rates are generally <strong>0%, 15%, or 20%</strong>, depending on taxable income and filing status.</p><p><strong>15%</strong> remains a reasonable default for many investors, but it is not universal. Lower-income taxpayers may qualify for a 0% rate, while higher-income taxpayers may be subject to the 20% rate. The depreciation-related portion of gain is handled separately under the depreciation tax-rate assumption.</p><p>Additional taxes, including the Net Investment Income Tax, may also apply in some circumstances.</p><p><a href="https://www.irs.gov/taxtopics/tc409" target="_blank" rel="noopener">Review current capital gains tax rates with the IRS ↗</a></p>';
      field.appendChild(box);
    }
    return true;
  }

  function start(){let tries=0;const timer=setInterval(()=>{if(apply()||++tries>40)clearInterval(timer)},125);document.querySelector('[data-s8-tab="assumptions"]')?.addEventListener('click',()=>setTimeout(apply,0));}
  window.Stage14CapitalGainsGuidance={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();