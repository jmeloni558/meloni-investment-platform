'use strict';
(()=>{
  const VERSION=2;
  if((window.__initialRepairsModelV||0)>=VERSION)return;
  window.__initialRepairsModelV=VERSION;

  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>num(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  const pct=v=>Number.isFinite(v)?(v*100).toFixed(2).replace(/\.00$/,'')+'%':'N/A';

  function ensureSource(){
    let el=document.getElementById('f_initialRepairs');
    if(!el){
      el=document.createElement('input');
      el.type='hidden';el.id='f_initialRepairs';el.value='';
      document.getElementById('assumptions')?.appendChild(el);
    }
    return el;
  }

  try{if(typeof state==='object'&&state&&!Object.prototype.hasOwnProperty.call(state,'initialRepairs'))state.initialRepairs=0;}catch(_e){}
  ensureSource();

  const oldRead=window.readFields;
  if(typeof oldRead==='function'&&!oldRead.__repairsWrapped){
    const wrapped=function(){const out=oldRead.apply(this,arguments);try{state.initialRepairs=Math.max(0,num(ensureSource().value));}catch(_e){}return out;};
    wrapped.__repairsWrapped=true;window.readFields=wrapped;
  }

  const oldRenderFields=window.renderFields;
  if(typeof oldRenderFields==='function'&&!oldRenderFields.__repairsWrapped){
    const wrapped=function(){const out=oldRenderFields.apply(this,arguments);const el=ensureSource();try{el.value=num(state?.initialRepairs)||'';}catch(_e){}return out;};
    wrapped.__repairsWrapped=true;window.renderFields=wrapped;
  }

  // Initial-repair return calculations now live exclusively in the protected server engine.
  function enhanceResults(){
    try{
      if(typeof result!=='object'||!result)return;
      const repairs=num(result.initialRepairs),total=num(result.totalProjectCost);
      const snap=document.getElementById('snapshot');
      if(snap&&!snap.querySelector('[data-repairs-row]')){
        snap.insertAdjacentHTML('beforeend',`<div data-repairs-row>Initial Repairs & Improvements</div><div data-repairs-row>${money(repairs)}</div><div data-repairs-row>Total Project Cost</div><div data-repairs-row>${money(total)}</div><div data-repairs-row>Yield on Cost</div><div data-repairs-row>${pct(result.yieldOnCost)}</div>`);
      }
    }catch(_e){}
  }

  const oldRender=window.render;
  if(typeof oldRender==='function'&&!oldRender.__repairsWrapped){
    const wrapped=function(){const out=oldRender.apply(this,arguments);enhanceResults();return out;};
    wrapped.__repairsWrapped=true;window.render=wrapped;
  }

  window.InitialRepairsModel={ensureSource,enhanceResults};
})();