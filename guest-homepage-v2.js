'use strict';
(()=>{
  const VERSION=3;
  if((window.__ptGuestHomepageV||0)>=VERSION)return;
  window.__ptGuestHomepageV=VERSION;

  function signedOut(){
    const text=(document.getElementById('authUser')?.textContent||'').trim().toLowerCase();
    const out=document.getElementById('signOutBtn');
    return text==='not signed in'||!out||out.hidden||out.classList.contains('hidden')||getComputedStyle(out).display==='none';
  }
  function auth(){try{if(typeof showAuth==='function')showAuth();else document.getElementById('authBtn')?.click();}catch(_e){document.getElementById('authBtn')?.click();}}
  function sample(){location.href='sample-analysis-viewer.html?v=2';}
  function ensureNav(shell){
    const toolbar=shell.querySelector('.app-nav-toolbar'),standard=toolbar?.querySelector('.app-nav-actions');if(!toolbar||!standard)return;
    let nav=toolbar.querySelector('.pt-guest-nav');
    if(!nav){nav=document.createElement('nav');nav.className='pt-guest-nav';nav.setAttribute('aria-label','Explore PropertyThesis');nav.innerHTML='<button type="button" class="primary" data-pt-home-start>Start Free Analysis</button><a href="sample-report-viewer.html?v=2">Sample Report</a><a href="mortgage-tools.html">Mortgage Tools</a><button type="button" data-pt-home-signin>Sign In</button>';toolbar.appendChild(nav);nav.querySelector('[data-pt-home-start]').onclick=sample;nav.querySelector('[data-pt-home-signin]').onclick=auth;}
    standard.hidden=true;nav.hidden=false;
  }
  function upgradeHero(root){
    root.classList.add('pt-home-v2');
    const eyebrow=root.querySelector('.pt-guest-eyebrow'),title=root.querySelector('.pt-guest-copy h2'),lead=root.querySelector('.pt-guest-lead'),sub=root.querySelector('.pt-guest-sub'),actions=root.querySelector('.pt-guest-promo-actions'),features=root.querySelector('.pt-guest-feature-grid');
    if(eyebrow)eyebrow.textContent='REAL ESTATE INVESTMENT DECISIONS, EXPLAINED';
    if(title)title.textContent='Turn a property address into a complete investment decision.';
    if(lead)lead.textContent='Analyze income, financing, value, returns and market evidence—then produce a client-ready investment report.';
    if(sub)sub.textContent='See what the property supports, understand the risks, and build a clear acquisition case without stitching together separate calculators.';
    let audience=root.querySelector('.pt-home-audience');if(!audience){audience=document.createElement('p');audience.className='pt-home-audience';sub?.insertAdjacentElement('afterend',audience);}audience.textContent='Built for real estate investors, agents, brokers and acquisition professionals who need more than a basic rental calculator.';
    if(actions){actions.innerHTML='<button type="button" class="pt-guest-primary" data-pt-home-sample>Start Free Analysis</button><button type="button" class="pt-guest-secondary" data-pt-home-report>View a Sample Report</button><button type="button" class="pt-home-tertiary" data-pt-home-create>Create Free Account</button>';actions.querySelector('[data-pt-home-sample]').onclick=sample;actions.querySelector('[data-pt-home-report]').onclick=()=>location.href='sample-report-viewer.html?v=2';actions.querySelector('[data-pt-home-create]').onclick=auth;}
    if(features)features.innerHTML='<div class="pt-guest-feature"><span>Purchase Price</span><strong>$250,000</strong><em>Sample acquisition</em></div><div class="pt-guest-feature"><span>Market Rent</span><strong>$1,790/mo</strong><em>Supported by rental evidence</em></div><div class="pt-guest-feature"><span>Cap Rate</span><strong>4.64%</strong><em>Compared with a 6.50% target</em></div><div class="pt-guest-feature"><span>Maximum Supported Price</span><strong>$178,449</strong><em>See how the conclusion was reached</em></div>';
    const note=root.querySelector('.pt-guest-access-note');if(note)note.textContent='Explore the completed sample before creating an account.';
  }
  function ensureEducation(shell,sampleSection){
    let clarity=document.getElementById('ptHomeClarity');
    if(!clarity){
      clarity=document.createElement('section');clarity.id='ptHomeClarity';clarity.className='pt-home-section pt-home-clarity';clarity.innerHTML=`
        <div class="pt-home-section-head"><div class="pt-home-eyebrow">START SIMPLE. REFINE WHEN READY.</div><h2>Two numbers can create a high-quality first analysis.</h2><p>Enter the acquisition price and expected monthly rent. PropertyThesis supplies practical starting defaults for everything else, while keeping every assumption visible and editable.</p></div>
        <div class="pt-home-minimum"><strong>Minimum starting point:</strong><span>Acquisition Price</span><span>+</span><span>Expected Monthly Rent</span><span>→</span><span>Analysis, decision support and professional report</span></div>
        <div class="pt-home-io">
          <article class="pt-home-io-card"><h3>Assumptions you can control</h3><p>Start with the defaults, then replace as much—or as little—as your property information supports.</p><div class="pt-home-assumption-groups">
            <div class="pt-home-assumption-group"><strong>Property & acquisition</strong><span>Purchase price, units, closing costs, initial repairs and improvement timing</span></div>
            <div class="pt-home-assumption-group"><strong>Income & occupancy</strong><span>Unit rents, other income, vacancy, concessions, rent growth and lease-up</span></div>
            <div class="pt-home-assumption-group"><strong>Operating expenses</strong><span>Property taxes, insurance, management, maintenance, utilities, HOA, reserves and other costs</span></div>
            <div class="pt-home-assumption-group"><strong>Financing</strong><span>Down payment or LTV, interest rate, amortization, loan term, points and loan costs</span></div>
            <div class="pt-home-assumption-group"><strong>Growth & sale</strong><span>Expense growth, appreciation, holding period, selling costs and exit assumptions</span></div>
            <div class="pt-home-assumption-group"><strong>Taxes & benchmarks</strong><span>Ordinary income, capital gains and recapture rates, target cap rate and required return</span></div>
          </div><div class="pt-home-default-note"><strong>Helpful defaults included:</strong> Practical underwriting values complete the first pass, so you never begin with a blank model. Each default is clearly shown and can be changed.</div></article>
          <article class="pt-home-io-card"><h3>What PropertyThesis produces</h3><p>Every result stays connected to the assumptions and market evidence behind it.</p><div class="pt-home-output-grid"><div class="pt-home-output"><strong>Income & cash flow</strong><span>PGI, EGI, itemized expenses, NOI and annual cash flow</span></div><div class="pt-home-output"><strong>Financing & coverage</strong><span>Payment, debt service, interest, principal, balance and DSCR</span></div><div class="pt-home-output"><strong>Value support</strong><span>Cap rate, GRM, market evidence and income-supported pricing</span></div><div class="pt-home-output"><strong>Investment returns</strong><span>Cash-on-cash return, IRR, NPV and equity reversion</span></div><div class="pt-home-output"><strong>Decision analysis</strong><span>Sensitivity, maximum price, risks and offer guidance</span></div><div class="pt-home-output"><strong>Client deliverables</strong><span>Transparent conclusions, professional PDF report and Excel pro forma</span></div></div><div class="pt-home-proof"><strong>Clear enough to trust. Polished enough to present.</strong><span>Review the logic behind the conclusion, support it with market evidence, and save your work after signing in.</span></div></article>
        </div><div class="pt-home-direct"><div><strong>See the complete workflow—no account required.</strong><span>Review assumptions, calculate the results, and produce the sample report.</span></div><button type="button" data-pt-home-sample>Start Free Analysis</button></div>`;
      sampleSection.insertAdjacentElement('beforebegin',clarity);clarity.querySelector('[data-pt-home-sample]').onclick=sample;
    }
    document.querySelectorAll('#ptHomeHow,#ptHomeTrust,#ptHomeFinal').forEach(x=>x.remove());
  }
  function apply(){
    const shell=document.getElementById('appNavShell'),hero=document.getElementById('ptGuestGuidance'),sampleSection=document.getElementById('ptSampleShowcase');if(!shell||!hero||!sampleSection)return false;
    const guest=signedOut();document.body.classList.toggle('pt-guest-landing',guest);
    const standard=shell.querySelector('.app-nav-actions'),guestNav=shell.querySelector('.pt-guest-nav');
    if(!guest){if(standard)standard.hidden=false;if(guestNav)guestNav.hidden=true;document.querySelectorAll('#ptHomeClarity').forEach(x=>x.hidden=true);return true;}
    ensureNav(shell);upgradeHero(hero);ensureEducation(shell,sampleSection);document.querySelectorAll('#ptHomeClarity').forEach(x=>x.hidden=false);return true;
  }
  function start(){apply();[100,250,500,800,1200,1800,2600,4000,6000].forEach(ms=>setTimeout(apply,ms));setInterval(apply,2000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
