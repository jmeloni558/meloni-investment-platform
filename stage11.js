'use strict';
(() => {
  const VERSION=2;
  if((window.__stage11Version||0)>=VERSION)return;
  window.__stage11Version=VERSION;
  let startupApplied=false;

  function reviewResults(){
    try{
      if(typeof readFields==='function')readFields();
      if(typeof render==='function')render();
      if(typeof setStatus==='function')setStatus('Analysis updated — review the results');
      switchTab('dashboard');
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){
      if(typeof setStatus==='function')setStatus('Please review the analysis inputs: '+e.message);
    }
  }

  function apply(){
    const sec=document.getElementById('assumptions');
    if(!sec)return false;
    const original=document.getElementById('calculateBtn');
    const head=original?.closest('.sectionhead')||sec.querySelector('.sectionhead');
    if(!head)return false;

    const title=head.querySelector('h2');
    const text=head.querySelector('p');
    if(title)title.textContent='Analysis Setup';
    if(text)text.textContent='Enter the property information and investment assumptions below. When finished, click Review Results.';

    const actions=head.querySelector('.actions');
    if(actions){
      actions.innerHTML='<button class="btn primary" id="guidedReviewResults" type="button">Review Results →</button>';
      document.getElementById('guidedReviewResults').onclick=reviewResults;
    }

    let bottom=document.getElementById('guidedReviewResultsBottom');
    if(!bottom){
      bottom=document.createElement('div');
      bottom.id='guidedReviewResultsBottom';
      bottom.className='card span-12 screen-only';
      bottom.innerHTML='<div class="sectionhead"><div><h2>Ready to review?</h2><p>Your inputs will be recalculated automatically before opening Step 2.</p></div><button class="btn primary" id="guidedReviewResultsBottomBtn" type="button">Review Results →</button></div>';
      sec.querySelector('.grid')?.appendChild(bottom);
    }
    const b=document.getElementById('guidedReviewResultsBottomBtn');if(b)b.onclick=reviewResults;

    const help=sec.querySelector('.s8-help');
    if(help){const strong=help.querySelector('strong'),p=help.querySelector('p');if(strong)strong.textContent='Step 1 — Analysis Setup';if(p)p.textContent='Enter the property name, address and investment assumptions, then click Review Results to continue.';}
    return true;
  }

  function applyFreshStartup(){
    if(startupApplied)return;
    const required=['f_name','f_address','f_price','f_land','f_units','f_rent','f_loanYears'];
    if(!required.every(id=>document.getElementById(id)))return;
    startupApplied=true;

    selectedClientId=null;selectedPropertyId=null;selectedAnalysisId=null;selectedScenarioId=null;
    state.name='';state.address='';state.price=0;state.land=0;state.units=1;state.rent=0;state.loanYears=30;

    document.getElementById('f_name').value='';
    document.getElementById('f_address').value='';
    document.getElementById('f_price').value='';
    document.getElementById('f_land').value='';
    document.getElementById('f_units').value='';
    document.getElementById('f_rent').value='';
    document.getElementById('f_loanYears').value='30';
    const quickName=document.getElementById('propertyName');if(quickName)quickName.value='';
    const quickPrice=document.getElementById('quickPrice');if(quickPrice)quickPrice.value='';
    const quickRent=document.getElementById('quickRent');if(quickRent)quickRent.value='';

    switchTab('assumptions');
    window.Stage8Workflow?.refresh?.();
    window.Stage10Workflow?.refresh?.();
    setTimeout(()=>document.getElementById('f_name')?.focus(),80);
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{
      apply();
      applyFreshStartup();
      if((startupApplied&&apply())||++tries>100)clearInterval(timer);
    },125);
    document.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.Stage11Step1={apply,reviewResults,applyFreshStartup};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();