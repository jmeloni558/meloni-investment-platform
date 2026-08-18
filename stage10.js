'use strict';
(() => {
  const VERSION=7;
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
    if(workflow.dataset.stage10Layout==='6'){wireControls();simplifyAnalysisSetup();applyCurrentInputUI();return true;}
    const advancedPanel=document.getElementById('s8AdvancedPanel');if(advancedPanel)advancedPanel.remove();
    steps.classList.add('s10-workflow-row');
    steps.innerHTML=`<div class="s10-row-label"><span>Primary Workflow</span><small>Complete these steps in order for a typical analysis</small></div><div class="s10-step-grid"><button class="s8-step" data-s8-tab="assumptions"><span class="s8-num">1</span><span><b>Analysis Setup</b><small>Enter property, rent & financing</small></span></button><button class="s8-step" data-s8-tab="dashboard"><span class="s8-num">2</span><span><b>Review Results</b><small>Review value, returns & coverage</small></span></button><button class="s8-step" data-s8-tab="report"><span class="s8-num">3</span><span><b>Client Report</b><small>Finalize conclusion & PDF</small></span></button></div>`;
    let utilities=document.getElementById('s10Utilities');if(!utilities){utilities=document.createElement('div');utilities.id='s10Utilities';utilities.className='s10-utilities';steps.insertAdjacentElement('afterend',utilities);}
    utilities.innerHTML=`<div class="s10-utilities-label"><span>Utilities</span><small>Use these only when you need saved files or detailed tools</small></div><div class="s10-utilities-actions"><button class="s10-existing" id="s10Existing"><span class="s10-icon">⌕</span><span><b>Existing Properties</b><small>Search and reopen saved files</small></span></button><button class="s8-advanced-toggle s10-advanced" id="s8AdvancedToggle" aria-expanded="false"><span class="s10-tool-icon">⚙</span><span><b>Advanced Tools</b><small>Schedules, scenarios & cloud tools</small></span></button></div>`;
    if(advancedPanel)utilities.appendChild(advancedPanel);
    if(context&&!document.getElementById('s10NewAnalysis')){const btn=document.createElement('button');btn.id='s10NewAnalysis';btn.className='btn primary';btn.textContent='New Analysis';btn.onclick=resetNewAnalysis;context.appendChild(btn);}
    let st=document.getElementById('stage10Styles');if(!st){st=document.createElement('style');st.id='stage10Styles';document.head.appendChild(st)}
    st.textContent=`#stage8Workflow .s10-workflow-row{display:block;border:1px solid var(--line);border-top:0;border-radius:0;background:#fff;overflow:visible}.s10-row-label{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 12px;background:#f7fbff;border-bottom:1px solid #d9e7f2}.s10-row-label span,.s10-utilities-label span{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#174f83}.s10-row-label small,.s10-utilities-label small{font-size:9px;color:#667085}.s10-step-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.s10-step-grid .s8-step{min-height:62px;border-right:1px solid var(--line);border-bottom:0}.s10-step-grid .s8-step:last-child{border-right:0}.s10-utilities{margin-top:10px;border:1px solid #d8dee6;border-radius:10px;background:#f8fafc;overflow:hidden}.s10-utilities-label{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:7px 12px;border-bottom:1px solid #e3e8ee;background:#f1f4f7}.s10-utilities-label span{color:#596579}.s10-utilities-actions{display:flex;gap:8px;padding:9px 10px}.s10-existing,.s10-advanced{appearance:none;border:1px solid #d8dee6;border-radius:8px;background:#fff;padding:9px 12px;display:flex;gap:9px;text-align:left;align-items:center;cursor:pointer;min-width:210px}.s10-existing:hover,.s10-advanced:hover{background:#f4f7fa;border-color:#bfc9d4}.s10-existing.active,.s10-advanced.active{background:#eef3f7;border-color:#9fb3c5}.s10-existing b,.s10-advanced b{display:block;font-size:11px;color:#344054}.s10-existing small,.s10-advanced small{display:block;font-size:9px;line-height:1.3;color:#667085;margin-top:2px}.s10-icon,.s10-tool-icon{width:24px;height:24px;border-radius:6px;background:#e8edf2;color:#475467;font-weight:900;font-size:15px;display:grid;place-items:center;flex:0 0 24px}#s10Utilities .s8-advanced{border:0;border-top:1px solid #e3e8ee;border-radius:0;background:#fff;padding:10px 12px}#s10NewAnalysis{white-space:nowrap;margin-left:12px}.s10-review-results{min-width:150px}@media(max-width:850px){.s10-step-grid{grid-template-columns:1fr}.s10-step-grid .s8-step{border-right:0;border-bottom:1px solid var(--line)}.s10-step-grid .s8-step:last-child{border-bottom:0}.s10-utilities-actions{display:grid;grid-template-columns:1fr 1fr}.s10-existing,.s10-advanced{min-width:0}.s10-row-label,.s10-utilities-label{display:block}.s10-row-label small,.s10-utilities-label small{display:block;margin-top:2px}}@media(max-width:620px){.s10-utilities-actions{grid-template-columns:1fr}#s10NewAnalysis{margin:8px 0 0}}`;
    workflow.dataset.stage10Layout='6';wireControls();simplifyAnalysisSetup();applyCurrentInputUI();return true;
  }

  function wireControls(){document.querySelectorAll('#stage8Workflow [data-s8-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.s8Tab));const existing=document.getElementById('s10Existing');if(existing)existing.onclick=openExisting;const adv=document.getElementById('s8AdvancedToggle');if(adv)adv.onclick=toggleAdvanced;const newBtn=document.getElementById('s10NewAnalysis');if(newBtn)newBtn.onclick=resetNewAnalysis;const review=document.getElementById('s10ReviewResults');if(review)review.onclick=reviewResults;}

  function relabelHelp(){const map={propertyhub:['Existing Properties','Search saved properties here. This is a utility area for reopening prior work, not part of the normal three-step analysis workflow.'],dashboard:['Step 2 — Review Results','Review NOI, cap rate, IRR, NPV, DSCR, cash flow, and valuation. Adjust assumptions if needed before preparing the report.'],report:['Step 3 — Client Report','Finalize the concluded value range and commentary, save the analysis, and generate the branded client PDF.']};for(const [id,[title,text]] of Object.entries(map)){const sec=document.getElementById(id),help=sec?.querySelector('.s8-help');if(!help)continue;const strong=help.querySelector('strong'),p=help.querySelector('p');if(strong)strong.textContent=title;if(p)p.textContent=text;}document.querySelector('#assumptions .s8-help')?.remove();}

  function refreshState(){if(document.getElementById('stage8Workflow')?.dataset.stage10Layout!=='6')rebuildWorkflow();wireControls();simplifyAnalysisSetup();relabelHelp();applyCurrentInputUI();const active=document.querySelector('.section.active')?.id||'';document.querySelectorAll('#stage8Workflow [data-s8-tab]').forEach(b=>b.classList.toggle('active',b.dataset.s8Tab===active));const existing=document.getElementById('s10Existing');if(existing)existing.classList.toggle('active',active==='propertyhub'||active==='propertyfile');const adv=document.getElementById('s8AdvancedToggle');if(adv)adv.classList.toggle('active',advancedTabs.includes(active));const next=document.getElementById('s8NextText');if(next){if(active==='assumptions')next.textContent='Next: enter the assumptions, then click Review Results.';else if(active==='dashboard')next.textContent='Next: confirm the investment results, then prepare the client report.';else if(active==='report')next.textContent='Final step: save the analysis and download the client PDF.';else if(active==='propertyhub'||active==='propertyfile')next.textContent='Utility area: open a saved property, or click New Analysis to return to the primary workflow.';else if(advancedTabs.includes(active))next.textContent='Advanced utility view: use this detailed tool, then return to the primary workflow.';}}

  function start(){let tries=0;const timer=setInterval(()=>{if(rebuildWorkflow()){relabelHelp();refreshState();clearInterval(timer)}if(++tries>60)clearInterval(timer);},150);document.addEventListener('click',()=>setTimeout(refreshState,0));const badge=document.querySelector('.stage-pill');if(badge)badge.textContent='Guided Analysis';}

  window.Stage10Workflow={refresh:refreshState,newAnalysis:resetNewAnalysis,existing:openExisting,toggleAdvanced,reviewResults};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();