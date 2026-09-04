(()=>{
  const loadAssistant=()=>{
    if(!document.querySelector('link[href*="propertythesis-assistant.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='propertythesis-assistant.css?v=3';document.head.appendChild(css)}
    if(!document.querySelector('script[src*="propertythesis-assistant.js"]')){const script=document.createElement('script');script.src='propertythesis-assistant.js?v=4';script.defer=true;document.body.appendChild(script)}
  };
  const addGuides=()=>document.querySelectorAll('.pricing-nav,.glossary-nav,.guide-nav,.pt-guest-nav').forEach(nav=>{if(nav.querySelector('[data-pt-guides],a[href="guides.html"],a[href$="/guides.html"]'))return;const link=document.createElement('a');link.href='guides.html';link.dataset.ptGuides='1';link.textContent='Guides';const signIn=[...nav.querySelectorAll('a,button')].find(node=>/sign in/i.test(node.textContent));signIn?nav.insertBefore(link,signIn):nav.appendChild(link);});
  const prepareGuidePage=()=>{
    const guide=document.querySelector('.guide-shell');
    if(!guide)return;
    ['styles.css','site-shell-v2.css?v=7'].forEach(href=>{if(document.querySelector(`link[href^="${href.split('?')[0]}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link);});
    if(!document.querySelector('.pt-site-header')){
      const header=document.createElement('header');
      header.className='top pt-site-header';
      header.innerHTML='<div class="topin"><a class="brand pt-site-brand" href="index.html?home=1" aria-label="PropertyThesis home"><img class="pt-site-logo" src="assets/propertythesis-logo-make-the-offer-768.webp" width="768" height="768" alt="PropertyThesis — Know the Numbers. Make the Offer."></a></div>';
      document.body.insertBefore(header,guide);
    }
    document.querySelectorAll('a[href*="free-analysis=1"]').forEach(link=>link.href='index.html?from=guides');
  };
  const shareDetails=()=>{
    const canonical=document.querySelector('link[rel="canonical"]')?.href;
    const url=canonical||`${location.origin}${location.pathname}`;
    const title=document.querySelector('meta[property="og:title"]')?.content||document.title||'PropertyThesis';
    return {url,title};
  };
  const openShare=url=>window.open(url,'propertythesis-share','noopener,noreferrer,width=760,height=680');
  const bindSharing=footer=>{
    const {url,title}=shareDetails(),encodedUrl=encodeURIComponent(url),encodedTitle=encodeURIComponent(title);
    footer.querySelector('[data-pt-share="facebook"]')?.addEventListener('click',()=>openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`));
    footer.querySelector('[data-pt-share="linkedin"]')?.addEventListener('click',()=>openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`));
    footer.querySelector('[data-pt-share="x"]')?.addEventListener('click',()=>openShare(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`));
    const email=footer.querySelector('[data-pt-share="email"]');
    if(email)email.href=`mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${title}\n\n${url}`)}`;
    footer.querySelector('[data-pt-share="copy"]')?.addEventListener('click',async event=>{
      const button=event.currentTarget,original=button.textContent;
      try{await navigator.clipboard.writeText(url);button.textContent='Link Copied';}
      catch(_error){const input=document.createElement('input');input.value=url;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();button.textContent='Link Copied';}
      setTimeout(()=>button.textContent=original,1800);
    });
  };
  const render=()=>{
    loadAssistant();
    prepareGuidePage();
    addGuides();[100,500,1500,3000].forEach(ms=>setTimeout(addGuides,ms));
    if(document.querySelector('.pt-compliance-footer'))return;
    if(!document.querySelector('link[href*="compliance-footer.css"]')){
      const stylesheet=document.createElement('link');
      stylesheet.rel='stylesheet';
      stylesheet.href='compliance-footer.css?v=3';
      document.head.appendChild(stylesheet);
    }
    document.querySelectorAll('.pricing-footer').forEach(node=>node.remove());
    const footer=document.createElement('footer');
    footer.className='pt-compliance-footer';
    footer.setAttribute('aria-label','PropertyThesis company and licensing information');
    footer.innerHTML=`<div class="pt-footer-inner">
      <div class="pt-footer-grid">
        <section><p class="pt-footer-brand">PropertyThesis</p><p class="pt-footer-division">A division and registered fictitious name of MELONI REALTY INC<br>Florida Fictitious Name Registration G26000120794<br>Florida Licensed Real Estate Brokerage</p></section>
        <section><p class="pt-footer-heading">Licensing</p><p class="pt-footer-copy">Jamie Meloni, Licensed Real Estate Broker<br>Broker License BK3167461<br>Brokerage License CQ1067291</p></section>
        <section id="ptFooterContact"><p class="pt-footer-heading">Contact</p><address class="pt-footer-contact">18012 Loretta Lane<br>Lutz, FL 33548<br><a href="tel:+18137608516">813-760-8516</a><br><a href="mailto:jamie@propertythesis.com">jamie@propertythesis.com</a></address></section>
      </div>
      <section class="pt-footer-share" aria-labelledby="ptShareHeading"><div><p class="pt-footer-heading" id="ptShareHeading">Share PropertyThesis</p><p>Help a Realtor or investor discover a clearer way to analyze income-producing property.</p></div><div class="pt-share-actions"><button type="button" class="pt-share-facebook" data-pt-share="facebook">Facebook</button><button type="button" data-pt-share="linkedin">LinkedIn</button><button type="button" data-pt-share="x">X</button><a data-pt-share="email" href="mailto:">Email</a><button type="button" data-pt-share="copy">Copy Link</button></div></section>
      <div class="pt-footer-disclaimer">PropertyThesis provides real estate investment analysis software and educational information. Analyses are estimates based on user-provided information and assumptions and are not appraisals, guarantees, lending decisions, or legal, tax, or accounting advice. Use of this website does not create a brokerage or agency relationship. Any brokerage services are provided separately by MELONI REALTY INC under an applicable written agreement.</div>
      <div class="pt-footer-bottom"><span>&copy; ${new Date().getFullYear()} MELONI REALTY INC. All rights reserved.</span><nav class="pt-footer-legal" aria-label="PropertyThesis resources and legal links"><a href="guides.html">Guides</a><a href="glossary.html">Glossary</a><a href="pricing.html">Pricing</a><a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms of Use</a></nav><span>PropertyThesis &bull; Know the Numbers. Make the Offer.</span></div>
    </div>`;
    (document.querySelector('.app')||document.body).appendChild(footer);
    bindSharing(footer);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
