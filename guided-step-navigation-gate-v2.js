'use strict';
(()=>{
  const VERSION=2;
  if((window.__propertyThesisGuidedStepNavigationGateV||0)>=VERSION)return;
  window.__propertyThesisGuidedStepNavigationGateV=VERSION;

  const num=v=>Number(v)||0;
  const LABELS=['Property','Income','Expenses','Financing','Investment Assumptions','Comparable Sales','Review'];

  function visibleValue(id){const visible=document.querySelector(`#gwBody [data-src="${id}"]`);if(visible)return visible.value;return document.getElementById(id)?.value??'';}
  function syncVisible(){document.querySelectorAll('#gwBody [data-src]').forEach(input=>{const source=document.getElementById(input.dataset.src);if(source)source.value=input.value;});}
  function missingForStep(step){const missing=[];if(step===0){if(!String(visibleValue('f_address')).trim())missing.push('f_address');if(num(visibleValue('f_price'))<=0)missing.push('f_price');if(num(visibleValue('f_units'))<=0)missing.push('f_units');if(num(visibleValue('f_hold'))<=0)missing.push('f_hold');}if(step===1&&num(visibleValue('f_rent'))<=0)missing.push('f_rent');return missing;}
  function firstIncompleteBefore(target){for(let i=0;i<target;i++)if(missingForStep(i).length)return i;return -1;}
  function currentStep(){const active=document.querySelector('#gwSteps .gw-step.active[data-step]');const n=active?Number(active.dataset.step):0;return Number.isFinite(n)?n:0;}
  function ensureStyles(){if(document.getElementById('ptGuidedStepGateStyles'))return;const st=document.createElement('style');st.id='ptGuidedStepGateStyles';st.textContent=`#gwSteps .gw-step.pt-locked{opacity:.52;cursor:not-allowed!important;background:#f8fafc!important;box-shadow:none!important}#gwSteps .gw-step.pt-locked:hover{transform:none!important;background:#f8fafc!important;border-color:#e2e8f0!important;box-shadow:none!important}#gwSteps .gw-step.pt-locked .gw-num{background:#eef2f6!important;color:#98a2b3!important}#gwSteps .gw-step.pt-locked b,#gwSteps .gw-step.pt-locked small{color:#98a2b3!important}#gwSteps .gw-step.pt-locked small:after{content:' • Locked';font-weight:800;color:#98a2b3}`;document.head.appendChild(st);}
  function refresh(){const steps=[...document.querySelectorAll('#gwSteps .gw-step[data-step]')];if(!steps.length)return false;ensureStyles();syncVisible();const current=currentStep();steps.forEach(btn=>{const target=Number(btn.dataset.step);const locked=target>current&&firstIncompleteBefore(target)>=0;btn.classList.toggle('pt-locked',locked);btn.setAttribute('aria-disabled',locked?'true':'false');if(locked){const blocker=firstIncompleteBefore(target);btn.title=`Complete ${LABELS[blocker]||'the prior step'} before opening ${LABELS[target]||'this step'}.`;}else btn.removeAttribute('title');});return true;}
  function blockLockedNavigation(e){const btn=e.target?.closest?.('#gwSteps .gw-step[data-step]');if(!btn)return;syncVisible();const target=Number(btn.dataset.step),current=currentStep();if(target<=current)return;const blocker=firstIncompleteBefore(target);if(blocker<0)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();if(blocker===current){try{window.GuidedContinueController?.validate?.(current);}catch(_e){}}try{if(typeof setStatus==='function')setStatus(`Complete ${LABELS[blocker]||'the prior step'} before opening ${LABELS[target]||'this step'}.`);}catch(_e){}refresh();}
  function schedule(){[0,40,120].forEach(ms=>setTimeout(refresh,ms));}
  function start(){schedule();document.addEventListener('click',blockLockedNavigation,true);document.addEventListener('input',e=>{if(e.target?.closest?.('#guidedSetup'))schedule();},true);document.addEventListener('change',e=>{if(e.target?.closest?.('#guidedSetup'))schedule();},true);document.addEventListener('click',e=>{if(e.target?.closest?.('#guidedSetup,#s10NewAnalysis,[data-s8-tab="assumptions"]'))schedule();},false);}
  window.PropertyThesisGuidedStepNavigationGate={version:VERSION,refresh,missingForStep,firstIncompleteBefore};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();