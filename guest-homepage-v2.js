'use strict';
(()=>{
  const VERSION=2;
  if((window.__ptGuestHomepageV||0)>=VERSION)return;
  window.__ptGuestHomepageV=VERSION;

  function signedOut(){
    const text=(document.getElementById('authUser')?.textContent||'').trim().toLowerCase();
    const out=document.getElementById('signOutBtn');
    return text==='not signed in'||!out||out.hidden||out.classList.contains('hidden')||getComputedStyle(out).display==='none';
  }
  function auth(){try{if(typeof showAuth==='function')showAuth();else document.getElementById('authBtn')?.click();}catch(_e){document.getElementById('authBtn')?.click();}}
  function sample(){document.getElementById('ptSampleShowcase')?.scrollIntoView({behavior:'smooth',block:'start'});}
  function ensureNav(shell){
    const toolbar=shell.querySelector('.app-nav-toolbar'),standard=toolbar?.querySelector('.app-nav-actions');if(!toolbar||!standard)return;
    let nav=toolbar.querySelector('.pt-guest-nav');
    if(!nav){nav=document.createElement('nav');nav.className='pt-guest-nav';nav.setAttribute('aria-label','Explore PropertyThesis');nav.innerHTML='<button type="button" class="primary" data-pt-home-start>Start Free Analysis</button><button type="button" data-pt-home-sample>Explore Sample</button><a href="sample-report-viewer.html?v=2">Sample Report</a><a href="mortgage-tools.html">Mortgage Tools</a><button type="button" data-pt-home-signin>Sign In</button>';toolbar.appendChild(nav);nav.querySelector('[data-pt-home-start]').onclick=auth;nav.querySelector('[data-pt-home-sample]').onclick=sample;nav.querySelector('[data-pt-home-signin]').onclick=auth;}
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
    if(actions){actions.innerHTML='<button type="button" class="pt-guest-primary" data-pt-home-sample>Explore a Sample Deal</button><button type="button" class="pt-guest-secondary" data-pt-home-report>View a Sample Report</button><button type="button" class="pt-home-tertiary" data-pt-home-create>Create Free Account</button>';actions.querySelector('[data-pt-home-sample]').onclick=sample;actions.querySelector('[data-pt-home-report]').onclick=()=>location.href='sample-report-viewer.html?v=2';actions.querySelector('[data-pt-home-create]').onclick=auth;}
    if(features)features.innerHTML='<div class="pt-guest-feature"><span>Purchase Price</span><strong>$250,000</strong><em>Sample acquisition</em></div><div class="pt-guest-feature"><span>Market Rent</span><strong>$1,790/mo</strong><em>Supported by rental evidence</em></div><div class="pt-guest-feature"><span>Cap Rate</span><strong>4.64%</strong><em>Compared with a 6.50% target</em></div><div class="pt-guest-feature"><span>Maximum Supported Price</span><strong>$178,449</strong><em>See how the conclusion was reached</em></div>';
    const note=root.querySelector('.pt-guest-access-note');if(note)note.textContent='Explore the completed sample before creating an account.';
  }
  function ensureEducation(shell,sampleSection){
    let how=document.getElementById('ptHomeHow');if(!how){how=document.createElement('section');how.id='ptHomeHow';how.className='pt-home-section';how.innerHTML='<div class="pt-home-section-head"><div class="pt-home-eyebrow">FROM ADDRESS TO DECISION</div><h2>A professional analysis in three clear steps.</h2><p>PropertyThesis keeps the assumptions, evidence, calculations and final recommendation connected.</p></div><div class="pt-home-steps"><article class="pt-home-step"><b>1</b><h3>Enter the property</h3><p>Add the acquisition, income, operating and financing assumptions that define the investment.</p></article><article class="pt-home-step"><b>2</b><h3>Review the evidence</h3><p>Understand cash flow, valuation, coverage, returns, market rent and acquisition-price support.</p></article><article class="pt-home-step"><b>3</b><h3>Build the case</h3><p>Finalize the investment conclusion and produce professional PDF and Excel deliverables.</p></article></div>';sampleSection.insertAdjacentElement('afterend',how);}
    let trust=document.getElementById('ptHomeTrust');if(!trust){trust=document.createElement('section');trust.id='ptHomeTrust';trust.className='pt-home-section pt-home-trust';trust.innerHTML='<div class="pt-home-trust-copy"><div class="pt-home-eyebrow">BUILT FOR SERIOUS UNDERWRITING</div><h2>Transparent enough to trust. Polished enough to present.</h2><p>Every conclusion remains tied to visible assumptions and supporting analysis, so you can understand the result before sharing it.</p></div><div class="pt-home-trust-grid"><div class="pt-home-trust-item"><strong>Transparent assumptions</strong><span>Review and adjust the inputs behind every result.</span></div><div class="pt-home-trust-item"><strong>Connected market evidence</strong><span>Support market rent and value with relevant comparables.</span></div><div class="pt-home-trust-item"><strong>Professional deliverables</strong><span>Produce client-ready PDF reports and Excel pro formas.</span></div><div class="pt-home-trust-item"><strong>Secure cloud workspace</strong><span>Save analyses across devices after signing in.</span></div></div>';how.insertAdjacentElement('afterend',trust);}
    let final=document.getElementById('ptHomeFinal');if(!final){final=document.createElement('section');final.id='ptHomeFinal';final.className='pt-home-section pt-home-final';final.innerHTML='<div class="pt-home-eyebrow" style="color:#86d3ca">READY TO TEST A PROPERTY?</div><h2>Build your own investment case.</h2><p>Start with your property assumptions, or explore the completed sample first to see where the analysis leads.</p><div class="pt-home-final-actions"><button type="button" class="pt-home-final-primary" data-pt-home-create>Start a Free Analysis</button><button type="button" class="pt-home-final-secondary" data-pt-home-sample>Explore the Sample First</button></div>';trust.insertAdjacentElement('afterend',final);final.querySelector('[data-pt-home-create]').onclick=auth;final.querySelector('[data-pt-home-sample]').onclick=sample;}
  }
  function apply(){
    const shell=document.getElementById('appNavShell'),hero=document.getElementById('ptGuestGuidance'),sampleSection=document.getElementById('ptSampleShowcase');if(!shell||!hero||!sampleSection)return false;
    const guest=signedOut();document.body.classList.toggle('pt-guest-landing',guest);
    const standard=shell.querySelector('.app-nav-actions'),guestNav=shell.querySelector('.pt-guest-nav');
    if(!guest){if(standard)standard.hidden=false;if(guestNav)guestNav.hidden=true;document.querySelectorAll('#ptHomeHow,#ptHomeTrust,#ptHomeFinal').forEach(x=>x.hidden=true);return true;}
    ensureNav(shell);upgradeHero(hero);ensureEducation(shell,sampleSection);document.querySelectorAll('#ptHomeHow,#ptHomeTrust,#ptHomeFinal').forEach(x=>x.hidden=false);return true;
  }
  function start(){apply();[100,250,500,800,1200,1800,2600,4000,6000].forEach(ms=>setTimeout(apply,ms));setInterval(apply,2000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
