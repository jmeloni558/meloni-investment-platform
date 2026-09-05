'use strict';
(()=>{
  const VERSION=4;
  if((window.__ptTransientStatusCleanupV||0)>=VERSION)return;
  window.__ptTransientStatusCleanupV=VERSION;

  function removeGuidedPill(){
    document.querySelectorAll('.stage-pill').forEach(el=>{
      const t=(el.textContent||'').trim().toLowerCase();
      if(t==='guided analysis'||t==='calculation service unavailable'||t==='advanced analysis unavailable')el.remove();
    });
  }

  function clearNewAnalysisStatus(){
    try{window.PropertyThesisIncomeEngineBridge?.clearTransientStatus?.();}catch(_e){}
    removeGuidedPill();
  }

  function isSignedOut(){
    const authUser=document.getElementById('authUser');
    const txt=(authUser?.textContent||'').trim().toLowerCase();
    const signOut=document.getElementById('signOutBtn');
    const hidden=!signOut||signOut.hidden||signOut.classList.contains('hidden')||getComputedStyle(signOut).display==='none';
    return txt==='not signed in'||hidden;
  }

  function promptSignIn(){
    try{if(typeof authMsg==='function')authMsg('Sign in to unlock PropertyThesis calculators, reports, and market comparables.');}catch(_e){}
    try{if(typeof showAuth==='function')showAuth();}catch(_e){}
  }

  function ensureGuestFallback(){
    if(!isSignedOut())return false;
    try{window.AppNavigationToolbar?.refresh?.();}catch(_e){}
    if(document.getElementById('appNavShell'))return true;

    const workflow=document.getElementById('stage8Workflow');
    if(!workflow)return false;

    let style=document.getElementById('ptGuestFallbackStyles');
    if(!style){
      style=document.createElement('style');
      style.id='ptGuestFallbackStyles';
      style.textContent=`
        .pt-fallback-shell{margin:14px 0 12px;border:1px solid #d8e1e9;border-radius:13px;background:#fff;box-shadow:0 7px 24px rgba(16,24,40,.055);overflow:hidden}
        .pt-fallback-nav{display:flex;gap:7px;padding:10px;flex-wrap:wrap}
        .pt-fallback-nav button,.pt-fallback-btn{appearance:none;border:1px solid #bfd3e7;border-radius:8px;background:#fff;color:#175c92;padding:9px 12px;font-size:10px;font-weight:800;cursor:pointer;text-decoration:none}
        .pt-fallback-hero{margin:0 10px 10px;padding:24px;border:1px solid #d7e5f1;border-radius:14px;background:linear-gradient(135deg,#f8fbff,#eef6ff 55%,#f8fbff);display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:24px}
        .pt-fallback-eyebrow{font-size:10px;font-weight:900;letter-spacing:.13em;color:#2563eb;margin-bottom:7px}.pt-fallback-copy h2{margin:0 0 10px;color:#17365d;font-size:27px}.pt-fallback-copy p{color:#667085;font-size:12px;line-height:1.55}.pt-fallback-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.pt-fallback-primary{background:#175c92!important;color:#fff!important;border-color:#175c92!important}
        .pt-fallback-features{display:grid;grid-template-columns:1fr 1fr;gap:9px}.pt-fallback-feature{padding:13px;border:1px solid #dbe7f2;border-radius:11px;background:#fff}.pt-fallback-feature strong{display:block;color:#17365d;font-size:12px;margin-bottom:4px}.pt-fallback-feature span{color:#667085;font-size:10px;line-height:1.4}
        .pt-fallback-samples{margin:0 10px 10px;padding:22px;border:1px solid #d8e4ef;border-radius:14px;background:#fff}.pt-fallback-samples h2{text-align:center;color:#17365d;margin:0 0 7px}.pt-fallback-samples>p{text-align:center;color:#667085;font-size:12px;margin:0 0 18px}.pt-fallback-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pt-fallback-card{border:1px solid #dce6ef;border-radius:13px;padding:18px;background:linear-gradient(180deg,#fff,#f9fbfd)}.pt-fallback-card h3{margin:0 0 6px;color:#17365d;font-size:17px}.pt-fallback-card p{color:#667085;font-size:11px;line-height:1.5}.pt-fallback-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:14px 0}.pt-fallback-metric{padding:9px;border-radius:9px;background:#f1f6fb;border:1px solid #e0e9f2}.pt-fallback-metric span{display:block;color:#667085;font-size:8.5px;text-transform:uppercase}.pt-fallback-metric strong{display:block;margin-top:3px;color:#17365d;font-size:13px}
        @media(max-width:850px){.pt-fallback-hero,.pt-fallback-cards{grid-template-columns:1fr}}@media(max-width:520px){.pt-fallback-features,.pt-fallback-metrics{grid-template-columns:1fr 1fr}}
      `;
      document.head.appendChild(style);
    }

    const shell=document.createElement('div');
    shell.id='appNavShell';
    shell.className='pt-fallback-shell screen-only';
    shell.innerHTML=`
      <nav class="pt-fallback-nav" aria-label="Application tools">
        <button id="appNavNew" type="button">New Analysis</button>
        <button id="appNavExisting" type="button">Saved Properties</button>
        <button id="appNavMortgage" type="button">Mortgage Tools</button>
      </nav>
      <section id="ptGuestGuidance" class="pt-fallback-hero">
        <div class="pt-fallback-copy">
          <div class="pt-fallback-eyebrow">REAL ESTATE INVESTMENT UNDERWRITING</div>
          <h2>Know the Numbers. Make the Offer.</h2>
          <p>PropertyThesis brings income, financing, valuation, returns, market evidence and acquisition strategy into one connected investment analysis.</p>
          <p>Go beyond a basic calculator. Understand what drives the deal, what the property supports, and how to present the investment case clearly.</p>
          <div class="pt-fallback-actions"><button class="pt-fallback-btn pt-fallback-primary" id="ptGuestExplore" type="button">Start Exploring</button><button class="pt-fallback-btn" id="ptGuestSignIn" type="button">Sign In / Create Account</button></div>
        </div>
        <div class="pt-fallback-features"><div class="pt-fallback-feature"><strong>Underwrite</strong><span>Income, expenses, financing & cash flow</span></div><div class="pt-fallback-feature"><strong>Value</strong><span>Cap rate, GRM & income-supported pricing</span></div><div class="pt-fallback-feature"><strong>Decide</strong><span>Returns, sensitivity & offer analysis</span></div><div class="pt-fallback-feature"><strong>Support</strong><span>Market rent, sales comps & investment thesis</span></div></div>
      </section>
      <section id="ptSampleShowcase" class="pt-fallback-samples">
        <h2>See what a completed investment analysis can become.</h2>
        <p>Explore a completed sample analysis, a multiyear Excel pro forma, and a client-ready report.</p>
        <div class="pt-fallback-cards">
          <article class="pt-fallback-card"><h3>Sample Investment Analysis</h3><p>A completed read-only underwriting example showing acquisition terms, operating performance, financing, valuation support and decision analysis.</p><div class="pt-fallback-metrics"><div class="pt-fallback-metric"><span>Purchase Price</span><strong>$250,000</strong></div><div class="pt-fallback-metric"><span>Starting Rent</span><strong>$1,790/mo</strong></div><div class="pt-fallback-metric"><span>Vacancy</span><strong>10.0%</strong></div><div class="pt-fallback-metric"><span>Ordinary Tax</span><strong>28%</strong></div><div class="pt-fallback-metric"><span>Capital Gains Tax</span><strong>15%</strong></div><div class="pt-fallback-metric"><span>Holding Period</span><strong>User Selected</strong></div></div><div class="pt-fallback-actions"><a class="pt-fallback-btn" href="sample-analysis.html" target="_blank" rel="noopener">Explore Sample Analysis</a><a class="pt-fallback-btn" href="sample-pro-forma.html" target="_blank" rel="noopener">View Sample Pro Forma</a></div></article>
          <article class="pt-fallback-card"><h3>Sample Professional Report</h3><p>See how PropertyThesis turns the underlying analysis into a polished, client-ready investment underwriting report.</p><div class="pt-fallback-actions"><a class="pt-fallback-btn" href="sample-report.html">Open Sample Report</a></div></article>
        </div>
      </section>`;

    workflow.insertAdjacentElement('beforebegin',shell);
    document.getElementById('ptGuestSignIn')?.addEventListener('click',promptSignIn);
    document.getElementById('appNavExisting')?.addEventListener('click',promptSignIn);
    document.getElementById('appNavMortgage')?.addEventListener('click',promptSignIn);
    document.getElementById('appNavNew')?.addEventListener('click',()=>{try{window.WorkflowNavigationController?.newAnalysis?.();}catch(_e){};setTimeout(()=>document.getElementById('assumptions')?.scrollIntoView({behavior:'smooth',block:'start'}),50);});
    document.getElementById('ptGuestExplore')?.addEventListener('click',()=>workflow.scrollIntoView({behavior:'smooth',block:'start'}));
    return true;
  }

  function schedule(){
    [0,60,180,400].forEach(ms=>setTimeout(removeGuidedPill,ms));
    [250,700,1400,2500,4000,6500].forEach(ms=>setTimeout(ensureGuestFallback,ms));
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#appNavNew,#s10NewAnalysis')){
      [0,50,140].forEach(ms=>setTimeout(clearNewAnalysisStatus,ms));
      return;
    }
    if(e.target?.closest?.('[data-s8-tab="assumptions"],[data-tab="assumptions"]'))schedule();
  },true);

  window.PropertyThesisTransientStatusCleanup={version:VERSION,removeGuidedPill,clearNewAnalysisStatus,ensureGuestFallback};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
