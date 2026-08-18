'use strict';
(() => {
  const VERSION=2;
  if((window.__stage13Version||0)>=VERSION)return;
  window.__stage13Version=VERSION;

  function injectStyles(){
    if(document.getElementById('stage13Styles'))return;
    const st=document.createElement('style');
    st.id='stage13Styles';
    st.textContent=`
      .rent-growth-line,.vacancy-line{display:flex;align-items:stretch;width:100%}
      .rent-growth-line input,.vacancy-line input{flex:1 1 auto;min-width:0;border-radius:6px 0 0 6px!important}
      .rent-growth-percent,.vacancy-percent{display:flex;align-items:center;justify-content:center;min-width:38px;padding:0 10px;border:1px solid var(--line);border-left:0;border-radius:0 6px 6px 0;background:#f2f4f7;color:#344054;font-weight:800;font-size:12px}
      .rent-growth-note,.vacancy-note{display:block;margin:3px 0 5px;color:#667085;font-size:9px;line-height:1.35;font-weight:500}
      .vacancy-guidance{margin-top:7px;padding:9px 10px;border:1px solid #d9e4ee;border-radius:8px;background:#f8fbfd;color:#475467;font-size:10px;line-height:1.45}
      .vacancy-guidance b{color:#174f83}.vacancy-guidance p{margin:3px 0 0}.vacancy-guidance a{color:#175c92;font-weight:700;text-decoration:none}.vacancy-guidance a:hover{text-decoration:underline}
    `;
    document.head.appendChild(st);
  }

  function normalizePercentInput(input,lineClass,percentClass){
    const oldWrap=input.closest('.percent-input-wrap');
    if(oldWrap){const parent=oldWrap.parentNode;parent.insertBefore(input,oldWrap);oldWrap.remove();}
    if(!input.closest('.'+lineClass)){
      const line=document.createElement('div');line.className=lineClass;
      input.parentNode.insertBefore(line,input);line.appendChild(input);
      const pct=document.createElement('span');pct.className=percentClass;pct.textContent='%';line.appendChild(pct);
    }
  }

  function applyRentGrowth(){
    const input=document.getElementById('f_rentGrowth');const field=input?.closest('.field');
    if(!input||!field)return false;
    const label=field.querySelector('label');if(label)label.textContent='Rent Increase Starting in Year 2 (%)';
    let note=field.querySelector('.rent-growth-note');
    if(!note){note=document.createElement('span');note.className='rent-growth-note';note.textContent='Enter the annual percentage change applied to the initial monthly rent beginning in Year 2.';label?.insertAdjacentElement('afterend',note);}
    normalizePercentInput(input,'rent-growth-line','rent-growth-percent');
    return true;
  }

  function applyVacancy(){
    const input=document.getElementById('f_vacancy');const field=input?.closest('.field');
    if(!input||!field)return false;
    const label=field.querySelector('label');if(label)label.textContent='Vacancy and Credit Losses (%)';
    let note=field.querySelector('.vacancy-note');
    if(!note){note=document.createElement('span');note.className='vacancy-note';note.textContent='Percentage of Potential Gross Income deducted for expected vacancy, turnover and uncollected rent.';label?.insertAdjacentElement('afterend',note);}
    normalizePercentInput(input,'vacancy-line','vacancy-percent');
    if(!field.querySelector('.vacancy-guidance')){
      const box=document.createElement('div');box.className='vacancy-guidance';
      box.innerHTML='<b>How to choose this assumption</b><p>Vacancy and credit losses are estimated as a percentage of <strong>Potential Gross Income</strong>. The assumption should reflect local rental demand, expected tenant turnover, lease-up time and the risk of unpaid rent. <strong>10%</strong> is a common conservative estimate for many investment-property analyses, but stronger rental markets may justify a lower figure while slower or higher-risk markets may warrant a higher percentage.</p><p>Use current local market evidence whenever available rather than relying only on the default.</p><p><a href="https://www.census.gov/acs/www/data/data-tables-and-tools/data-profiles/" target="_blank" rel="noopener">Research local rental vacancy rates with U.S. Census ACS Housing Data ↗</a></p>';
      field.appendChild(box);
    }
    return true;
  }

  function apply(){injectStyles();const a=applyRentGrowth(),b=applyVacancy();return a||b;}

  function start(){
    let tries=0;const timer=setInterval(()=>{if((applyRentGrowth()&&applyVacancy())||++tries>100)clearInterval(timer)},125);
    document.addEventListener('click',()=>setTimeout(apply,0));
    const host=document.getElementById('propertyFields');if(host)new MutationObserver(apply).observe(host,{childList:true,subtree:true});
  }

  window.Stage13AssumptionGuidance={apply,applyRentGrowth,applyVacancy};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
