'use strict';
(()=>{
  const VERSION=2;
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
  const STEP_NAMES=['Property','Income','Expenses','Financing','Investment Assumptions','Review'];

  const REQUIRED=new Set(['f_address','f_price','f_units','f_hold','f_rent']);
  const RECOMMENDED=new Set(['f_land','f_vacancy','f_rentGrowth','f_opEx','f_mortgage','f_mortRate','f_loanYears','f_appreciation','f_sellCost','f_requiredReturn','f_desiredCap','f_desiredGrm']);
  const ADVANCED=new Set(['f_interestOnly','f_points','f_origFee','f_depLife','f_ordinaryTax','f_depTax','f_capGainsTax']);

  function css(){
    let s=document.getElementById('ptGuidedWorkflowRefinementStyle');
    if(!s){s=document.createElement('style');s.id='ptGuidedWorkflowRefinementStyle';document.head.appendChild(s);}
    s.textContent=`
      #guidedSetup.gw{max-width:1220px!important;margin:0 auto 30px!important}
      #guidedSetup .gw-steps{border:1px solid #cbd8e5!important;border-radius:14px!important;box-shadow:0 8px 24px rgba(29,57,84,.08)!important;background:#fff!important;margin-bottom:18px!important;padding:7px!important;gap:6px!important;overflow:visible!important}
      #guidedSetup .gw-step{position:relative;border:1px solid transparent!important;border-radius:9px!important;background:#fff!important;padding:11px 10px!important;min-height:58px!important;transition:.16s ease!important}
      #guidedSetup .gw-step:hover{background:#f7fbff!important;border-color:#c7d8e6!important;transform:translateY(-1px)}
      #guidedSetup .gw-step.active{background:linear-gradient(180deg,#edf6fc,#e7f2fa)!important;border-color:#a9c7dd!important;box-shadow:0 3px 10px rgba(23,92,146,.10)!important}
      #guidedSetup .gw-step.active:after{content:'CURRENT';position:absolute;right:8px;top:7px;font-size:6.5px;font-weight:900;letter-spacing:.06em;color:#175c92;background:#fff;border:1px solid #bdd2e2;border-radius:999px;padding:2px 5px}
      #guidedSetup .gw-step.done{background:#fbfdfc!important;border-color:#d7e8de!important}
      #guidedSetup .gw-step.done .gw-num{background:#e6f5ec!important;color:#137347!important}
      #guidedSetup .gw-step.active .gw-num{background:#175c92!important;color:#fff!important}
      #guidedSetup .gw-step b{font-size:10px!important;color:#203247!important}
      #guidedSetup .gw-step small{font-size:7.8px!important;color:#7a8699!important}

      #guidedSetup .gw-layout{gap:18px!important;grid-template-columns:minmax(0,1fr) 292px!important}
      #guidedSetup .gw-card,#guidedSetup .gw-side{border:1px solid #cbd8e5!important;border-radius:15px!important;box-shadow:0 9px 28px rgba(29,57,84,.08)!important;background:#fff!important}
      #guidedSetup .gw-card{overflow:hidden!important}
      #guidedSetup .gw-head{padding:18px 22px 16px!important;background:linear-gradient(180deg,#f7fbff,#f3f8fc)!important;border-bottom:1px solid #d9e5ee!important}
      #guidedSetup .gw-eye{font-size:8px!important;letter-spacing:.08em!important;color:#175c92!important;font-weight:900!important}
      #guidedSetup .gw-head h2{font-size:21px!important;color:#173f66!important;margin:5px 0 4px!important;line-height:1.2!important}
      #guidedSetup .gw-head p{font-size:10.5px!important;color:#667085!important;line-height:1.5!important}
      #guidedSetup .pt-gw-current-line{display:flex;align-items:center;gap:7px;margin-bottom:4px}
      #guidedSetup .pt-gw-step-chip{display:inline-flex;align-items:center;border:1px solid #bfd3e3;background:#fff;color:#175c92;border-radius:999px;padding:3px 7px;font-size:7px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}

      #guidedSetup .gw-body{padding:20px 22px 22px!important;background:#fff!important}
      .pt-gw-goal{margin:0 0 14px;padding:11px 13px;border:1px solid #d7e5ef;border-left:4px solid #175c92;border-radius:9px;background:#f7fbfe;color:#475467;font-size:9.5px;line-height:1.5}
      .pt-gw-goal b{display:block;color:#175c92;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
      .pt-gw-legend{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 16px;color:#667085;font-size:8px;align-items:center;padding-bottom:12px;border-bottom:1px solid #edf1f4}
      .pt-gw-legend>span:first-child{font-weight:800;color:#475467;margin-right:2px}
      .pt-gw-badge{display:inline-flex;align-items:center;border-radius:999px;padding:2px 6px;font-size:6.8px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
      .pt-gw-required{background:#fef3f2;color:#b42318;border:1px solid #fecdca}
      .pt-gw-recommended{background:#eff8ff;color:#175cd3;border:1px solid #b2ddff}
      .pt-gw-advanced{background:#f2f4f7;color:#475467;border:1px solid #d0d5dd}
      .gw-field label .pt-gw-badge{margin-left:auto}
      .gw-field[data-pt-priority="required"] input,.gw-field[data-pt-priority="required"] select{border-left-width:3px;border-left-color:#f04438}
      .gw-field[data-pt-priority="recommended"] input,.gw-field[data-pt-priority="recommended"] select{border-left-width:3px;border-left-color:#2e90fa}
      #guidedSetup .gw-field label{color:#344054!important;font-size:10.5px!important}
      #guidedSetup .gw-field input,#guidedSetup .gw-field select{height:42px!important;border-color:#cbd6df!important;border-radius:8px!important;background:#fff!important}
      #guidedSetup .gw-field input:focus,#guidedSetup .gw-field select:focus{border-color:#2b6fa8!important;box-shadow:0 0 0 3px rgba(43,111,168,.10)!important}
      #guidedSetup .gw-note{font-size:8.4px!important;color:#7a8699!important}
      #guidedSetup .gw-callout,#guidedSetup .gw-help,#guidedSetup .gw-sub{border-color:#dbe5ed!important;background:#f8fbfd!important}

      #guidedSetup .gw-actions{padding:13px 22px!important;background:#f7f9fb!important;border-top:1px solid #dfe7ee!important;align-items:center!important}
      #guidedSetup .gw-actions .btn{min-height:38px!important;border-radius:8px!important;font-size:10px!important;font-weight:800!important;padding:9px 14px!important}
      #guidedSetup #gwNext{min-width:175px!important;box-shadow:0 3px 8px rgba(23,92,146,.14)!important}
      #gwNext.pt-gw-final{background:#175c92;box-shadow:0 0 0 3px rgba(23,92,146,.08)}
      #guidedSetup #gwSave{background:#fff!important;border-color:#b9c9d7!important;color:#36566f!important}

      #guidedSetup .gw-side{position:sticky!important;top:14px!important;overflow:hidden!important;background:#fbfcfe!important}
      #guidedSetup .gw-side-head{padding:13px 14px 11px!important;background:linear-gradient(180deg,#f4f8fb,#eef4f8)!important;border-bottom:1px solid #dbe5ed!important}
      #guidedSetup .gw-side-head b{font-size:11px!important;color:#173f66!important}
      #guidedSetup .gw-side-head small{font-size:8px!important;color:#7a8699!important;margin-top:2px!important}
      #guidedSetup .gw-side-body{padding:7px 14px!important}
      #guidedSetup .gw-row{padding:8px 0!important;font-size:8.8px!important}
      #guidedSetup .gw-barbox{border-top:1px solid #e5ebf0!important;background:#f7fafc!important;padding:10px 14px 13px!important}
      #guidedSetup .gw-bar{height:7px!important;background:#e1e8ee!important}
      #guidedSetup .gw-bar i{background:linear-gradient(90deg,#2b6fa8,#175c92)!important}

      @media(max-width:980px){#guidedSetup .gw-layout{grid-template-columns:1fr!important}#guidedSetup .gw-side{position:static!important}#guidedSetup .gw-steps{grid-template-columns:repeat(3,1fr)!important}}
      @media(max-width:650px){#guidedSetup .gw-steps{grid-template-columns:repeat(2,1fr)!important}#guidedSetup .gw-body,#guidedSetup .gw-head,#guidedSetup .gw-actions{padding-left:15px!important;padding-right:15px!important}#guidedSetup .gw-side{display:none!important}#guidedSetup .gw-actions{display:block!important}#guidedSetup .gw-actions>div{margin-top:8px!important;display:grid!important;grid-template-columns:1fr!important}#guidedSetup .gw-actions .btn{width:100%!important}}
    `;
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
    if(!goal){goal=document.createElement('div');goal.id='ptGwStepGoal';goal.className='pt-gw-goal';body.prepend(goal);}
    goal.innerHTML=`<b>Step goal</b>${STEP_GOALS[step]}`;

    let legend=document.getElementById('ptGwPriorityLegend');
    if(!legend){legend=document.createElement('div');legend.id='ptGwPriorityLegend';legend.className='pt-gw-legend';goal.insertAdjacentElement('afterend',legend);}
    legend.innerHTML=`<span>Input priority:</span>${badge('required')}${badge('recommended')}${badge('advanced')}`;
  }

  function updateHeader(){
    const step=currentStep();
    const head=document.querySelector('#guidedSetup .gw-head');
    const eye=document.getElementById('gwEye');
    if(eye)eye.textContent='Guided Analysis Setup';
    if(!head)return;
    let line=head.querySelector('.pt-gw-current-line');
    if(!line){line=document.createElement('div');line.className='pt-gw-current-line';head.insertBefore(line,head.firstChild);}
    line.innerHTML=`<span class="pt-gw-step-chip">Step ${step+1} of 6</span><span class="gw-eye">${STEP_NAMES[step]}</span>`;
    if(eye&&eye!==line.querySelector('.gw-eye'))eye.style.display='none';
  }

  function updateActions(){
    const step=currentStep(),next=document.getElementById('gwNext');
    if(next){next.textContent=NEXT_LABELS[step];next.classList.toggle('pt-gw-final',step===5);}
    const save=document.getElementById('gwSave');if(save)save.textContent='Save Progress';
  }

  function refine(){
    if(!document.getElementById('guidedSetup'))return false;
    css();updateHeader();addContext();classifyFields();updateActions();
    return true;
  }

  function schedule(){[0,40,120].forEach(ms=>setTimeout(refine,ms));}
  function start(){
    schedule();
    document.addEventListener('click',e=>{if(e.target.closest('#guidedSetup,[data-s8-tab="assumptions"],#s10NewAnalysis'))schedule();},true);
    document.addEventListener('change',e=>{if(e.target.closest('#guidedSetup'))schedule();},true);
  }

  window.PropertyThesisGuidedWorkflowRefinement={apply:refine,version:VERSION};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
