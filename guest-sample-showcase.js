'use strict';
(()=>{
  function openSample(path){window.open(path,'_blank','noopener');}
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

    let actions=first.querySelector('.pt-sample-live-actions');
    if(!actions){
      first.querySelector('.pt-sample-btn')?.remove();
      first.querySelector('.pt-sample-coming')?.remove();
      actions=document.createElement('div');
      actions.className='pt-sample-live-actions';
      actions.style.display='flex';actions.style.gap='8px';actions.style.flexWrap='wrap';
      actions.innerHTML='<button type="button" class="pt-sample-btn" data-pt-analysis>Explore Sample Analysis</button><button type="button" class="pt-sample-btn" data-pt-proforma>View Sample Pro Forma</button>';
      first.appendChild(actions);
    }
    const analysisBtn=first.querySelector('[data-pt-analysis]');
    const proformaBtn=first.querySelector('[data-pt-proforma]');
    [analysisBtn,proformaBtn].forEach(b=>{if(b){b.disabled=false;b.style.cursor='pointer';}});
    if(analysisBtn)analysisBtn.onclick=()=>openSample('sample-analysis.html');
    if(proformaBtn)proformaBtn.onclick=()=>openSample('sample-pro-forma.html');

    let reportBtn=second.querySelector('[data-pt-report]');
    if(!reportBtn){
      second.querySelector('.pt-sample-btn')?.remove();
      second.querySelector('.pt-sample-coming')?.remove();
      reportBtn=document.createElement('button');
      reportBtn.type='button';reportBtn.className='pt-sample-btn';reportBtn.dataset.ptReport='1';reportBtn.textContent='Open Sample Report';reportBtn.style.cursor='pointer';
      second.appendChild(reportBtn);
    }
    reportBtn.disabled=false;
    reportBtn.onclick=()=>openSample('sample-report.html');

    const p=root.querySelector('.pt-sample-heading p');
    if(p)p.textContent='Open a completed underwriting analysis, review the full pro forma, and see the client-ready report produced from the same sample property.';
    root.dataset.ptFunctional='1';
    return true;
  }

  function start(){
    upgrade();
    const observer=new MutationObserver(()=>upgrade());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(upgrade,250);setTimeout(upgrade,750);setTimeout(upgrade,1500);setTimeout(upgrade,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();