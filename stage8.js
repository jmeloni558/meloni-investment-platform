'use strict';
(() => {
  if(window.__stage8Initialized)return;
  window.__stage8Initialized=true;

  const PRIMARY=[
    {step:1,label:'Properties',sub:'Choose or create a property',tab:'propertyhub'},
    {step:2,label:'Analysis Setup',sub:'Enter property, rent & financing',tab:'assumptions'},
    {step:3,label:'Review Results',sub:'Review value, returns & coverage',tab:'dashboard'},
    {step:4,label:'Client Report',sub:'Finalize conclusion & PDF',tab:'report'}
  ];
  const ADVANCED=[
    ['Cash Flow','cashflow'],['Debt Service','debt'],['Taxes','taxes'],['Amortization','amort'],
    ['Rate Buydown','buydown'],['Scenario Lab','scenarios'],['Price & Rent Support','support'],['Cloud Workspace','cloud']
  ];
  let advancedOpen=false;

  function currentContext(){
    const p=(cloudProperties||[]).find(x=>x.id===selectedPropertyId);
    const a=(cloudAnalyses||[]).find(x=>x.id===selectedAnalysisId);
    return {p,a};
  }
  function contextName(){
    const {p,a}=currentContext();
    return p?.name||a?.name||state?.name||'No property selected';
  }
  function nextText(active){
    if(active==='propertyhub')return '';
    if(active==='assumptions')return 'Next: complete the assumptions, then review the results.';
    if(active==='dashboard')return 'Next: review the results and scenarios, then prepare the client report.';
    if(active==='report')return 'Final step: confirm the conclusion, save to cloud, and download the client PDF.';
    return 'Advanced view. Return to the three-step workflow when you are finished here.';
  }
  function activeSection(){return document.querySelector('.section.active')?.id||'dashboard'}

  function inject(){
    if(document.getElementById('stage8Workflow'))return;
    const oldNav=document.querySelector('.nav');
    if(oldNav)oldNav.style.display='none';
    const shell=document.querySelector('.shell');
    if(!shell)return;
    const workflow=document.createElement('div');workflow.id='stage8Workflow';workflow.className='s8-wrap screen-only';
    workflow.innerHTML=`
      <div class="s8-context">
        <div><span class="s8-eyebrow">Current file</span><b id="s8ContextName">${esc4(contextName())}</b></div>
        <div class="s8-next" id="s8NextText"></div>
      </div>
      <div class="s8-steps">
        ${PRIMARY.map(x=>`<button class="s8-step" data-s8-tab="${x.tab}"><span class="s8-num">${x.step}</span><span><b>${x.label}</b><small>${x.sub}</small></span></button>`).join('')}
        <button class="s8-advanced-toggle" id="s8AdvancedToggle"><b>Advanced Tools</b><small>Detailed schedules & scenario tools</small></button>
      </div>
      <div class="s8-advanced hidden" id="s8AdvancedPanel">
        ${ADVANCED.map(([label,tab])=>`<button class="btn ghost" data-s8-advanced="${tab}">${label}</button>`).join('')}
      </div>`;
    oldNav?.insertAdjacentElement('afterend',workflow);

    if(!document.getElementById('stage8Styles')){
      const st=document.createElement('style');st.id='stage8Styles';st.textContent=`
        .s8-wrap{margin:12px 0 18px}.s8-context{display:flex;justify-content:space-between;gap:14px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:12px 12px 0 0;padding:10px 14px}.s8-context b{display:block;color:#172033;font-size:13px}.s8-eyebrow{display:block;text-transform:uppercase;letter-spacing:.06em;color:#667085;font-size:9px;font-weight:800}.s8-next{font-size:11px;color:#475467;text-align:right}.s8-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) minmax(150px,.8fr);border:1px solid var(--line);border-top:0;border-radius:0 0 12px 12px;overflow:hidden;background:#fff}.s8-step,.s8-advanced-toggle{appearance:none;border:0;border-right:1px solid var(--line);background:#fff;padding:12px;display:flex;gap:9px;text-align:left;align-items:center;cursor:pointer}.s8-steps>*:last-child{border-right:0}.s8-step:hover,.s8-advanced-toggle:hover{background:#f8fafc}.s8-step.active{background:#eef5fb;box-shadow:inset 0 -3px 0 #175c92}.s8-step b,.s8-advanced-toggle b{display:block;font-size:12px;color:#172033}.s8-step small,.s8-advanced-toggle small{display:block;font-size:9px;line-height:1.3;color:#667085;margin-top:2px}.s8-num{width:24px;height:24px;border-radius:50%;background:#edf1f5;color:#344054;font-weight:800;font-size:11px;display:grid;place-items:center;flex:0 0 24px}.s8-step.active .s8-num{background:#175c92;color:#fff}.s8-advanced{display:flex;gap:7px;flex-wrap:wrap;padding:10px 12px;background:#f8fafc;border:1px solid var(--line);border-top:0;border-radius:0 0 10px 10px}.s8-advanced.hidden{display:none}.s8-help{background:#eef5fb;border:1px solid #cfe0ef;border-radius:10px;padding:12px 14px;margin-bottom:14px}.s8-help strong{color:#174f83}.s8-help p{margin:4px 0 0;color:#475467;font-size:11px;line-height:1.45}@media(max-width:1000px){.s8-steps{grid-template-columns:repeat(2,1fr)}.s8-step,.s8-advanced-toggle{border-bottom:1px solid var(--line)}.s8-context{display:block}.s8-next{text-align:left;margin-top:5px}}@media(max-width:620px){.s8-steps{grid-template-columns:1fr}.s8-step,.s8-advanced-toggle{border-right:0}.s8-next{font-size:10px}}
      `;document.head.appendChild(st);
    }
    workflow.querySelectorAll('[data-s8-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.s8Tab));
    workflow.querySelectorAll('[data-s8-advanced]').forEach(b=>b.onclick=()=>switchTab(b.dataset.s8Advanced));
    document.getElementById('s8AdvancedToggle').onclick=()=>{advancedOpen=!advancedOpen;document.getElementById('s8AdvancedPanel').classList.toggle('hidden',!advancedOpen)};
    addHelpCards();
  }

  function addHelpCards(){
    document.querySelector('#propertyhub .s8-help')?.remove();
    const definitions={
      assumptions:['Step 2 — Build the analysis','Enter the purchase price, rent, operating assumptions, financing, taxes, and target return. Recalculate when finished.'],
      dashboard:['Step 3 — Review the results','Use this page to decide whether the investment is supportable. Review NOI, cap rate, IRR, NPV, DSCR, cash flow, and valuation before reporting.'],
      report:['Step 4 — Prepare the client report','Enter the concluded value range and commentary, refresh the professional report, save it to cloud, and download the branded PDF.']
    };
    for(const [id,[title,text]] of Object.entries(definitions)){
      const sec=document.getElementById(id);if(!sec||sec.querySelector('.s8-help'))continue;
      const host=sec.querySelector('.grid')||sec;
      const card=document.createElement('div');card.className='s8-help screen-only';card.innerHTML=`<strong>${title}</strong><p>${text}</p>`;
      host.insertBefore(card,host.firstChild);
    }
  }

  function refresh(){
    inject();addHelpCards();
    const active=activeSection();
    const primaryActive=active==='propertyfile'?'propertyhub':active;
    document.querySelectorAll('[data-s8-tab]').forEach(b=>b.classList.toggle('active',b.dataset.s8Tab===primaryActive));
    const name=document.getElementById('s8ContextName');if(name)name.textContent=contextName();
    const next=document.getElementById('s8NextText');if(next)next.textContent=nextText(active);
    const advancedTabs=ADVANCED.map(x=>x[1]);
    const adv=document.getElementById('s8AdvancedToggle');if(adv)adv.classList.toggle('active',advancedTabs.includes(active));
  }

  const oldSwitch=window.switchTab;
  if(typeof oldSwitch==='function')window.switchTab=function(id){const out=oldSwitch(id);setTimeout(refresh,0);return out};
  const observer=new MutationObserver(()=>refresh());
  function start(){
    inject();refresh();
    const main=document.querySelector('main');if(main)observer.observe(main,{attributes:true,subtree:true,attributeFilter:['class']});
    const badge=document.querySelector('.stage-pill');if(badge)badge.textContent='Guided Workflow';
  }
  window.Stage8Workflow={refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();