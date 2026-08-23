'use strict';
(()=>{
  const VERSION=1;
  if((window.__guidedInitialRepairsV||0)>=VERSION)return;
  window.__guidedInitialRepairsV=VERSION;
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>num(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});

  function source(){return window.InitialRepairsModel?.ensureSource?.()||document.getElementById('f_initialRepairs');}
  function apply(){
    const body=document.getElementById('gwBody');if(!body)return false;
    const acq=body.querySelector('[data-src="f_price"]')?.closest('.gw-field');
    if(acq&&!body.querySelector('[data-src="f_initialRepairs"]')){
      const field=document.createElement('div');field.className='gw-field';
      field.innerHTML=`<label>Initial Repairs & Improvements</label><input data-src="f_initialRepairs" type="number" min="0" step="100" value="${source()?.value||''}"><div class="gw-note">Immediate capital expected after closing for repairs, renovation, or improvements. Keep this separate from the actual purchase price.</div><div class="gw-expanded-guidance"><b>How this is used</b>This amount increases the investor's Year 0 cash investment and therefore affects Cash-on-Cash Return, IRR and NPV. It does not increase the acquisition price used for cap rate, GRM, appreciation or depreciation. Tax treatment of individual repairs and improvements may differ.<br><a href="https://www.irs.gov/publications/p527" target="_blank" rel="noopener">IRS rental-property guidance ↗</a></div>`;
      acq.insertAdjacentElement('afterend',field);
      const inp=field.querySelector('input');
      const sync=()=>{const s=source();if(s)s.value=inp.value;try{if(typeof state==='object'&&state)state.initialRepairs=Math.max(0,num(inp.value));}catch(e){};updateSummary();};
      inp.addEventListener('input',sync);inp.addEventListener('change',sync);
    }
    updateSummary();
    return true;
  }
  function updateSummary(){
    const side=document.getElementById('gwSide');if(!side)return;
    side.querySelectorAll('[data-repairs-summary]').forEach(x=>x.remove());
    const repairs=num(source()?.value),price=num(document.getElementById('f_price')?.value);
    const rows=`<div class="gw-row" data-repairs-summary><span>Initial Repairs</span><b>${repairs?money(repairs):'—'}</b></div><div class="gw-row" data-repairs-summary><span>Total Project Cost</span><b>${price||repairs?money(price+repairs):'—'}</b></div>`;
    side.insertAdjacentHTML('beforeend',rows);
  }
  function schedule(){[0,40,120].forEach(ms=>setTimeout(apply,ms));}
  document.addEventListener('click',e=>{if(e.target.closest('#guidedSetup,#s10NewAnalysis,[data-s8-tab="assumptions"]'))schedule()},true);
  document.addEventListener('input',e=>{if(e.target.matches('[data-src="f_price"]'))setTimeout(updateSummary,0)},true);
  window.GuidedInitialRepairs={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
