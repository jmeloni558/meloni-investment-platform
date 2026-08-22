'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisReportBrandingV||0)>=VERSION)return;
  window.__propertyThesisReportBrandingV=VERSION;
  const PRODUCT='PropertyThesis';
  const TAGLINE='Know the Numbers. Build the Case.';
  const TYPE='Investment Property Analysis';

  function apply(){
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)return false;
    const cover=report.querySelector('.rb-cover');
    if(cover){
      let brand=cover.querySelector('.rb-brand');
      if(brand)brand.textContent=PRODUCT;
      let tag=cover.querySelector('.pt-report-tagline');
      if(!tag){tag=document.createElement('div');tag.className='pt-report-tagline';brand?.insertAdjacentElement('afterend',tag);}
      if(tag)tag.textContent=TAGLINE;
      const h1=cover.querySelector('h1');if(h1)h1.textContent=TYPE;
    }
    const footer=report.querySelector('.rb-footer');
    if(footer){
      let prod=footer.querySelector('.pt-report-product');
      if(!prod){prod=document.createElement('div');prod.className='pt-report-product';footer.appendChild(prod);}
      prod.textContent=`${PRODUCT} • ${TAGLINE}`;
    }
    return true;
  }
  function styles(){
    if(document.getElementById('propertyThesisReportBrandingStyles'))return;
    const s=document.createElement('style');s.id='propertyThesisReportBrandingStyles';s.textContent=`
      #clientReport .rb-brand{font-size:12px!important;letter-spacing:.12em!important;font-weight:900!important}
      #clientReport .pt-report-tagline{margin-top:4px;font-size:10px;font-weight:650;color:#dceaf6;letter-spacing:.025em}
      #clientReport .rb-footer .pt-report-product{font-weight:800;color:#fff;white-space:nowrap}
      @media print{#clientReport .pt-report-tagline{font-size:7.2pt!important;color:#e5eef6!important}}
    `;document.head.appendChild(s);
  }
  function schedule(){styles();setTimeout(apply,0);setTimeout(apply,80);setTimeout(apply,220);}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll,#rbDownloadPdf'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.PropertyThesisReportBranding={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();