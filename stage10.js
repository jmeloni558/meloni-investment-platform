'use strict';
(() => {
  if(window.__stage10Initialized)return;
  window.__stage10Initialized=true;

  function resetNewAnalysis(){
    selectedClientId=null;selectedPropertyId=null;selectedAnalysisId=null;selectedScenarioId=null;
    state={...defaults};
    if(typeof renderFields==='function')renderFields();
    if(typeof render==='function')render();
    if(typeof setStatus==='function')setStatus('New analysis started — enter the property and investment assumptions');
    switchTab('assumptions');
    setTimeout(()=>document.getElementById('f_name')?.focus(),80);
  }

  function openExisting(){
    switchTab('propertyhub');
    setTimeout(()=>document.getElementById('hubSearch')?.focus(),80);
  }

  function rebuildWorkflow(){
    const workflow=document.getElementById('stage8Workflow');
    if(!workflow)return false;
    const context=workflow.querySelector('.s8-context');
    let steps=workflow.querySelector('.s8-steps');
    if(!steps)return false;

    steps.innerHTML=`
      <button class="s10-existing" id="s10Existing"><span class="s10-icon">⌕</span><span><b>Existing Properties</b><small>Search and reopen saved files</small></span></button>
      <button class="s8-step" data-s8-tab="assumptions"><span class="s8-num">1</span><span><b>Analysis Setup</b><small>Enter property, rent & financing</small></span></button>
      <button class="s8-step" data-s8-tab="dashboard"><span class="s8-num">2</span><span><b>Review Results</b><small>Review value, returns & coverage</small></span></button>
      <button class="s8-step" data-s8-tab="report"><span class="s8-num">3</span><span><b>Client Report</b><small>Finalize conclusion & PDF</small></span></button>
      <button class="s8-advanced-toggle" id="s8AdvancedToggle"><b>Advanced Tools</b><small>Schedules, scenarios & cloud tools</small></button>`;

    if(context && !document.getElementById('s10NewAnalysis')){
      const btn=document.createElement('button');
      btn.id='s10NewAnalysis';btn.className='btn primary';btn.textContent='New Analysis';
      btn.onclick=resetNewAnalysis;
      context.appendChild(btn);
    }

    steps.querySelectorAll('[data-s8-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.s8Tab));
    document.getElementById('s10Existing').onclick=openExisting;
    const adv=document.getElementById('s8AdvancedToggle');
    if(adv)adv.onclick=()=>{
      const panel=document.getElementById('s8AdvancedPanel');
      if(panel)panel.classList.toggle('hidden');
    };

    if(!document.getElementById('stage10Styles')){
      const st=document.createElement('style');st.id='stage10Styles';st.textContent=`
        #stage8Workflow .s8-steps{grid-template-columns:minmax(165px,.9fr) repeat(3,minmax(0,1fr)) minmax(150px,.8fr)}
        .s10-existing{appearance:none;border:0;border-right:1px solid var(--line);background:#f8fafc;padding:12px;display:flex;gap:9px;text-align:left;align-items:center;cursor:pointer}
        .s10-existing:hover{background:#eef5fb}.s10-existing.active{background:#e8f2fa;box-shadow:inset 0 -3px 0 #175c92}
        .s10-existing b{display:block;font-size:12px;color:#174f83}.s10-existing small{display:block;font-size:9px;line-height:1.3;color:#667085;margin-top:2px}
        .s10-icon{width:24px;height:24px;border-radius:50%;background:#dceaf5;color:#175c92;font-weight:900;font-size:16px;display:grid;place-items:center;flex:0 0 24px}
        #s10NewAnalysis{white-space:nowrap;margin-left:12px}
        @media(max-width:1000px){#stage8Workflow .s8-steps{grid-template-columns:repeat(2,1fr)}.s10-existing{border-bottom:1px solid var(--line)}}
        @media(max-width:620px){#stage8Workflow .s8-steps{grid-template-columns:1fr}.s10-existing{border-right:0}#s10NewAnalysis{margin:8px 0 0}}
      `;document.head.appendChild(st);
    }
    return true;
  }

  function relabelHelp(){
    const map={
      propertyhub:['Existing Properties','Search saved properties here. Open a property file to continue prior work, or click New Analysis above to start a new investment analysis.'],
      assumptions:['Step 1 — Analysis Setup','Start here for a new analysis. Enter the property name and address once, then complete purchase price, rent, expenses, financing, taxes, and return assumptions.'],
      dashboard:['Step 2 — Review Results','Review NOI, cap rate, IRR, NPV, DSCR, cash flow, and valuation. Adjust assumptions if needed before preparing the report.'],
      report:['Step 3 — Client Report','Finalize the concluded value range and commentary, save the analysis, and generate the branded client PDF.']
    };
    for(const [id,[title,text]] of Object.entries(map)){
      const sec=document.getElementById(id),help=sec?.querySelector('.s8-help');
      if(!help)continue;
      const strong=help.querySelector('strong'),p=help.querySelector('p');
      if(strong)strong.textContent=title;if(p)p.textContent=text;
    }
  }

  function refreshState(){
    rebuildWorkflow();relabelHelp();
    const active=document.querySelector('.section.active')?.id||'';
    document.querySelectorAll('[data-s8-tab]').forEach(b=>b.classList.toggle('active',b.dataset.s8Tab===active));
    const existing=document.getElementById('s10Existing');if(existing)existing.classList.toggle('active',active==='propertyhub'||active==='propertyfile');
    const next=document.getElementById('s8NextText');
    if(next){
      if(active==='assumptions')next.textContent='Next: complete the analysis inputs, then review the results.';
      else if(active==='dashboard')next.textContent='Next: confirm the investment results, then prepare the client report.';
      else if(active==='report')next.textContent='Final step: save the analysis and download the client PDF.';
      else if(active==='propertyhub'||active==='propertyfile')next.textContent='Existing file mode: open a saved property, or click New Analysis to start fresh.';
    }
  }

  function start(){
    let tries=0;const timer=setInterval(()=>{
      if(rebuildWorkflow()){relabelHelp();refreshState();clearInterval(timer)}
      if(++tries>40)clearInterval(timer);
    },150);
    document.addEventListener('click',()=>setTimeout(refreshState,0));
    const badge=document.querySelector('.stage-pill');if(badge)badge.textContent='Guided Analysis';
  }

  window.Stage10Workflow={refresh:refreshState,newAnalysis:resetNewAnalysis,existing:openExisting};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
