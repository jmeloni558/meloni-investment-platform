'use strict';
(()=>{
  const VERSION=1;
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

  try{if(typeof state==='object'&&state&&!Object.prototype.hasOwnProperty.call(state,'initialRepairs'))state.initialRepairs=0;}catch(e){}
  ensureSource();

  const oldRead=window.readFields;
  if(typeof oldRead==='function'&&!oldRead.__repairsWrapped){
    const wrapped=function(){
      const out=oldRead.apply(this,arguments);
      try{state.initialRepairs=Math.max(0,num(ensureSource().value));}catch(e){}
      return out;
    };
    wrapped.__repairsWrapped=true;window.readFields=wrapped;
  }

  const oldRenderFields=window.renderFields;
  if(typeof oldRenderFields==='function'&&!oldRenderFields.__repairsWrapped){
    const wrapped=function(){
      const out=oldRenderFields.apply(this,arguments);
      const el=ensureSource();
      try{el.value=num(state?.initialRepairs)||'';}catch(e){}
      return out;
    };
    wrapped.__repairsWrapped=true;window.renderFields=wrapped;
  }

  const oldAnalyze=window.analyze;
  if(typeof oldAnalyze==='function'&&!oldAnalyze.__repairsWrapped){
    const wrapped=function(s){
      const out=oldAnalyze.call(this,s);
      const repairs=Math.max(0,num(s?.initialRepairs));
      const totalProjectCost=num(s?.price)+repairs;
      if(out){
        out.initialRepairs=repairs;
        out.totalProjectCost=totalProjectCost;
        out.initial=num(out.initial)-repairs;
        if(Array.isArray(out.cfs)&&out.cfs.length){
          out.cfs=[out.initial,...out.cfs.slice(1)];
          try{out.IRR=irr(out.cfs);}catch(e){}
          try{out.NPV=npv(s.requiredReturn,out.cfs);}catch(e){}
        }
        const noi=out.years?.[0]?.noi;
        out.yieldOnCost=totalProjectCost>0&&Number.isFinite(noi)?noi/totalProjectCost:NaN;
      }
      return out;
    };
    wrapped.__repairsWrapped=true;wrapped.__originalAnalyze=oldAnalyze;window.analyze=wrapped;
  }

  function enhanceResults(){
    try{
      if(typeof result!=='object'||!result)return;
      const repairs=num(result.initialRepairs),total=num(result.totalProjectCost);
      const snap=document.getElementById('snapshot');
      if(snap&&!snap.querySelector('[data-repairs-row]')){
        snap.insertAdjacentHTML('beforeend',`<div data-repairs-row>Initial Repairs & Improvements</div><div data-repairs-row>${money(repairs)}</div><div data-repairs-row>Total Project Cost</div><div data-repairs-row>${money(total)}</div><div data-repairs-row>Yield on Cost</div><div data-repairs-row>${pct(result.yieldOnCost)}</div>`);
      }
    }catch(e){}
  }

  const oldRender=window.render;
  if(typeof oldRender==='function'&&!oldRender.__repairsWrapped){
    const wrapped=function(){const out=oldRender.apply(this,arguments);enhanceResults();return out;};
    wrapped.__repairsWrapped=true;window.render=wrapped;
  }

  window.InitialRepairsModel={ensureSource,enhanceResults};
  try{if(typeof render==='function')render();}catch(e){}
})();
