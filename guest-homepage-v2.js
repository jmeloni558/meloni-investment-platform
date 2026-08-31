'use strict';
(()=>{
  const VERSION=30;
  if((window.__ptGuestHomepageV||0)>=VERSION)return;
  window.__ptGuestHomepageV=VERSION;

  function signedOut(){
    const text=(document.getElementById('authUser')?.textContent||'').trim().toLowerCase();
    const out=document.getElementById('signOutBtn');
    return text==='not signed in'||!out||out.hidden||out.classList.contains('hidden')||getComputedStyle(out).display==='none';
  }
  function auth(mode='signin',message=''){try{if(window.PropertyThesisAuth?.open)window.PropertyThesisAuth.open(mode,message);else if(typeof showAuth==='function')showAuth();else document.getElementById('authBtn')?.click();}catch(_e){document.getElementById('authBtn')?.click();}}
  const entryParams=new URLSearchParams(location.search);
  let freeAnalysisActive=entryParams.get('free-analysis')==='1';
  const freeMode=()=>freeAnalysisActive;
  let signInRequestHandled=false;
  let returnRouteInstalled=false;
  function installReturnRoute(){
    if(returnRouteInstalled)return;
    const params=new URLSearchParams(location.search),raw=params.get('return');
    if(params.get('signin')!=='1'||!raw)return;
    let target;
    try{const url=new URL(raw,location.origin);if(url.origin!==location.origin)return;target=url.href;}catch(_e){return;}
    if(typeof cloudClient==='undefined'||!cloudClient)return;
    returnRouteInstalled=true;
    cloudClient.auth.getSession().then(({data})=>{if(data?.session?.user)location.replace(target);}).catch(()=>{});
    cloudClient.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session?.user)location.replace(target);});
  }
  function sample(){
    const form=document.getElementById('ptHomeStarterForm');
    if(form){form.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>form.querySelector('[name="price"]')?.focus({preventScroll:true}),350);return;}
    location.href='index.html?start-analysis=1';
  }
  function startFromHomepage(address='',price='',rent='',place={}){
    const params=new URLSearchParams({"free-analysis":'1',cb:String(Date.now())});
    if(address.trim())params.set('starter-address',address.trim());
    if(String(price).trim())params.set('starter-price',String(price).replace(/[^0-9.]/g,''));
    if(String(rent).trim())params.set('starter-rent',String(rent).replace(/[^0-9.]/g,''));
    if(place.placeId)params.set('starter-place-id',place.placeId);
    if(place.lat)params.set('starter-lat',place.lat);
    if(place.lng)params.set('starter-lng',place.lng);
    location.href='index.html?'+params.toString();
  }
  function applyStarterValues(){
    const values={f_address:entryParams.get('starter-address'),f_price:entryParams.get('starter-price'),f_units:entryParams.get('starter-units'),f_rent:entryParams.get('starter-rent')};
    let changed=false;
    Object.entries(values).forEach(([id,value])=>{if(!value)return;const input=document.getElementById(id);if(!input)return;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));changed=true;});
    if(changed)try{window.GuidedAnalysisSetup?.refresh?.();}catch(_e){}
  }
  let freeEntered=false;
  let noticeUser='',noticeLoading=false;
  function guestNotice(note){note.hidden=false;note.className='';note.innerHTML='<strong>Build your analysis free—no account required yet.</strong><span>Enter and review every assumption. When you calculate the results, create or sign in to a free account so PropertyThesis can display and save your analysis.</span>';}
  async function accountNotice(){
    const shell=document.getElementById('appNavShell');if(!shell||signedOut())return;
    let note=document.getElementById('ptAccountUpgradeBanner');
    if(!note){note=document.createElement('aside');note.id='ptAccountUpgradeBanner';note.className='pt-account-upgrade';note.hidden=true;note.setAttribute('aria-label','PropertyThesis professional plans');shell.insertAdjacentElement('afterend',note);}
    else if(note.previousElementSibling!==shell)shell.insertAdjacentElement('afterend',note);
    const oldNotice=document.getElementById('ptFreeAnalysisNotice');if(oldNotice&&oldNotice!==note)oldNotice.remove();
    let uid='';try{uid=cloudUser?.id||'';}catch(_e){}if(!uid||noticeLoading||noticeUser===uid)return;
    noticeLoading=true;
    try{
      const [subscriptionResult,propertyResult]=await Promise.all([
        cloudClient.from('billing_subscriptions').select('plan,status,current_period_end').eq('user_id',uid).in('status',['active','trialing']).maybeSingle(),
        cloudClient.from('properties').select('id').eq('user_id',uid).limit(1)
      ]);
      if(subscriptionResult.error)throw subscriptionResult.error;if(propertyResult.error)throw propertyResult.error;
      const data=subscriptionResult.data,active=!!data&&(!data.current_period_end||new Date(data.current_period_end).getTime()>Date.now());
      if(active){noticeUser=uid;note.hidden=true;return;}
      if(!propertyResult.data?.length){noticeUser='';note.hidden=true;return;}
      noticeUser=uid;
      note.hidden=false;
      note.innerHTML='<div class="pt-account-upgrade-copy"><span class="pt-account-upgrade-kicker">KEEP BUILDING YOUR PIPELINE</span><strong>Your first property is saved. Ready to analyze the next opportunity?</strong><span>Upgrade for additional property analyses, professional reports and multiyear pro formas.</span></div><div class="pt-account-upgrade-actions"><button type="button" data-pt-upgrade="professional_50_monthly">Professional 50 — $29/month</button><button type="button" class="secondary" data-pt-upgrade="unlimited_monthly">Unlimited — $59/month</button><a href="pricing.html">Compare all plans</a></div>';
      note.querySelectorAll('[data-pt-upgrade]').forEach(button=>button.onclick=()=>{location.href='pricing.html';});
    }catch(_e){note.hidden=true;}finally{noticeLoading=false;}
  }
  function enterFreeAnalysis(){
    if(freeEntered)return;const assumptions=document.getElementById('assumptions'),workflow=document.getElementById('stage8Workflow');if(!assumptions||!workflow)return;
    freeEntered=true;
    try{history.replaceState(null,'','/');}catch(_e){}
    try{window.WorkflowNavigationController?.newAnalysis?.();}catch(_e){}
    try{if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('assumptions');else if(typeof switchTab==='function')switchTab('assumptions');}catch(_e){}
    let note=document.getElementById('ptFreeAnalysisNotice');if(!note){note=document.createElement('div');note.id='ptFreeAnalysisNotice';workflow.insertAdjacentElement('afterend',note);}guestNotice(note);
    setTimeout(()=>{try{window.GuidedAnalysisSetup?.reset?.();applyStarterValues();}catch(_e){}},100);
    setTimeout(()=>{applyStarterValues();document.getElementById('guidedSetup')?.scrollIntoView({behavior:'smooth',block:'start'});},350);
    [250,500,900].forEach(ms=>setTimeout(applyStarterValues,ms));
  }
  function ensureNav(shell){
    const toolbar=shell.querySelector('.app-nav-toolbar'),standard=toolbar?.querySelector('.app-nav-actions');if(!toolbar||!standard)return;
    let nav=toolbar.querySelector('.pt-guest-nav');
    if(!nav){nav=document.createElement('nav');nav.className='pt-guest-nav';nav.setAttribute('aria-label','Explore PropertyThesis');nav.innerHTML='<button type="button" class="primary" data-pt-home-start>Start Free Analysis</button><a href="index.html?listing-search=1">Search Listings</a><a href="sample-report-viewer.html?v=2">Sample Report</a><a href="pricing.html">Pricing</a><a href="mortgage-tools.html">Mortgage Tools</a><button type="button" data-pt-home-signin>Sign In</button>';toolbar.appendChild(nav);nav.querySelector('[data-pt-home-start]').onclick=sample;nav.querySelector('[data-pt-home-signin]').onclick=()=>auth('signin');}
    if(!nav.querySelector('[data-pt-glossary]')){const signIn=nav.querySelector('[data-pt-home-signin]');signIn?.insertAdjacentHTML('beforebegin','<a data-pt-glossary href="glossary.html">Glossary</a>');}
    standard.hidden=true;nav.hidden=false;
  }
  function upgradeHero(root){
    root.classList.add('pt-home-v2');
    const eyebrow=root.querySelector('.pt-guest-eyebrow'),title=root.querySelector('.pt-guest-copy h2'),lead=root.querySelector('.pt-guest-lead'),sub=root.querySelector('.pt-guest-sub'),actions=root.querySelector('.pt-guest-promo-actions'),features=root.querySelector('.pt-guest-feature-grid');
    if(eyebrow)eyebrow.textContent='EVERY PROPERTY BEGINS WITH A THESIS';
    if(title)title.textContent='Know the Numbers. Prove the Case.';
    if(lead)lead.textContent='A property thesis is the idea that a deal can produce the income, value and returns you expect. PropertyThesis tests that idea against the numbers—so you can see whether the evidence supports it.';
    if(sub)sub.textContent='Analyze income, expenses, financing, taxes, value, returns, sensitivity and market evidence in one guided workflow, then turn the conclusion into a client-ready investment report.';
    let pathway=root.querySelector('.pt-home-thesis-path');if(!pathway){pathway=document.createElement('div');pathway.className='pt-home-thesis-path';sub?.insertAdjacentElement('afterend',pathway);}pathway.innerHTML='<span><b>01</b>Form the idea</span><i>→</i><span><b>02</b>Test the assumptions</span><i>→</i><span><b>03</b>Prove the case</span>';
    let audience=root.querySelector('.pt-home-audience');if(!audience){audience=document.createElement('p');audience.className='pt-home-audience';}pathway.insertAdjacentElement('afterend',audience);audience.textContent='Built for real estate investors, agents, brokers and acquisition professionals who need more than a basic rental calculator.';
    if(actions){actions.innerHTML='<button type="button" class="pt-guest-primary" data-pt-home-sample>Start Free Analysis</button><button type="button" class="pt-guest-secondary" data-pt-home-report>View a Sample Report</button><button type="button" class="pt-home-tertiary" data-pt-home-create>Create Free Account</button>';actions.querySelector('[data-pt-home-sample]').onclick=sample;actions.querySelector('[data-pt-home-report]').onclick=()=>location.href='sample-report-viewer.html?v=2';actions.querySelector('[data-pt-home-create]').onclick=()=>auth('signup');}
    if(features){features.classList.add('pt-home-report-proof');features.innerHTML='<a class="pt-home-report-preview" href="sample-report-viewer.html?v=2" aria-label="Open the complete PropertyThesis sample report"><span class="pt-home-preview-label">SEE WHAT YOUR ANALYSIS BECOMES</span><div class="pt-home-report-page"><div class="pt-home-report-band"><div><small>PRESENTED BY</small><strong>PropertyThesis</strong><em>Demonstration Report</em></div><div><strong>PropertyThesis</strong><em>Know the Numbers. Prove the Case.</em></div></div><div class="pt-home-report-body"><h3>Investment Property Analysis</h3><h4>Sample Investment Property, Tampa, FL</h4><div class="pt-home-report-meta"><span>Acquisition Price: $425,000</span><span>Prepared by: PropertyThesis</span></div><div class="pt-home-report-rule"></div><section><strong>Property Thesis</strong><p>The modeled income, financing and return profile support a clear investment case, subject to verification of the underlying assumptions.</p></section><h5>Investment Analysis Summary</h5><div class="pt-home-report-lines"><i></i><i></i><i></i></div></div></div><b class="pt-home-preview-action">Open the full sample report →</b></a>';}
    const note=root.querySelector('.pt-guest-access-note');if(note)note.textContent='Build the complete analysis setup without an account. Create a free account only when you are ready to calculate and save the results.';
  }
  function ensureExperience(sampleSection){
    let experience=document.getElementById('ptHomeExperience');
    if(experience)return;
    experience=document.createElement('div');experience.id='ptHomeExperience';experience.innerHTML=`
      <section class="pt-home-section pt-home-starter"><div class="pt-home-starter-copy"><div class="pt-home-eyebrow">TWO NUMBERS ARE ENOUGH TO BEGIN</div><h2>Know the price and expected rent? Build a thorough first analysis.</h2><p>PropertyThesis supplies visible starting defaults for the remaining assumptions, then guides you through income, expenses, financing, value, returns, taxes, risk and offer strategy. Review or replace any default as better information becomes available.</p><div class="pt-home-two-number-proof"><span><b>1</b> Acquisition price</span><span><b>2</b> Expected monthly rent</span><strong>→ Complete first-pass analysis</strong></div><div class="pt-home-no-card">No credit card. No account until you calculate and save the results.</div></div><form class="pt-home-starter-form" id="ptHomeStarterForm"><div class="pt-home-form-intro"><strong>Start with what you know</strong><span>Only price and rent are required.</span></div><label class="pt-home-address-field">Property address <em>Optional</em><input name="address" data-pt-home-address autocomplete="off"></label><div class="pt-home-starter-numbers"><label>Acquisition price <em>Required</em><input name="price" inputmode="decimal" required></label><label>Expected monthly rent <em>Required</em><input name="rent" inputmode="decimal" required></label></div><button type="submit">Build My Free Analysis <span>→</span></button></form></section>

      <section class="pt-home-section pt-home-consolidated" id="ptHomeClarity"><div class="pt-home-section-head"><div class="pt-home-eyebrow">ONE CONNECTED INVESTMENT ANALYSIS</div><h2>Start with two numbers. Control the details. Understand the decision.</h2><p>PropertyThesis supplies a transparent first pass, then lets you refine the assumptions and see exactly how they affect performance, value, returns and offer strategy.</p></div><div class="pt-home-analysis-map"><article class="pt-home-control-card"><div class="pt-home-card-kicker">ASSUMPTIONS YOU CONTROL</div><h3>Shape the analysis around the actual property.</h3><p>Every starting default is visible and editable—never hidden inside the calculation.</p><div class="pt-home-control-groups"><div><strong>Acquisition & property</strong><span>Price, units, closing costs, land value, repairs and improvement timing</span></div><div><strong>Income & occupancy</strong><span>Rents, other income, vacancy, concessions and income growth</span></div><div><strong>Operating expenses</strong><span>Taxes, insurance, management, maintenance, utilities, HOA and reserves</span></div><div><strong>Financing, taxes & exit</strong><span>Loan terms, rate, amortization, points, tax rates, appreciation, hold period and selling costs</span></div></div><div class="pt-home-default-note"><strong>Begin with defaults, then improve the evidence.</strong> Replace any starting value as property records, rent support or market information becomes available.</div></article><article class="pt-home-results-card"><div class="pt-home-card-kicker">METRICS & CONCLUSIONS PRODUCED</div><h3>See both the numbers and what they mean.</h3><p>Connected outputs move from operating performance to an actionable acquisition conclusion.</p><div class="pt-home-results-grid"><div><strong>Income & operations</strong><span>PGI, EGI, expenses, NOI and cash flow</span></div><div><strong>Debt coverage</strong><span>Debt service, amortization and DSCR</span></div><div><strong>Value support</strong><span>Cap rate, GRM and income-supported value</span></div><div><strong>Investor returns</strong><span>Cash-on-cash, IRR, NPV and equity reversion</span></div><div><strong>Risk & sensitivity</strong><span>Rent, vacancy, rate and price scenarios</span></div><div><strong>Offer guidance</strong><span>Maximum supported price, risks and investment thesis</span></div></div></article></div><div class="pt-home-deliverables"><div class="pt-home-deliverables-copy"><div class="pt-home-card-kicker">THE SAME ANALYSIS BECOMES</div><h3>Decision dashboard, professional report and multiyear pro forma.</h3><p>No disconnected calculators or re-entered assumptions. Each deliverable traces back to the same underlying property analysis and your selected holding period.</p></div><div class="pt-home-deliverable-links"><a href="sample-analysis-viewer.html"><b>01</b><span><strong>Decision dashboard</strong><em>Explore the guided example</em></span></a><a href="sample-report-viewer.html?v=2"><b>02</b><span><strong>Professional PDF report</strong><em>Open the sample report</em></span></a><a href="sample-pro-forma-viewer.html"><b>03</b><span><strong>Multiyear Excel pro forma</strong><em>View the sample pro forma</em></span></a></div></div><div class="pt-home-consolidated-cta"><span><strong>Built with real estate context.</strong> Transparent methodology, connected market evidence and professional outputs.</span><button type="button" data-pt-home-sample>Start My Free Analysis →</button></div></section>

      <section class="pt-home-section pt-home-faq"><div class="pt-home-section-head"><div class="pt-home-eyebrow">BEFORE YOU BEGIN</div><h2>What first-time users usually want to know.</h2></div><div class="pt-home-faq-grid"><details><summary>Is the first analysis really free?</summary><p>Yes. Your first complete property analysis, calculated results, professional report and Excel pro forma are free. No credit card is required.</p></details><details><summary>When do I create an account?</summary><p>You can enter and review the analysis assumptions first. We ask you to create or sign in to a free account only when you calculate and save the results.</p></details><details><summary>Can I change the default assumptions?</summary><p>Yes. Defaults help create the first pass, but every material assumption is visible and editable.</p></details><details><summary>What happens after I create the account?</summary><p>Your in-progress property is restored, calculated and saved to your profile so you can continue where you left off.</p></details><details><summary>Will editing the property use another analysis?</summary><p>No. You can revise, recalculate and regenerate reports for an unlocked property without using another property allowance.</p></details><details><summary>Is PropertyThesis an appraisal or investment guarantee?</summary><p>No. It is analytical and educational software. Results depend on the information and assumptions entered and should be independently verified.</p></details></div></section>

      `;
    sampleSection.insertAdjacentElement('beforebegin',experience);
    experience.querySelector('.pt-home-deliverables')?.remove();
    experience.querySelector('.pt-home-consolidated-cta')?.remove();
    experience.querySelector('.pt-home-faq')?.insertAdjacentHTML('beforeend','<div class="pt-home-faq-cta"><div><strong>Ready to test your property thesis?</strong><span>Start with the acquisition price and expected rent. No credit card is required.</span></div><button type="button" data-pt-home-sample>Start My Free Analysis →</button></div>');
    const form=experience.querySelector('#ptHomeStarterForm');form.onsubmit=e=>{e.preventDefault();const data=new FormData(form),addressInput=form.querySelector('[name="address"]');startFromHomepage(data.get('address')||'',data.get('price')||'',data.get('rent')||'',{placeId:addressInput?.dataset.placeId||'',lat:addressInput?.dataset.lat||'',lng:addressInput?.dataset.lng||''});};
    experience.querySelectorAll('[data-pt-home-sample]').forEach(button=>button.onclick=sample);
    experience.querySelectorAll('[data-pt-home-report]').forEach(button=>button.onclick=()=>location.href='sample-report-viewer.html?v=2');
  }
  function apply(){
    const shell=document.getElementById('appNavShell'),hero=document.getElementById('ptGuestGuidance'),sampleSection=document.getElementById('ptSampleShowcase');if(!shell||!hero||!sampleSection)return false;
    const guest=signedOut(),free=freeMode(),params=new URLSearchParams(location.search),listings=guest&&!free&&params.get('listing-search')==='1';document.body.classList.toggle('pt-guest-landing',guest&&!free&&!listings);document.body.classList.toggle('pt-guest-analysis',guest&&free);document.body.classList.toggle('pt-guest-listings',listings);
    if(guest&&!free&&!signInRequestHandled&&params.get('signin')==='1'){
      signInRequestHandled=true;
      const plan=params.get('plan'),cleanParams=new URLSearchParams(params);
      cleanParams.delete('signin');
      cleanParams.delete('return');
      const cleanQuery=cleanParams.toString();
      history.replaceState(null,'',location.pathname+(cleanQuery?'?'+cleanQuery:'')+location.hash);
      setTimeout(()=>auth('signin',plan?'Sign in to continue with the selected PropertyThesis plan.':'Sign in to your PropertyThesis account.'),80);
    }
    const standard=shell.querySelector('.app-nav-actions'),guestNav=shell.querySelector('.pt-guest-nav');
    if(guest&&free){ensureNav(shell);enterFreeAnalysis();return true;}
    if(!guest){freeAnalysisActive=false;if(standard)standard.hidden=false;if(guestNav)guestNav.hidden=true;document.querySelectorAll('#ptHomeExperience').forEach(x=>x.hidden=true);accountNotice();return true;}
    ensureNav(shell);upgradeHero(hero);ensureExperience(sampleSection);document.querySelectorAll('#ptHomeExperience').forEach(x=>x.hidden=false);return true;
  }
  function start(){
    if(entryParams.get('free-analysis')==='1'&&!entryParams.get('starter-price')&&!entryParams.get('starter-rent')){
      freeAnalysisActive=false;entryParams.delete('free-analysis');entryParams.delete('cb');
      history.replaceState(null,'',location.pathname+(entryParams.toString()?'?'+entryParams:'')+location.hash);
      setTimeout(()=>document.getElementById('ptHomeStarterForm')?.scrollIntoView({behavior:'smooth',block:'center'}),650);
    }
    installReturnRoute();apply();[100,250,500,800,1200,1800,2600,4000,6000].forEach(ms=>setTimeout(apply,ms));setInterval(apply,2000);try{cloudClient?.auth?.onAuthStateChange?.((event)=>{if(event==='SIGNED_OUT'){freeAnalysisActive=false;freeEntered=false;noticeUser='';document.getElementById('ptAccountUpgradeBanner')?.remove();setTimeout(()=>{apply();window.scrollTo({top:0,behavior:'auto'});},0);}else if(event==='SIGNED_IN'){freeAnalysisActive=false;[0,100,350].forEach(ms=>setTimeout(apply,ms));}});}catch(_e){}window.addEventListener('pt:billing-updated',()=>{[700,1800,4000].forEach(ms=>setTimeout(()=>{noticeUser='';accountNotice()},ms))});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
