'use strict';
(() => {
  const VERSION=9;
  if((window.__stage10Version||0)>=VERSION)return;
  window.__stage10Version=VERSION;
  window.__stage10Initialized=true;

  const advancedTabs=['cashflow','debt','taxes','amort','buydown','scenarios','support','cloud'];

  function applyCurrentInputUI(){
    try{window.Stage13AssumptionGuidance?.apply?.();}catch(e){}
    try{window.Stage14TaxGuidance?.apply?.();}catch(e){}
    try{window.Stage15Layout?.apply?.();}catch(e){}
  }

  function clearNewAnalysisCoreFields(){
    ['f_price','f_land','f_units','f_rent'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    ['quickPrice','quickRent'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }

  function resetNewAnalysis(){
    selectedClientId=null;selectedPropertyId=null;selectedAnalysisId=null;selectedScenarioId=null;
    state={...defaults,price:0,land:0,units:1,rent:0,loanYears:30};
    if(typeof renderFields==='function')renderFields();
    clearNewAnalysisCoreFields();
    if(typeof render==='function')render();
    clearNewAnalysisCoreFields();
    applyCurrentInputUI();
    setTimeout(()=>{applyCurrentInputUI();clearNewAnalysisCoreFields();},0);
    setTimeout(()=>{applyCurrentInputUI();clearNewAnalysisCoreFields();},120);
    if(typeof setStatus==='function')setStatus('New analysis started — enter the property and investment assumptions');
    switchTab('assumptions');
    setTimeout(()=>{applyCurrentInputUI();clearNewAnalysisCoreFields();document.getElementById('f_address')?.focus();},80);
  }

  function openExisting(){switchTab('propertyhub');setTimeout(()=>document.getElementById('hubSearch')?.focus(),80);}

  function toggleAdvanced(){const panel=document.getElementById('s8AdvancedPanel');if(!panel)return;panel.classList.toggle('hidden');const btn=document.getElementById('s8AdvancedToggle');if(btn)btn.setAttribute('aria-expanded',String(!panel.classList.contains('hidden')));}

  function reviewResults(){
    try{if(typeof readFields==='function')readFields();if(typeof render==='function')render();if(typeof setStatus==='function')setStatus('Analysis updated — review the results');switchTab('dashboard');window.scrollTo({top:0,behavior:'smooth'});}catch(e){if(typeof setStatus==='function')setStatus('Please review the analysis inputs: '+e.message);}
  }

  function simplifyAnalysisSetup(){
    const sec=document.getElementById('assumptions');if(!sec)return;
    const topCard=sec.querySelector('.card.span-12');if(!topCard)return;
    const head=topCard.querySelector('.sectionhead');
    if(head){const h=head.querySelector('h2');const p=head.querySelector('p');if(h)h.textContent='Analysis Setup';if(p)p.textContent='Enter the property information and investment assumptions below. When finished, click Review Results.';let actions=head.querySelector('.actions');if(actions)actions.innerHTML='<button class="btn primary s10-review-results" id="s10ReviewResults" type="button">Review Results →</button>';}
    const review=document.getElementById('s10ReviewResults');if(review)review.onclick=reviewResults;
    document.getElementById('s10ReviewResultsBottom')?.remove();
  }

  function rebuildWorkflow(){
    const workflow=document.getElementById('stage8Workflow');if(!workflow)return false;
    const context=workflow.querySelector('.s8-context');const steps=workflow.querySelector('.s8-steps');if(!steps)return false;
    if(workflow.dataset.stage10Layout==='7'){wireControls();simplifyAnalysisSetup();applyCurrentInputUI();return true;}
    const advancedPanel=document.getElementById('s8AdvancedPanel');if(advancedPanel)advancedPanel.remove();
    steps.classList.add('s10-workflow-row');
    steps.innerHTML=`<div class="s10-row-label"><div><span>Workflow Navigation</span><small>Click a step to move through the analysis</small></div><strong class="s10-nav-hint">3-step investment workflow</strong></div><div class="s10-step-grid"><button class="s8-step" data-s8-tab="assumptions"><span class="s8-num">1</span><span class="s10-step-copy"><b>Analysis Setup</b><small>Enter property, rent & financing</small></span><span class="s10-step-cue">Open →</span></button><button class="s8-step" data-s8-tab="dashboard"><span class="s8-num">2</span><span class="s10-step-copy"><b>Review Results</b><small>Review value, returns & coverage</small></span><span class="s10-step-cue">Open →</span></button><button class="s8-step" data-s8-tab="report"><span class="s8-num">3</span><span class="s10-step-copy"><b>Client Report</b><small>Finalize conclusion & PDF</small></span><span class="s10-step-cue">Open →</span></button></div>`;
    let utilities=document.getElementById('s10Utilities');if(!utilities){utilities=document.createElement('div');utilities.id='s10Utilities';utilities.className='s10-utilities';steps.insertAdjacentElement('afterend',utilities);}
    utilities.innerHTML=`<div class="s10-utilities-label"><span>Utilities</span><small>Use these only when you need saved files or detailed tools</small></div><div class="s10-utilities-actions"><button class="s10-existing" id="s10Existing"><span class="s10-icon">⌕</span><span><b>Saved Properties</b><small>Search and reopen saved files</small></span></button><button class="s8-advanced-toggle s10-advanced" id="s8AdvancedToggle" aria-expanded="false"><span class="s10-tool-icon">⚙</span><span><b>Advanced Tools</b><small>Schedules, scenarios & cloud tools</small></span></button></div>`;
    if(advancedPanel)utilities.appendChild(advancedPanel);
    if(context&&!document.getElementById('s10NewAnalysis')){const btn=document.createElement('button');btn.id='s10NewAnalysis';btn.className='btn primary';btn.textContent='New Analysis';btn.onclick=resetNewAnalysis;context.appendChild(btn);}
    let st=document.getElementById('stage10Styles');if(!st){st=document.createElement('style');st.id='stage10Styles';document.head.appendChild(st)}
    st.textContent=`
      #stage8Workflow .s10-workflow-row{display:block;margin:0 0 22px;border:1px solid #cbdbea;border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 8px 24px rgba(20,58,94,.09)}
      #stage8Workflow .s10-row-label{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:12px 16px;background:linear-gradient(90deg,#edf6ff 0%,#f4fbff 55%,#eefaf8 100%);border-bottom:1px solid #cfe0ee}
      #stage8Workflow .s10-row-label>div{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
      #stage8Workflow .s10-row-label span,#stage8Workflow .s10-utilities-label span{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.085em;color:#174f83}
      #stage8Workflow .s10-row-label small,#stage8Workflow .s10-utilities-label small{font-size:10px;color:#5f7185;font-weight:650}
      #stage8Workflow .s10-nav-hint{font-size:9px;color:#53728d;text-transform:uppercase;letter-spacing:.055em;white-space:nowrap}
      #stage8Workflow .s10-step-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px;background:#f8fbfe}
      #stage8Workflow .s10-step-grid .s8-step{position:relative;min-height:78px;border:1px solid #d5e1eb!important;border-radius:10px!important;background:#fff!important;padding:13px 14px!important;display:grid!important;grid-template-columns:34px minmax(0,1fr) auto!important;align-items:center!important;gap:11px!important;text-align:left!important;cursor:pointer!important;box-shadow:0 2px 8px rgba(30,64,98,.035);transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease,background .15s ease}
      #stage8Workflow .s10-step-grid .s8-step:hover{transform:translateY(-2px);border-color:#8fb8df!important;box-shadow:0 8px 18px rgba(32,91,145,.12);background:#f8fcff!important}
      #stage8Workflow .s10-step-grid .s8-step .s8-num{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#eaf2f8;color:#365b79;font-size:12px;font-weight:900;border:1px solid #cfdeea}
      #stage8Workflow .s10-step-copy b{display:block;font-size:13px;line-height:1.25;color:#18334d}
      #stage8Workflow .s10-step-copy small{display:block;margin-top:4px;font-size:9.5px;line-height:1.35;color:#64758a}
      #stage8Workflow .s10-step-cue{font-size:9px;font-weight:850;color:#5e7c98;white-space:nowrap}
      #stage8Workflow .s10-step-grid .s8-step.active{border-color:#2563eb!important;background:linear-gradient(135deg,#eff6ff 0%,#f8fbff 100%)!important;box-shadow:0 9px 22px rgba(37,99,235,.16),inset 0 -4px 0 #2563eb!important;transform:translateY(-1px)}
      #stage8Workflow .s10-step-grid .s8-step.active .s8-num{background:#147dc1;color:#fff;border-color:#147dc1;box-shadow:0 0 0 4px rgba(20,125,193,.10)}
      #stage8Workflow .s10-step-grid .s8-step.active .s10-step-copy b{color:#0f4d82}
      #stage8Workflow .s10-step-grid .s8-step.active .s10-step-cue{color:#155fa8}
      #stage8Workflow .s10-step-grid .s8-step.active:after{content:'CURRENT STEP';position:absolute;top:7px;right:10px;font-size:7px;font-weight:950;letter-spacing:.08em;color:#1d5fa8}
      #stage8Workflow .s10-step-grid .s8-step.completed{border-color:#bad8ce!important;background:#f8fcfa!important}
      #stage8Workflow .s10-step-grid .s8-step.completed .s8-num{font-size:0;background:#e3f5ee;color:#15745b;border-color:#a9d5c6}
      #stage8Workflow .s10-step-grid .s8-step.completed .s8-num:after{content:'✓';font-size:14px;font-weight:950}
      #stage8Workflow .s10-step-grid .s8-step.completed .s10-step-cue{color:#317760}
      #stage8Workflow .s10-utilities{margin-top:10px;border:1px solid #d8dee6;border-radius:10px;background:#f8fafc;overflow:hidden}
      #stage8Workflow .s10-utilities-label{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:7px 12px;border-bottom:1px solid #e3e8ee;background:#f1f4f7}
      #stage8Workflow .s10-utilities-label span{color:#596579}
      #stage8Workflow .s10-utilities-actions{display:flex;gap:8px;padding:9px 10px}
      #stage8Workflow .s10-existing,#stage8Workflow .s10-advanced{appearance:none;border:1px solid #d8dee6;border-radius:8px;background:#fff;padding:9px 12px;display:flex;gap:9px;text-align:left;align-items:center;cursor:pointer;min-width:210px}
      #stage8Workflow .s10-existing:hover,#stage8Workflow .s10-advanced:hover{background:#f4f7fa;border-color:#bfc9d4}
      #stage8Workflow .s10-existing.active,#stage8Workflow .s10-advanced.active{background:#eef3f7;border-color:#9fb3c5}
      #stage8Workflow .s10-existing b,#stage8Workflow .s10-advanced b{display:block;font-size:11px;color:#344054}
      #stage8Workflow .s10-existing small,#stage8Workflow .s10-advanced small{display:block;font-size:9px;line-height:1.3;color:#667085;margin-top:2px}
      #stage8Workflow .s10-icon,#stage8Workflow .s10-tool-icon{width:24px;height:24px;border-radius:6px;background:#e8edf2;color:#475467;font-weight:900;font-size:15px;display:grid;place-items:center;flex:0 0 24px}
      #s10Utilities .s8-advanced{border:0;border-top:1px solid #e3e8ee;border-radius:0;background:#fff;padding:10px 12px}
      #s10NewAnalysis{white-space:nowrap;margin-left:12px}.s10-review-results{min-width:150px}
      @media(max-width:850px){#stage8Workflow .s10-step-grid{grid-template-columns:1fr;gap:8px}#stage8Workflow .s10-utilities-actions{display:grid;grid-template-columns:1fr 1fr}#stage8Workflow .s10-existing,#stage8Workflow .s10-advanced{min-width:0}#stage8Workflow .s10-row-label,#stage8Workflow .s10-utilities-label{display:block}#stage8Workflow .s10-row-label>div{display:block}#stage8Workflow .s10-row-label small,#stage8Workflow .s10-utilities-label small{display:block;margin-top:3px}#stage8Workflow .s10-nav-hint{display:block;margin-top:4px}}
      @media(max-width:620px){#stage8Workflow .s10-utilities-actions{grid-template-columns:1fr}#s10NewAnalysis{margin:8px 0 0}#stage8Workflow .s10-step-grid .s8-step{grid-template-columns:34px minmax(0,1fr)}#stage8Workflow .s10-step-cue{display:none}}
    `;
    workflow.dataset.stage10Layout='7';wireControls();simplifyAnalysisSetup();applyCurrentInputUI();return true;
  }

  function wireControls(){document.querySelectorAll('#stage8Workflow [data-s8-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.s8Tab));const existing=document.getElementById('s10Existing');if(existing)existing.onclick=openExisting;const adv=document.getElementById('s8AdvancedToggle');if(adv)adv.onclick=toggleAdvanced;const newBtn=document.getElementById('s10NewAnalysis');if(newBtn)newBtn.onclick=resetNewAnalysis;const review=document.getElementById('s10ReviewResults');if(review)review.onclick=reviewResults;}

  function relabelHelp(){
    document.querySelector('#assumptions .s8-help')?.remove();
    document.querySelector('#propertyhub .s8-help')?.remove();
    document.querySelector('#propertyfile .s8-help')?.remove();
    const map={dashboard:['Step 2 — Review Results','Review NOI, cap rate, IRR, NPV, DSCR, cash flow, and valuation. Adjust assumptions if needed before preparing the report.'],report:['Step 3 — Client Report','Finalize the concluded value range and commentary, save the analysis, and generate the branded client PDF.']};
    for(const [id,[title,text]] of Object.entries(map)){const sec=document.getElementById(id),help=sec?.querySelector('.s8-help');if(!help)continue;const strong=help.querySelector('strong'),p=help.querySelector('p');if(strong)strong.textContent=title;if(p)p.textContent=text;}
  }

  function refreshState(){
    if(document.getElementById('stage8Workflow')?.dataset.stage10Layout!=='7')rebuildWorkflow();
    wireControls();simplifyAnalysisSetup();relabelHelp();applyCurrentInputUI();
    const active=document.querySelector('.section.active')?.id||'';
    const primary=['assumptions','dashboard','report'];
    const activeIndex=primary.indexOf(active);
    document.querySelectorAll('#stage8Workflow [data-s8-tab]').forEach(b=>{
      const idx=primary.indexOf(b.dataset.s8Tab);
      b.classList.toggle('active',b.dataset.s8Tab===active);
      b.classList.toggle('completed',activeIndex>0&&idx>=0&&idx<activeIndex);
    });
    const existing=document.getElementById('s10Existing');if(existing)existing.classList.toggle('active',active==='propertyhub');
    const adv=document.getElementById('s8AdvancedToggle');if(adv)adv.classList.toggle('active',advancedTabs.includes(active));
    const next=document.getElementById('s8NextText');if(next){if(active==='assumptions')next.textContent='Next: enter the assumptions, then click Review Results.';else if(active==='dashboard')next.textContent='Next: confirm the investment results, then prepare the client report.';else if(active==='report')next.textContent='Final step: save the analysis and download the client PDF.';else if(active==='propertyhub')next.textContent='Utility area: open a saved property, or click New Analysis to return to the primary workflow.';else if(advancedTabs.includes(active))next.textContent='Advanced utility view: use this detailed tool, then return to the primary workflow.';}
  }

  function start(){let tries=0;const timer=setInterval(()=>{if(rebuildWorkflow()){relabelHelp();refreshState();clearInterval(timer)}if(++tries>60)clearInterval(timer);},150);document.addEventListener('click',()=>setTimeout(refreshState,0));const badge=document.querySelector('.stage-pill');if(badge)badge.textContent='Guided Analysis';}

  window.Stage10Workflow={refresh:refreshState,newAnalysis:resetNewAnalysis,existing:openExisting,toggleAdvanced,reviewResults};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();