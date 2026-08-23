'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisGuidedWorkflowRefinementV||0)>=VERSION)return;
  window.__propertyThesisGuidedWorkflowRefinementV=VERSION;

  const STEP_GOALS=[
    'Identify the asset and the proposed acquisition so every later calculation is tied to the correct property and investment basis.',
    'Establish the Year 1 rental income and occupancy assumptions that drive effective gross income.',
    'Choose a supportable operating-expense assumption so NOI reflects the property rather than financing costs.',
    'Describe how the acquisition will be funded and capture only the loan terms that actually apply.',
    'Set the growth, disposition, tax and return assumptions used to evaluate long-term performance and value.',
    'Confirm the major underwriting assumptions before PropertyThesis builds the investment results and recommendation.'
  ];
  const NEXT_LABELS=['Continue to Income →','Continue to Expenses →','Continue to Financing →','Continue to Investment Assumptions →','Continue to Review →','Review Results →'];

  const REQUIRED=new Set(['f_address','f_price','f_units','f_hold','f_rent']);
  const RECOMMENDED=new Set(['f_land','f_vacancy','f_rentGrowth','f_opEx','f_mortgage','f_mortRate','f_loanYears','f_appreciation','f_sellCost','f_requiredReturn','f_desiredCap','f_desiredGrm']);
  const ADVANCED=new Set(['f_interestOnly','f_points','f_origFee','f_depLife','f_ordinaryTax','f_depTax','f_capGainsTax']);

  function css(){
    if(document.getElementById('ptGuidedWorkflowRefinementStyle'))return;
    const s=document.createElement('style');
    s.id='ptGuidedWorkflowRefinementStyle';
    s.textContent=`
      .pt-gw-goal{margin:0 0 16px;padding:11px 13px;border:1px solid #d7e5ef;border-left:4px solid #175c92;border-radius:9px;background:#f7fbfe;color:#475467;font-size:9.5px;line-height:1.5}
      .pt-gw-goal b{display:block;color:#175c92;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
      .pt-gw-legend{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 14px;color:#667085;font-size:8px;align-items:center}
      .pt-gw-legend>span:first-child{font-weight:800;color:#475467;margin-right:2px}
      .pt-gw-badge{display:inline-flex;align-items:center;border-radius:999px;padding:2px 6px;font-size:6.8px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
      .pt-gw-required{background:#fef3f2;color:#b42318;border:1px solid #fecdca}
      .pt-gw-recommended{background:#eff8ff;color:#175cd3;border:1px solid #b2ddff}
      .pt-gw-advanced{background:#f2f4f7;color:#475467;border:1px solid #d0d5dd}
      .gw-field label .pt-gw-badge{margin-left:auto}
      .gw-field[data-pt-priority="required"] input,.gw-field[data-pt-priority="required"] select{border-left-width:3px;border-left-color:#f04438}
      .gw-field[data-pt-priority="recommended"] input,.gw-field[data-pt-priority="recommended"] select{border-left-width:3px;border-left-color:#2e90fa}
      #gwNext.pt-gw-final{background:#175c92;box-shadow:0 0 0 3px rgba(23,92,146,.08)}
    `;
    document.head.appendChild(s);
  }

  function currentStep(){
    const active=document.querySelector('#gwSteps .gw-step.active[data-step]');
    const n=active?Number(active.dataset.step):0;
    return Number.isFinite(n)?Math.max(0,Math.min(5,n)):0;
  }

  function badge(kind){
    const label=kind==='required'?'Required':kind==='recommended'?'Recommended':'Advanced / if applicable';
    return `<span class="pt-gw-badge pt-gw-${kind}">${label}</span>`;
  }

  function classifyFields(){
    const root=document.getElementById('gwBody');if(!root)return;
    root.querySelectorAll('.gw-field').forEach(field=>{
      const input=field.querySelector('[data-src]');if(!input)return;
      const id=input.dataset.src||'';
      let kind='';
      if(REQUIRED.has(id))kind='required';
      else if(RECOMMENDED.has(id))kind='recommended';
      else if(ADVANCED.has(id))kind='advanced';
      if(!kind)return;
      field.dataset.ptPriority=kind;
      const label=field.querySelector(':scope > label');
      if(label&&!label.querySelector('.pt-gw-badge'))label.insertAdjacentHTML('beforeend',badge(kind));
    });
  }

  function addContext(){
    const body=document.getElementById('gwBody');if(!body)return;
    const step=currentStep();
    let goal=document.getElementById('ptGwStepGoal');
    if(!goal){
      goal=document.createElement('div');goal.id='ptGwStepGoal';goal.className='pt-gw-goal';
      body.prepend(goal);
    }
    goal.innerHTML=`<b>Step goal</b>${STEP_GOALS[step]}`;

    let legend=document.getElementById('ptGwPriorityLegend');
    if(!legend){
      legend=document.createElement('div');legend.id='ptGwPriorityLegend';legend.className='pt-gw-legend';
      goal.insertAdjacentElement('afterend',legend);
    }
    legend.innerHTML=`<span>Input priority:</span>${badge('required')}${badge('recommended')}${badge('advanced')}`;
  }

  function updateActions(){
    const step=currentStep(),next=document.getElementById('gwNext');
    if(next){next.textContent=NEXT_LABELS[step];next.classList.toggle('pt-gw-final',step===5);}
    const save=document.getElementById('gwSave');if(save)save.textContent='Save Progress';
  }

  function refine(){
    if(!document.getElementById('guidedSetup'))return false;
    css();addContext();classifyFields();updateActions();
    return true;
  }

  function schedule(){[0,40,120].forEach(ms=>setTimeout(refine,ms));}
  function start(){
    schedule();
    document.addEventListener('click',e=>{
      if(e.target.closest('#guidedSetup,[data-s8-tab="assumptions"],#s10NewAnalysis'))schedule();
    },true);
    document.addEventListener('change',e=>{if(e.target.closest('#guidedSetup'))schedule();},true);
  }

  window.PropertyThesisGuidedWorkflowRefinement={apply:refine,version:VERSION};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
