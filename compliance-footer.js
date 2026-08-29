(()=>{
  const render=()=>{
    if(document.querySelector('.pt-compliance-footer'))return;
    if(!document.querySelector('link[href*="compliance-footer.css"]')){
      const stylesheet=document.createElement('link');
      stylesheet.rel='stylesheet';
      stylesheet.href='compliance-footer.css?v=1';
      document.head.appendChild(stylesheet);
    }
    document.querySelectorAll('.pricing-footer').forEach(node=>node.remove());
    const footer=document.createElement('footer');
    footer.className='pt-compliance-footer';
    footer.setAttribute('aria-label','PropertyThesis company and licensing information');
    footer.innerHTML=`<div class="pt-footer-inner">
      <div class="pt-footer-grid">
        <section><p class="pt-footer-brand">PropertyThesis</p><p class="pt-footer-division">A division of MELONI REALTY INC<br>Florida Licensed Real Estate Brokerage</p></section>
        <section><p class="pt-footer-heading">Licensing</p><p class="pt-footer-copy">Jamie Meloni, Licensed Real Estate Broker<br>Broker License BK3167461<br>Brokerage License CQ1067291</p></section>
        <section id="ptFooterContact"><p class="pt-footer-heading">Contact</p><address class="pt-footer-contact">18012 Loretta Lane<br>Lutz, FL 33548<br><a href="tel:+18137608516">813-760-8516</a><br><a href="mailto:jamie@propertythesis.com">jamie@propertythesis.com</a></address></section>
      </div>
      <div class="pt-footer-disclaimer">PropertyThesis provides real estate investment analysis software and educational information. Analyses are estimates based on user-provided information and assumptions and are not appraisals, guarantees, lending decisions, or legal, tax, or accounting advice. Use of this website does not create a brokerage or agency relationship. Any brokerage services are provided separately by MELONI REALTY INC under an applicable written agreement.</div>
      <div class="pt-footer-bottom"><span>&copy; ${new Date().getFullYear()} MELONI REALTY INC. All rights reserved.</span><span>PropertyThesis &bull; Know the Numbers. Build the Case.</span></div>
    </div>`;
    (document.querySelector('.app')||document.body).appendChild(footer);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
