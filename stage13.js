'use strict';
(() => {
  const VERSION=8;
  if((window.__stage13Version||0)>=VERSION)return;
  window.__stage13Version=VERSION;

  function injectStyles(){
    if(document.getElementById('stage13Styles'))return;
    const st=document.createElement('style');
    st.id='stage13Styles';
    st.textContent=`
      .rent-growth-line,.vacancy-line,.opex-line{position:relative;display:block;width:100%}
      .rent-growth-line input,.vacancy-line input,.opex-line input{width:100%;box-sizing:border-box;padding-right:34px!important;border-radius:6px!important}
      .rent-growth-percent,.vacancy-percent,.opex-percent{position:absolute;right:11px;top:50%;transform:translateY(-50%);display:block;color:#667085;font-weight:800;font-size:12px;line-height:1;pointer-events:none;background:transparent;border:0;padding:0;min-width:0}
      .rent-growth-note,.vacancy-note,.opex-note{display:block;margin:3px 0 5px;color:#667085;font-size:9px;line-height:1.35;font-weight:500}
      .guidance-box[data-guide="vacancy"],.guidance-box[data-guide="opEx"]{margin-top:7px!important;padding:9px 10px!important;border:1px solid #d9e4ee!important;border-radius:8px!important;background:#f8fbfd!important;color:#475467!important;font-size:10px!important;line-height:1.45!important;font-family:inherit!important;font-weight:400!important;letter-spacing:normal!important}
      .guidance-box[data-guide="vacancy"] b,.guidance-box[data-guide="opEx"] b{color:#174f83!important;font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="vacancy"] p,.guidance-box[data-guide="opEx"] p{margin:3px 0 0!important;font-size:inherit!important;line-height:1.45!important;font-family:inherit!important;font-weight:400!important}
      .guidance-box[data-guide="vacancy"] strong,.guidance-box[data-guide="opEx"] strong{font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="vacancy"] a,.guidance-box[data-guide="opEx"] a{color:#175c92!important;font-weight:700!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important}
      .guidance-box[data-guide="vacancy"] a:hover,.guidance-box[data-guide="opEx"] a:hover{text-decoration:underline!important}
    `;
    document.head.appendChild(st);
  }

  function normalizePercentInput(input,lineClass,percentClass){
    let line=input.closest('.'+lineClass);
    if(!line){line=document.createElement('div');line.className=lineClass;input.parentNode.insertBefore(line,input);line.appendChild(input);}
    let pct=line.querySelector('.'+percentClass);
    if(!pct){pct=document.createElement('span');pct.className=percentClass;pct.textContent='%';line.appendChild(pct);}
  }

  function applyRentGrowth(){
    const input=document.getElementById('f_rentGrowth'),field=input?.closest('.field');
    if(!input||!field)return false;
    const label=field.querySelector('label');if(label)label.textContent='Rent Increase Starting in Year 2 (%)';
    if(!field.querySelector('.rent-growth-note')){const note=document.createElement('span');note.className='rent-growth-note';note.textContent='Enter the annual percentage change applied to the initial monthly rent beginning in Year 2.';label?.insertAdjacentElement('afterend',note);}
    normalizePercentInput(input,'rent-growth-line','rent-growth-percent');
    return true;
  }

  function applyVacancy(){
    const input=document.getElementById('f_vacancy'),field=input?.closest('.field');
    if(!input||!field)return false;
    field.querySelectorAll('.vacancy-guidance').forEach(el=>el.remove());
    const label=field.querySelector('label');if(label)label.textContent='Vacancy and Credit Losses (%)';
    if(!field.querySelector('.vacancy-note')){const note=document.createElement('span');note.className='vacancy-note';note.textContent='Percentage of Potential Gross Income deducted for expected vacancy, turnover and uncollected rent.';label?.insertAdjacentElement('afterend',note);}
    normalizePercentInput(input,'vacancy-line','vacancy-percent');
    if(!field.querySelector('.guidance-box[data-guide="vacancy"]')){const box=document.createElement('div');box.className='guidance-box';box.dataset.guide='vacancy';box.innerHTML='<b>How to choose this assumption</b><p>Vacancy and credit losses are estimated as a percentage of <strong>Potential Gross Income</strong>. The assumption should reflect local rental demand, expected tenant turnover, lease-up time and the risk of unpaid rent. <strong>10%</strong> is a common conservative estimate for many investment-property analyses, but stronger rental markets may justify a lower figure while slower or higher-risk markets may warrant a higher percentage.</p><p>Use current local market evidence whenever available rather than relying only on the default.</p><p><a href="https://www.census.gov/acs/www/data/data-tables-and-tools/data-profiles/" target="_blank" rel="noopener">Research local rental vacancy rates with U.S. Census ACS Housing Data ↗</a></p>';field.appendChild(box);}
    return true;
  }

  function applyOpEx(){
    const input=document.getElementById('f_opEx'),field=input?.closest('.field');
    if(!input||!field)return false;
    const label=field.querySelector('label');if(label)label.textContent='Other Operating Expenses as % of EGI (%)';
    if(!field.querySelector('.opex-note')){const note=document.createElement('span');note.className='opex-note';note.textContent='Estimated operating expenses expressed as a percentage of Effective Gross Income.';label?.insertAdjacentElement('afterend',note);}
    normalizePercentInput(input,'opex-line','opex-percent');
    if(!field.querySelector('.guidance-box[data-guide="opEx"]')){
      const box=document.createElement('div');box.className='guidance-box';box.dataset.guide='opEx';
      box.innerHTML='<b>How to choose this assumption</b><p>This percentage is applied to <strong>Effective Gross Income (EGI)</strong> to estimate recurring operating costs before debt service and income taxes. Typical operating expenses may include <strong>property taxes, property insurance, repairs and maintenance, property management, utilities paid by the owner, HOA or association expenses, landscaping, pest control, and other routine ownership costs</strong>.</p><p>When detailed expense records are not available, <strong>30% to 40% of EGI</strong> is a commonly used estimating range for many residential investment properties. Actual expenses can vary materially by property type, age, insurance costs, taxes, management structure and local market conditions, so use actual or market-supported expenses whenever available.</p><p><a href="https://www.irs.gov/publications/p527" target="_blank" rel="noopener">Review common rental-property expenses in IRS Publication 527 ↗</a></p>';
      field.appendChild(box);
    }
    return true;
  }

  function apply(){injectStyles();const a=applyRentGrowth(),b=applyVacancy(),c=applyOpEx();return a&&b&&c;}

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>40)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="assumptions"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.Stage13AssumptionGuidance={apply,applyRentGrowth,applyVacancy,applyOpEx};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();