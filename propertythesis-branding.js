'use strict';
(()=>{
  const VERSION=8;
  if((window.__propertyThesisBrandingV||0)>=VERSION)return;
  window.__propertyThesisBrandingV=VERSION;

  const BRAND='PropertyThesis';
  const TAGLINE='Know the Numbers. Prove the Case.';
  const TITLE='PropertyThesis | Know the Numbers. Prove the Case.';

  function setText(el,text){
    if(el && el.textContent!==text) el.textContent=text;
  }

  function ensureMarketRentPersistence(){
    if(window.MarketRentCloudPersistence||document.getElementById('ptMarketRentCloudPersistenceLoader'))return;
    const s=document.createElement('script');
    s.id='ptMarketRentCloudPersistenceLoader';
    s.src='market-rent-cloud-persistence.js?v=1';
    document.head.appendChild(s);
  }

  function ensureGuestSampleScripts(){
    if(!document.getElementById('ptGuestSampleProFormaLoader')){
      const proforma=document.createElement('script');
      proforma.id='ptGuestSampleProFormaLoader';
      proforma.src='guest-sample-proforma-download.js?v=2';
      document.head.appendChild(proforma);
    }
    if(!document.getElementById('ptGuestSampleShowcaseLoader')){
      const showcase=document.createElement('script');
      showcase.id='ptGuestSampleShowcaseLoader';
      showcase.src='guest-sample-showcase.js?v=7';
      document.head.appendChild(showcase);
    }
  }

  function apply(){
    if(document.title!==TITLE) document.title=TITLE;

    const meta=document.querySelector('meta[name="description"]');
    const description='PropertyThesis helps real estate investors model property income, financing, valuation, taxes, cash flow, IRR, NPV and investment returns.';
    if(meta && meta.getAttribute('content')!==description) meta.setAttribute('content',description);

    const brand=document.querySelector('.brand');
    if(brand){
      const logo=brand.querySelector('.pt-site-logo');
      if(logo){logo.alt=`${BRAND} — ${TAGLINE}`;}else{
        setText(brand.querySelector('h1'),BRAND);
        setText(brand.querySelector('p'),TAGLINE);
      }
      if(!brand.dataset.ptHomeLink){
        brand.dataset.ptHomeLink='1';brand.setAttribute('role','link');brand.setAttribute('tabindex','0');brand.setAttribute('aria-label','PropertyThesis home');brand.style.cursor='pointer';
        const home=()=>location.assign(location.origin+'/index.html?home=1&cb='+Date.now());
        brand.addEventListener('click',home);brand.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();home();}});
      }
    }

    setText(document.querySelector('.print-only .mini'),'Prepared with PropertyThesis • Know the Numbers. Prove the Case.');

    if(!document.getElementById('ptAuthModes')){
      const authTitle=document.querySelector('#authModal .modal h2');
      setText(authTitle,BRAND);
      const authIntro=document.querySelector('#authModal .modal .sectionhead p');
      setText(authIntro,'Sign in or create an account to access your PropertyThesis analyses across devices.');
    }

    setText(document.querySelector('.footer'),'PropertyThesis • Know the Numbers. Prove the Case.');
    ensureMarketRentPersistence();
    ensureGuestSampleScripts();
  }

  let scheduled=false;
  function scheduleApply(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      apply();
    });
  }

  function start(){
    apply();

    // Keep the product identity intact if another legacy UI module redraws the header.
    const observer=new MutationObserver(scheduleApply);
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});

    // Catch delayed initialization without relying on timing for normal operation.
    [100,300,750,1500,3000].forEach(ms=>setTimeout(apply,ms));
  }

  window.PropertyThesisBranding={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
