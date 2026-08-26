'use strict';
(()=>{
  function openSample(path){window.open(path,'_blank','noopener');}

  function loadSampleExporter(){
    if(window.PropertyThesisSampleProForma?.download)return Promise.resolve(window.PropertyThesisSampleProForma);
    return new Promise((resolve,reject)=>{
      let s=document.querySelector('script[data-pt-sample-proforma]');
      if(!s){
        s=document.createElement('script');
        s.src='guest-sample-proforma-download.js?cb='+Date.now();
        s.async=true;
        s.dataset.ptSampleProforma='1';
        document.head.appendChild(s);
      }
      const done=()=>window.PropertyThesisSampleProForma?.download
        ? resolve(window.PropertyThesisSampleProForma)
        : reject(new Error('The sample pro forma generator did not initialize.'));
      s.addEventListener('load',done,{once:true});
      s.addEventListener('error',()=>reject(new Error('The sample pro forma generator could not be loaded.')),{once:true});
      setTimeout(()=>{if(window.PropertyThesisSampleProForma?.download)resolve(window.PropertyThesisSampleProForma);},1200);
    });
  }

  async function downloadSampleProForma(){
    try{
      const exporter=await loadSampleExporter();
      await exporter.download();
    }catch(err){
      console.error('Sample pro forma launch failed',err);
      alert(err?.message||'Unable to generate the sample pro forma workbook.');
    }
  }

  function upgrade(){
    const root=document.getElementById('ptSampleShowcase');
    if(!root)return false;
    if(root.dataset.ptFunctional==='1')return true;

    const cards=root.querySelectorAll('.pt-sample-card');
    if(cards.length<2)return false;

    const first=cards[0], second=cards[1];
    const metrics=first.querySelector('.pt-sample-metrics');
    if(metrics)metrics.innerHTML=`
      <div class="pt-sample-metric"><span>Purchase Price</span><strong>$250,000</strong></div>
      <div class="pt-sample-metric"><span>Starting Rent</span><strong>$1,790/mo</strong></div>
      <div class="pt-sample-metric"><span>Vacancy</span><strong>10.0%</strong></div>
      <div class="pt-sample-metric"><span>Ordinary Tax</span><strong>28%</strong></div>
      <div class="pt-sample-metric"><span>Capital Gains Tax</span><strong>15%</strong></div>
      <div class="pt-sample-metric"><span>Analysis</span><strong>7-Year</strong></div>`;

    let actions=first.querySelector('.pt-sample-live-actions');
    if(!actions){
      first.querySelector('.pt-sample-btn')?.remove();
      first.querySelector('.pt-sample-coming')?.remove();
      actions=document.createElement('div');
      actions.className='pt-sample-live-actions';
      actions.style.display='flex';
      actions.style.gap='8px';
      actions.style.flexWrap='wrap';
      actions.innerHTML='<button type="button" class="pt-sample-btn" data-pt-analysis>Explore Sample Analysis</button><button type="button" class="pt-sample-btn" data-pt-proforma>View Sample Pro Forma</button>';
      first.appendChild(actions);
    }

    const analysisBtn=first.querySelector('[data-pt-analysis]');
    const proformaBtn=first.querySelector('[data-pt-proforma]');
    [analysisBtn,proformaBtn].forEach(b=>{if(b){b.disabled=false;b.style.cursor='pointer';}});
    if(analysisBtn)analysisBtn.onclick=()=>openSample('sample-analysis.html');
    if(proformaBtn)proformaBtn.onclick=()=>downloadSampleProForma();

    let reportBtn=second.querySelector('[data-pt-report]');
    if(!reportBtn){
      reportBtn=second.querySelector('a.pt-sample-btn')||document.createElement('a');
      second.querySelector('.pt-sample-coming')?.remove();
      reportBtn.className='pt-sample-btn';
      reportBtn.dataset.ptReport='1';
      reportBtn.textContent='Open Sample Report';
      if(!reportBtn.isConnected)second.appendChild(reportBtn);
    }
    reportBtn.href='sample-report.html';
    reportBtn.removeAttribute('target');
    reportBtn.removeAttribute('rel');
    reportBtn.style.cursor='pointer';
    reportBtn.onclick=null;

    const copy='Explore a completed sample analysis, download a seven-year Excel pro forma, and see the client-ready report produced from a sample property.';
    const p=root.querySelector('.pt-sample-heading p');
    if(p && p.textContent!==copy)p.textContent=copy;

    root.dataset.ptFunctional='1';
    return true;
  }

  function start(){
    if(upgrade())return;
    [100,250,500,750,1000,1500,2000,3000,4500,6000].forEach(ms=>setTimeout(upgrade,ms));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
