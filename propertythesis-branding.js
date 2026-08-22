'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisBrandingV||0)>=VERSION)return;
  window.__propertyThesisBrandingV=VERSION;

  const BRAND='PropertyThesis';
  const TAGLINE='Real estate investment analysis • model the property, test the assumptions, understand the return';

  function apply(){
    document.title='PropertyThesis | Real Estate Investment Analysis';
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.setAttribute('content','PropertyThesis helps investors analyze property income, financing, valuation, taxes, cash flow, IRR, NPV and investment returns.');

    const brand=document.querySelector('.brand');
    if(brand){
      const h1=brand.querySelector('h1');
      const p=brand.querySelector('p');
      if(h1)h1.textContent=BRAND;
      if(p)p.textContent=TAGLINE;
    }

    const printMini=document.querySelector('.print-only .mini');
    if(printMini)printMini.textContent='Prepared with PropertyThesis';

    const authTitle=document.querySelector('#authModal .modal h2');
    if(authTitle)authTitle.textContent=BRAND;
    const authIntro=document.querySelector('#authModal .modal .sectionhead p');
    if(authIntro)authIntro.textContent='Sign in to access your PropertyThesis analyses across devices.';

    const footer=document.querySelector('.footer');
    if(footer)footer.textContent='PropertyThesis • Real Estate Investment Analysis';
  }

  function start(){
    apply();
    [80,250,700].forEach(ms=>setTimeout(apply,ms));
  }

  window.PropertyThesisBranding={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
