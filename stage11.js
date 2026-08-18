'use strict';
(() => {
  const VERSION=1;
  if((window.__stage11Version||0)>=VERSION)return;
  window.__stage11Version=VERSION;

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
    const head=original?.closest('.sectionhead');
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

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>80)clearInterval(timer)},125);
    document.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.Stage11Step1={apply,reviewResults};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();