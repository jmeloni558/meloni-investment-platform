'use strict';
(()=>{
  const VERSION=38;
  if((window.__appNavigationToolbarV||0)>=VERSION)return;
  window.__appNavigationToolbarV=VERSION;

  const retired=new Set(['cashflow','debt','taxes','amort','support','cloud','buydown']);
  const contextualOnly=new Set(['scenarios']);
  const primary=['assumptions','dashboard','report'];
  const PENDING_FREE='ptPendingFreeAnalysisV1';
  let mortgageMode=false;
  let resumingFree=false;
  let freeDraftReady=false;
  let requestedActionHandled=false;

  function activeSection(){return document.querySelector('.section.active')?.id||'';}
  function isSignedIn(){try{return typeof cloudUser!=='undefined'&&!!cloudUser}catch(e){return false}}
  function uiShowsSignedOut(){
    const authUser=document.getElementById('authUser');
    const authText=(authUser?.textContent||'').trim().toLowerCase();
    const signOut=document.getElementById('signOutBtn');
    const signOutHidden=!signOut||signOut.classList.contains('hidden')||signOut.hidden||getComputedStyle(signOut).display==='none';
    return authText==='not signed in'||signOutHidden;
  }
  function promptSignIn(message='Sign in to run PropertyThesis calculations.',mode='signin'){
    if(window.PropertyThesisAuth?.open){window.PropertyThesisAuth.open(mode,message);return;}
    try{if(typeof authMsg==='function')authMsg(message);}catch(e){}
    try{if(typeof showAuth==='function')showAuth();}catch(e){}
  }
  function pendingFree(){try{const draft=JSON.parse(localStorage.getItem(PENDING_FREE)||'null');if(!draft?.createdAt||Date.now()-draft.createdAt>86400000){localStorage.removeItem(PENDING_FREE);return null;}return draft;}catch(_e){localStorage.removeItem(PENDING_FREE);return null;}}
  function freeMode(){return new URLSearchParams(location.search).get('free-analysis')==='1'||!!pendingFree();}
  function captureFreeDraft(){
    try{
      document.querySelectorAll('#guidedSetup [data-src]').forEach(input=>{const src=document.getElementById(input.dataset.src);if(src)src.value=input.value;});
      const values={};document.querySelectorAll('#assumptions input[id],#assumptions select[id],#assumptions textarea[id]').forEach(el=>{
        if(el.id.startsWith('review_')||Object.prototype.hasOwnProperty.call(values,el.id))return;
        values[el.id]=el.type==='checkbox'?el.checked:el.value;
      });
      localStorage.setItem(PENDING_FREE,JSON.stringify({values,createdAt:Date.now()}));return true;
    }catch(_e){return false;}
  }
  function restoreFreeDraft(){
    try{const draft=pendingFree();if(!draft?.values)return false;Object.entries(draft.values).forEach(([id,value])=>{const el=document.getElementById(id);if(!el)return;if(el.type==='checkbox')el.checked=!!value;else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});return true;}catch(_e){return false;}
  }
  async function resumeFreeAnalysis(){
    if(window.__ptConfirmationHandoff||resumingFree||freeDraftReady||!pendingFree()||!isSignedIn())return false;
    if(!window.GuidedAnalysisSetup?.go)return false;
    resumingFree=true;
    try{
      restoreFreeDraft();try{if(typeof readFields==='function')readFields();}catch(_e){}
      go('assumptions');
      restoreFreeDraft();try{if(typeof readFields==='function')readFields();}catch(_e){}
      window.GuidedAnalysisSetup.go(6);freeDraftReady=true;
      const q=new URLSearchParams(location.search);if(q.has('resume-free')){q.delete('resume-free');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash);}
      try{if(typeof setStatus==='function')setStatus('Your analysis has been restored. Review the assumptions, then calculate and save the results.');}catch(_e){}
      return true;
    }catch(err){
      try{if(typeof setStatus==='function')setStatus('Unable to restore the free analysis: '+String(err?.message||err));}catch(_e){}
      return false;
    }finally{resumingFree=false;}
  }
  function guardCalculatorClick(e){
    if(isSignedIn()&&!uiShowsSignedOut())return;
    const btn=e.target?.closest?.('#gwSave,#gwNext,#calculateBtn,#quickCalc,#supportCalc,#scenarioCalc,#buydownCalc');
    if(!btn)return;
    const guidedAction=btn.id==='gwSave'||btn.id==='gwNext';
    const guidedFinal=guidedAction&&Number(document.querySelector('#gwSteps .gw-step.active[data-step]')?.dataset.step)===6;
    if((btn.id==='gwSave'||btn.id==='gwNext')&&!guidedFinal&&!/calculat/i.test(btn.textContent||''))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(freeMode()||guidedFinal)captureFreeDraft();
    promptSignIn('Create your free account to calculate, display, and save these results. Already have an account? Choose Sign In above. Your entered assumptions will be preserved.','signup');
  }

  function ensureMortgagePanel(){
    let panel=document.getElementById('appMortgageToolsPanel');
    if(panel)return panel;
    const workflow=document.getElementById('stage8Workflow');
    if(!workflow)return null;
    panel=document.createElement('section');
    panel.id='appMortgageToolsPanel';
    panel.className='screen-only';
    panel.style.display='none';
    panel.innerHTML=`<div class="pt-mortgage-loading" role="status">Loading Mortgage Tools…</div><iframe id="appMortgageToolsFrame" title="PropertyThesis Mortgage Tools" data-src="mortgage-tools.html?embedded=1&v=20260829-1735" style="width:100%;min-height:900px;border:0;background:transparent;display:block;visibility:hidden"></iframe>`;
    workflow.insertAdjacentElement('beforebegin',panel);
    const frame=panel.querySelector('iframe');
    const fit=()=>{try{const d=frame.contentDocument;if(!d)return;const h=Math.max(d.documentElement.scrollHeight,d.body.scrollHeight);frame.style.height=(h+20)+'px';}catch(e){}};
    frame.addEventListener('load',()=>{frame.style.visibility='visible';panel.querySelector('.pt-mortgage-loading')?.remove();fit();setTimeout(fit,150);setTimeout(fit,700);try{new frame.contentWindow.ResizeObserver(fit).observe(frame.contentDocument.body)}catch(e){}});
    return panel;
  }

  function setMortgageMode(on){
    mortgageMode=!!on;
    const panel=on?ensureMortgagePanel():document.getElementById('appMortgageToolsPanel');
    if(panel)panel.style.display=on?'block':'none';
    document.querySelectorAll('.section').forEach(s=>{
      if(on){if(s.classList.contains('active'))s.dataset.ptWasActive='1';s.style.display='none';}
      else{s.style.removeProperty('display');if(s.dataset.ptWasActive==='1')delete s.dataset.ptWasActive;}
    });
    const workflow=document.getElementById('stage8Workflow');if(workflow)workflow.style.display=on?'none':'';
    const mortgage=document.getElementById('appNavMortgage');if(mortgage)mortgage.classList.toggle('active',on);
    const newBtn=document.getElementById('appNavNew');if(newBtn)newBtn.classList.toggle('active',!on&&primary.includes(activeSection()));
    const existing=document.getElementById('appNavExisting');if(existing)existing.classList.toggle('active',!on&&activeSection()==='propertyhub');
  }

  function go(id){setMortgageMode(false);if(retired.has(id))id='dashboard';try{if(window.WorkflowNavigationController?.go){window.WorkflowNavigationController.go(id);return;}}catch(e){}try{if(typeof switchTab==='function')switchTab(id);}catch(e){}}
  function newAnalysis(){setMortgageMode(false);try{window.WorkflowNavigationController?.newAnalysis?.();}catch(e){}setTimeout(refresh,0);}
  function openExisting(){
    setMortgageMode(false);
    try{if(typeof cloudUser!=='undefined'&&!cloudUser){if(typeof showAuth==='function')showAuth();return;}if(typeof switchTab==='function')switchTab('propertyhub');else go('propertyhub');try{window.Stage6Dashboard?.render?.();}catch(_e){}if(typeof refreshCloud==='function')Promise.resolve(refreshCloud()).then(()=>{try{window.Stage6Dashboard?.render?.();}catch(_e){}}).catch(()=>{});}
    catch(e){try{if(typeof switchTab==='function')switchTab('propertyhub');else go('propertyhub');}catch(_e){}try{window.Stage6Dashboard?.render?.();}catch(_e){}}
    setTimeout(refresh,0);
  }
  function openMortgageTools(){if(!isSignedIn()){promptSignIn('Sign in to use PropertyThesis Mortgage Tools and calculators.');return;}const panel=ensureMortgagePanel(),frame=panel?.querySelector('iframe');setMortgageMode(true);window.scrollTo({top:document.getElementById('appNavShell')?.offsetTop||0,behavior:'auto'});if(frame&&!frame.getAttribute('src'))requestAnimationFrame(()=>frame.setAttribute('src',frame.dataset.src));}

  function handleRequestedAction(){
    if(requestedActionHandled||!isSignedIn())return false;
    const params=new URLSearchParams(location.search),action=params.get('app-action');if(!action)return false;
    requestedActionHandled=true;params.delete('app-action');history.replaceState(null,'',location.pathname+(params.toString()?'?'+params:'')+location.hash);
    if(action==='new')newAnalysis();
    else if(action==='existing')openExisting();
    else if(action==='mortgage')openMortgageTools();
    else if(action==='search-listings')window.PropertyThesisListingSearch?.open?.();
    else if(action==='search-properties')window.ToolbarLibrarySearch?.open?.('property');
    else if(action==='search-clients')window.ToolbarLibrarySearch?.open?.('client');
    return true;
  }

  function ensureStyles(){
    let st=document.getElementById('appNavigationToolbarStyles');if(!st){st=document.createElement('style');st.id='appNavigationToolbarStyles';document.head.appendChild(st)}
    st.textContent=`
      .app-nav-shell{margin:14px 0 12px;border:1px solid #d8e1e9;border-radius:13px;background:#fff;box-shadow:0 7px 24px rgba(16,24,40,.055);overflow:hidden}.app-nav-toolbar{display:flex;align-items:center;gap:7px;padding:10px}.app-nav-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.app-nav-action{appearance:none;border:1px solid #d7e0e8;border-radius:8px;background:#fff;padding:9px 12px;font-size:9.5px;font-weight:800;color:#344054;cursor:pointer;white-space:nowrap}.app-nav-action.active{background:#175c92!important;border-color:#175c92!important;color:#fff!important;box-shadow:0 4px 12px rgba(23,92,146,.18)}
      .pt-guest-guidance{margin:0 10px 10px;padding:0;border:1px solid #d7e5f1;border-radius:14px;background:linear-gradient(135deg,#f8fbff 0%,#eef6ff 55%,#f8fbff 100%);color:#344054;overflow:hidden;box-shadow:0 8px 22px rgba(23,92,146,.06)}.pt-guest-promo-inner{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:24px;padding:24px}.pt-guest-eyebrow{font-size:10px;font-weight:900;letter-spacing:.13em;color:#2563eb;margin-bottom:7px}.pt-guest-copy h2{margin:0 0 10px;color:#17365d;font-size:27px;line-height:1.12}.pt-guest-lead{margin:0 0 8px;font-size:15px;line-height:1.55;color:#344054}.pt-guest-sub{margin:0;color:#667085;font-size:12px;line-height:1.5}.pt-guest-promo-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:17px}.pt-guest-promo-actions button{border-radius:9px;padding:10px 14px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.pt-guest-primary{background:#175c92;color:#fff;border:1px solid #175c92}.pt-guest-secondary{background:#fff;color:#175c92;border:1px solid #bfd3e7}.pt-guest-access-note{margin-top:12px;color:#667085;font-size:10.5px;line-height:1.45}.pt-guest-feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;align-content:center}.pt-guest-feature{padding:13px;border:1px solid #dbe7f2;border-radius:11px;background:rgba(255,255,255,.88);min-height:70px}.pt-guest-feature strong{display:block;color:#17365d;font-size:12px;margin-bottom:4px}.pt-guest-feature span{display:block;color:#667085;font-size:10px;line-height:1.4}
      .pt-sample-showcase{margin:0 10px 10px;padding:22px;border:1px solid #d8e4ef;border-radius:14px;background:#fff;box-shadow:0 7px 24px rgba(16,24,40,.045)}.pt-sample-heading{text-align:center;max-width:760px;margin:0 auto 18px}.pt-sample-heading .eyebrow{font-size:10px;font-weight:900;letter-spacing:.13em;color:#2563eb;margin-bottom:6px}.pt-sample-heading h2{margin:0 0 7px;color:#17365d;font-size:23px}.pt-sample-heading p{margin:0;color:#667085;font-size:12px;line-height:1.55}.pt-sample-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pt-sample-card{border:1px solid #dce6ef;border-radius:13px;padding:18px;background:linear-gradient(180deg,#fff,#f9fbfd)}.pt-sample-card h3{margin:0 0 6px;color:#17365d;font-size:17px}.pt-sample-card p{margin:0 0 14px;color:#667085;font-size:11px;line-height:1.5}.pt-sample-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:0 0 14px}.pt-sample-metric{padding:9px;border-radius:9px;background:#f1f6fb;border:1px solid #e0e9f2}.pt-sample-metric span{display:block;color:#667085;font-size:8.5px;text-transform:uppercase;letter-spacing:.05em}.pt-sample-metric strong{display:block;margin-top:3px;color:#17365d;font-size:13px}.pt-sample-preview{height:112px;border:1px solid #dce6ef;border-radius:9px;background:linear-gradient(145deg,#edf5fc,#fff);display:flex;align-items:center;justify-content:center;text-align:center;color:#667085;font-size:10px;line-height:1.5;padding:12px;margin-bottom:14px}.pt-sample-actions{display:flex;gap:8px;flex-wrap:wrap}.pt-sample-btn{display:inline-block;appearance:none;border:1px solid #bfd3e7;border-radius:8px;background:#fff;color:#175c92;padding:9px 12px;font-size:10px;font-weight:800;cursor:pointer;text-decoration:none}.pt-sample-btn:hover{background:#f1f6fb;border-color:#9dbbd5}
      #appMortgageToolsPanel{margin:0 0 24px;background:transparent}.pt-mortgage-loading{min-height:240px;display:grid;place-items:center;color:#667085;font-size:13px;font-weight:700;background:#fff;border:1px solid #d8e1e9;border-radius:13px}.tab[data-tab="cashflow"],.tab[data-tab="debt"],.tab[data-tab="taxes"],.tab[data-tab="amort"],.tab[data-tab="support"],.tab[data-tab="cloud"],.tab[data-tab="scenarios"],.tab[data-tab="buydown"],[data-app-advanced],[data-s8-advanced]{display:none!important}#cashflow,#debt,#taxes,#amort,#support,#cloud,#buydown{display:none!important}#stage8Workflow.app-toolbar-clean .s8-context{display:none!important}#stage8Workflow.app-toolbar-clean #s10Utilities{display:none!important}#stage8Workflow.app-toolbar-clean .s10-workflow-row{border-top:1px solid var(--line);border-radius:10px}#stage8Workflow.app-toolbar-clean{margin-top:0}#report .s8-help{display:none!important}
      @media(max-width:850px){.pt-guest-promo-inner{grid-template-columns:1fr}.pt-guest-copy h2{font-size:24px}.pt-sample-cards{grid-template-columns:1fr}}@media(max-width:700px){.app-nav-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}.app-nav-action{width:100%}}@media(max-width:520px){.pt-guest-feature-grid{grid-template-columns:1fr}.pt-guest-promo-actions button{width:100%}.pt-sample-metrics{grid-template-columns:1fr 1fr}}@media(max-width:480px){.app-nav-actions{grid-template-columns:1fr}}
    `;
  }

  function ensureSampleShowcase(){
    const shell=document.getElementById('appNavShell');if(!shell)return null;
    let section=document.getElementById('ptSampleShowcase');
    if(!section){
      section=document.createElement('section');section.id='ptSampleShowcase';section.className='pt-sample-showcase screen-only';
      section.innerHTML=`<div class="pt-sample-heading"><div class="eyebrow">SEE PROPERTYTHESIS IN ACTION</div><h2>See what a completed investment analysis can become.</h2><p>Open a completed underwriting analysis, review the full 10-year pro forma, and see the client-ready report produced from the same sample property.</p></div><div class="pt-sample-cards"><article class="pt-sample-card"><h3>Sample Investment Analysis</h3><p>A completed read-only underwriting example showing acquisition terms, operating performance, financing, valuation support and decision analysis.</p><div class="pt-sample-metrics"><div class="pt-sample-metric"><span>Purchase Price</span><strong>$425,000</strong></div><div class="pt-sample-metric"><span>Market Rent</span><strong>$4,750/mo</strong></div><div class="pt-sample-metric"><span>Cap Rate</span><strong>8.1%</strong></div><div class="pt-sample-metric"><span>Cash Flow</span><strong>$10,248/yr</strong></div><div class="pt-sample-metric"><span>DSCR</span><strong>1.42x</strong></div><div class="pt-sample-metric"><span>Analysis</span><strong>10-Year</strong></div></div><div class="pt-sample-actions"><a class="pt-sample-btn" href="sample-analysis.html" target="_blank" rel="noopener">Explore Sample Analysis</a><a class="pt-sample-btn" href="sample-pro-forma.html" target="_blank" rel="noopener">View Sample Pro Forma</a></div></article><article class="pt-sample-card"><h3>Sample Professional Report</h3><p>See how PropertyThesis turns the underlying analysis into a polished, client-ready investment underwriting report.</p><div class="pt-sample-preview"><div><strong style="display:block;color:#17365d;font-size:14px;margin-bottom:5px">PROPERTYTHESIS</strong>Investment Property Analysis<br>Executive conclusion • operating analysis • valuation • pro forma • decision support • investment thesis</div></div><div class="pt-sample-actions"><a class="pt-sample-btn" href="sample-report.html">Open Sample Report</a></div></article></div>`;
      shell.appendChild(section);
    }else if(section.parentElement!==shell){shell.appendChild(section);}
    section.hidden=!uiShowsSignedOut();
    return section;
  }

  function ensureToolbar(){
    const workflow=document.getElementById('stage8Workflow');if(!workflow)return false;ensureStyles();
    let shell=document.getElementById('appNavShell');
    if(!shell){shell=document.createElement('div');shell.id='appNavShell';shell.className='app-nav-shell screen-only';shell.innerHTML=`<nav class="app-nav-toolbar" aria-label="Application tools"><div class="app-nav-actions"><button class="app-nav-action" id="appNavNew">New Analysis</button><button class="app-nav-action" id="appNavExisting">Existing Properties</button><button class="app-nav-action" id="appNavMortgage">Mortgage Tools</button></div></nav><div id="ptGuestGuidance" class="pt-guest-guidance" hidden><div class="pt-guest-promo-inner"><div class="pt-guest-copy"><div class="pt-guest-eyebrow">REAL ESTATE INVESTMENT UNDERWRITING</div><h2>Know the Numbers. Prove the Case.</h2><p class="pt-guest-lead">PropertyThesis brings income, financing, valuation, returns, market evidence and acquisition strategy into one connected investment analysis.</p><p class="pt-guest-sub">Go beyond a basic calculator. Understand what drives the deal, what the property supports, and how to present the investment case clearly.</p><div class="pt-guest-promo-actions"><button type="button" class="pt-guest-primary" id="ptGuestExplore">Start Exploring</button><button type="button" class="pt-guest-secondary" id="ptGuestSignIn">Sign In / Create Account</button></div><div class="pt-guest-access-note">Calculations, professional reports, rental comparables and sales comparables are available after sign-in.</div></div><div class="pt-guest-feature-grid"><div class="pt-guest-feature"><strong>Underwrite</strong><span>Income, expenses, financing & cash flow</span></div><div class="pt-guest-feature"><strong>Value</strong><span>Cap rate, GRM & income-supported pricing</span></div><div class="pt-guest-feature"><strong>Decide</strong><span>Returns, sensitivity & offer analysis</span></div><div class="pt-guest-feature"><strong>Support</strong><span>Market rent, sales comps & investment thesis</span></div></div></div></div>`;workflow.insertAdjacentElement('beforebegin',shell);document.getElementById('appNavNew').addEventListener('click',newAnalysis);document.getElementById('appNavExisting').addEventListener('click',openExisting);document.getElementById('appNavMortgage').addEventListener('click',openMortgageTools);document.getElementById('ptGuestSignIn')?.addEventListener('click',()=>promptSignIn('Sign in to unlock PropertyThesis calculators, reports, and market comparables.'));document.getElementById('ptGuestExplore')?.addEventListener('click',()=>document.getElementById('stage8Workflow')?.scrollIntoView({behavior:'smooth',block:'start'}));}
    const actions=shell.querySelector('.app-nav-actions');
    if(actions&&!actions.querySelector('[data-app-glossary]')){const glossary=document.createElement('a');glossary.className='app-nav-action';glossary.dataset.appGlossary='1';glossary.href='glossary.html';glossary.textContent='Glossary';glossary.style.textDecoration='none';actions.appendChild(glossary);}
    ensureSampleShowcase();return true;
  }
  function cleanWorkflow(){const workflow=document.getElementById('stage8Workflow');if(!workflow)return false;workflow.classList.add('app-toolbar-clean');return true;}
  function retireLegacyNavigation(){document.querySelectorAll('.tab[data-tab],[data-app-advanced],[data-s8-advanced]').forEach(el=>{const id=el.dataset.tab||el.dataset.appAdvanced||el.dataset.s8Advanced;if(retired.has(id)||contextualOnly.has(id))el.hidden=true;});const active=activeSection();if(retired.has(active))go('dashboard');}
  function refresh(){if(!ensureToolbar())return false;cleanWorkflow();retireLegacyNavigation();const guest=document.getElementById('ptGuestGuidance');if(guest)guest.hidden=!uiShowsSignedOut();const sample=document.getElementById('ptSampleShowcase');if(sample)sample.hidden=!uiShowsSignedOut();if(mortgageMode){setMortgageMode(true);return true;}const active=activeSection();const newBtn=document.getElementById('appNavNew');if(newBtn)newBtn.classList.toggle('active',primary.includes(active));const existing=document.getElementById('appNavExisting');if(existing)existing.classList.toggle('active',active==='propertyhub');const mortgage=document.getElementById('appNavMortgage');if(mortgage)mortgage.classList.remove('active');return true;}
  function scheduleResume(){[150,500,1000,1800,3000].forEach(ms=>setTimeout(resumeFreeAnalysis,ms));}
  function finishSignInNavigation(){
    [0,100,350].forEach(ms=>setTimeout(refresh,ms));
    if(pendingFree()){scheduleResume();return;}
    setTimeout(()=>{if(handleRequestedAction())return;setMortgageMode(false);try{if(typeof switchTab==='function')switchTab('propertyhub');else go('propertyhub');window.Stage6Dashboard?.render?.();}catch(_e){}setTimeout(refresh,0);},180);
  }
  function start(){let tries=0;const timer=setInterval(()=>{if(refresh())clearInterval(timer);if(++tries>80)clearInterval(timer)},120);document.addEventListener('click',()=>setTimeout(refresh,0));window.addEventListener('click',guardCalculatorClick,true);try{cloudClient?.auth?.onAuthStateChange?.((event,session)=>{if(session?.user){if(event==='SIGNED_IN')finishSignInNavigation();else{scheduleResume();setTimeout(handleRequestedAction,500);}}});cloudClient?.auth?.getSession?.().then(({data})=>{if(data?.session?.user&&sessionStorage.getItem('ptPasswordRecoveryPending')!=='1')finishSignInNavigation();}).catch(()=>{});}catch(_e){}window.addEventListener('storage',e=>{if(e.key==='ptEmailConfirmedAt')scheduleResume();});try{const channel=new BroadcastChannel('propertythesis-auth');channel.onmessage=e=>{if(e.data?.type==='email-confirmed'){try{window.focus();}catch(_e){}scheduleResume();}};}catch(_e){}[700,1400,2400,4000,6500].forEach(ms=>{setTimeout(resumeFreeAnalysis,ms);setTimeout(handleRequestedAction,ms+100);});setTimeout(refresh,700);setTimeout(refresh,1800);}
  window.AppNavigationToolbar={refresh,go,openExisting,openMortgageTools,setMortgageMode,resumeFreeAnalysis};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
