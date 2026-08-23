'use strict';
(()=>{
  const VERSION=4;
  if((window.__propertyThesisGuidedSaveExistingWorkflowV||0)>=VERSION)return;
  window.__propertyThesisGuidedSaveExistingWorkflowV=VERSION;

  let saving=false;
  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);}catch(_e){}};
  const currentStep=()=>{const a=document.querySelector('#gwSteps .gw-step.active[data-step]');return a?Number(a.dataset.step):0;};

  function ensureStyles(){
    if(document.getElementById('ptGuidedSaveExistingStyles'))return;
    const s=document.createElement('style');s.id='ptGuidedSaveExistingStyles';s.textContent=`
      #gwSaveAndReview{white-space:nowrap}
      #gwSaveAndReview[disabled]{opacity:.62;cursor:wait}
      #propertyhub .pt-hub-primary-flow{display:flex;gap:7px;flex-wrap:wrap;width:100%}
      #propertyhub .pt-hub-primary-flow [data-hub-open]{order:-2!important}
      #propertyhub .pt-hub-primary-flow .pt-manage-analysis,#propertyhub .pt-hub-primary-flow [data-pt-manage]{order:0!important}
      #propertyhub .pt-hub-admin-flow{display:flex;gap:7px;flex-wrap:wrap;width:100%;padding-top:8px;margin-top:2px;border-top:1px solid #edf1f5}
      #propertyhub .pt-hub-admin-flow .hub-delete{margin-left:auto}
      #propertyhub .hub-actions{display:block}
      @media(max-width:950px){#propertyhub .pt-hub-admin-flow .hub-delete{margin-left:0}}
    `;document.head.appendChild(s);
  }

  async function calculateSaveReview(){
    if(saving)return;
    const btn=document.getElementById('gwSaveAndReview');
    saving=true;if(btn){btn.disabled=true;btn.textContent='Calculating & Saving…';btn.setAttribute('aria-busy','true');}
    try{
      const controller=window.GuidedContinueController;
      if(!controller?.recalculate)throw new Error('Guided calculation workflow is not ready.');
      await controller.recalculate();
      const saved=await window.saveCurrentCloud?.(false);
      if(!saved)throw new Error('The analysis could not be saved. Review the save message and try again.');
      status('Analysis calculated and saved — review the results');
      if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('dashboard');
      else{
        document.querySelectorAll('.section').forEach(sec=>sec.classList.toggle('active',sec.id==='dashboard'));
        document.querySelectorAll('.nav [data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='dashboard'));
      }
      try{window.PropertyThesisIncomeEngineBridge?.browserRender?.();}catch(_e){}
      try{window.GuidedContinueController?.refreshReview?.();}catch(_e){}
      try{window.Stage15Layout?.apply?.();}catch(_e){}
      setTimeout(()=>{try{window.PropertyThesisSecondaryEngine?.request?.();}catch(_e){}},0);
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){
      status('Unable to calculate and save: '+String(e?.message||e));
      const box=document.getElementById('gwValidation');if(box){box.innerHTML=`<b>Unable to calculate and save the analysis.</b><div>${String(e?.message||e)}</div>`;box.classList.add('show');}
    }finally{
      saving=false;if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');btn.textContent='Calculate, Save & Review Results →';}
    }
  }

  function enhanceStepSix(){
    ensureStyles();
    const actions=document.querySelector('#guidedSetup .gw-actions>div');
    if(!actions||currentStep()!==5){document.getElementById('gwSaveAndReview')?.remove();return false;}
    let b=document.getElementById('gwSaveAndReview');
    if(!b){b=document.createElement('button');b.id='gwSaveAndReview';b.type='button';b.className='btn secondary';b.textContent='Calculate, Save & Review Results →';const next=document.getElementById('gwNext');actions.insertBefore(b,next||null);b.onclick=e=>{e.preventDefault();e.stopPropagation();calculateSaveReview();};}
    return true;
  }

  function modernizeHubCard(card){
    const actions=card.querySelector('.hub-actions');if(!actions)return;
    const open=card.querySelector('[data-hub-open]');
    const report=card.querySelector('[data-hub-report]');
    const edit=card.querySelector('[data-hub-edit]');
    const manage=card.querySelector('[data-pt-manage]');
    const clone=card.querySelector('[data-hub-clone]');
    const archive=card.querySelector('[data-hub-archive]');
    const del=card.querySelector('[data-hub-delete]');
    const pid=open?.dataset?.hubOpen||edit?.dataset?.hubEdit||report?.dataset?.hubReport||manage?.dataset?.ptManage;
    if(!pid)return;
    const hasAnalysis=!!report;
    clone?.remove();
    if(manage)manage.textContent='Manage Analyses';
    if(report)report.textContent='Client Report';
    if(hasAnalysis&&open)open.textContent='Open Property';
    if(!hasAnalysis&&open)open.remove();
    if(edit)edit.textContent=hasAnalysis?'Edit Guided Analysis':'Start Guided Analysis';
    let newBtn=card.querySelector('[data-pt-new]');
    if(hasAnalysis&&!newBtn){newBtn=document.createElement('button');newBtn.type='button';newBtn.className='btn ghost';newBtn.dataset.ptNew=pid;newBtn.textContent='Start New Analysis';}
    const primary=document.createElement('div');primary.className='pt-hub-primary-flow';
    [hasAnalysis?open:null,edit,newBtn,report,manage].forEach(x=>{if(x)primary.appendChild(x);});
    const admin=document.createElement('div');admin.className='pt-hub-admin-flow';
    [archive,del].forEach(x=>{if(x)admin.appendChild(x);});
    actions.replaceChildren(primary,admin);
  }

  function modernizeHub(){
    ensureStyles();
    const hub=document.getElementById('propertyhub');if(!hub)return false;
    hub.querySelectorAll('.hub-card').forEach(modernizeHubCard);
    return true;
  }

  function hookStage6(){
    const api=window.Stage6Dashboard;
    if(!api||typeof api.render!=='function')return false;
    if(api.render.__ptGuidedWorkflowWrapped)return true;
    const original=api.render;
    const wrapped=function(){
      const out=original.apply(this,arguments);
      setTimeout(modernizeHub,0);
      setTimeout(modernizeHub,60);
      return out;
    };
    wrapped.__ptGuidedWorkflowWrapped=true;
    wrapped.__original=original;
    api.render=wrapped;
    return true;
  }

  function apply(){hookStage6();enhanceStepSix();modernizeHub();}
  function schedule(){[0,50,140].forEach(ms=>setTimeout(apply,ms));}
  function start(){
    hookStage6();schedule();
    document.addEventListener('click',e=>{
      if(e.target.closest('#guidedSetup,[data-tab="propertyhub"],[data-s8-tab="assumptions"],#s10NewAnalysis,[data-pt-new],[data-pt-cloud-refresh]'))schedule();
    },true);
    document.addEventListener('change',e=>{if(e.target.closest('#guidedSetup,#propertyhub'))schedule();},true);
  }

  window.PropertyThesisGuidedSaveExistingWorkflow={version:VERSION,apply,calculateSaveReview,modernizeHub};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
