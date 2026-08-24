'use strict';
(()=>{
  function upgrade(){
    const root=document.getElementById('ptSampleShowcase');
    if(!root)return false;
    const cards=root.querySelectorAll('.pt-sample-card');
    if(cards.length<2)return false;
    const first=cards[0], second=cards[1];
    const metrics=first.querySelector('.pt-sample-metrics');
    if(metrics)metrics.innerHTML=`
      <div class="pt-sample-metric"><span>Purchase Price</span><strong>$425,000</strong></div>
      <div class="pt-sample-metric"><span>Market Rent</span><strong>$4,750/mo</strong></div>
      <div class="pt-sample-metric"><span>Cap Rate</span><strong>8.1%</strong></div>
      <div class="pt-sample-metric"><span>Cash Flow</span><strong>$10,248/yr</strong></div>
      <div class="pt-sample-metric"><span>DSCR</span><strong>1.42x</strong></div>
      <div class="pt-sample-metric"><span>Analysis</span><strong>10-Year</strong></div>`;
    const oldBtn=first.querySelector('.pt-sample-btn');
    const oldComing=first.querySelector('.pt-sample-coming');
    if(oldBtn){
      oldBtn.disabled=false;oldBtn.style.cursor='pointer';oldBtn.textContent='Explore Sample Analysis';
      oldBtn.onclick=()=>window.open('sample-analysis.html','_blank','noopener');
    }
    if(oldComing){oldComing.textContent='';}
    if(!first.querySelector('[data-pt-proforma]')){
      const pf=document.createElement('button');pf.type='button';pf.className='pt-sample-btn';pf.dataset.ptProforma='1';pf.textContent='View Sample Pro Forma';pf.style.marginLeft='8px';pf.style.cursor='pointer';pf.onclick=()=>window.open('sample-pro-forma.html','_blank','noopener');
      oldBtn?.insertAdjacentElement('afterend',pf);
    }
    const reportBtn=second.querySelector('.pt-sample-btn');
    const reportComing=second.querySelector('.pt-sample-coming');
    if(reportBtn){reportBtn.disabled=false;reportBtn.style.cursor='pointer';reportBtn.textContent='Open Sample Report';reportBtn.onclick=()=>window.open('sample-report.html','_blank','noopener');}
    if(reportComing){reportComing.textContent='';}
    const p=root.querySelector('.pt-sample-heading p');
    if(p)p.textContent='Open a completed underwriting analysis, review the full pro forma, and see the client-ready report produced from the same sample property.';
    return true;
  }
  function start(){let n=0;const t=setInterval(()=>{if(upgrade()||++n>80)clearInterval(t)},125);setTimeout(upgrade,1200);setTimeout(upgrade,2500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();