'use strict';
(()=>{
  const VERSION=1;
  if((window.__marketRentSupportVersion||0)>=VERSION)return;
  window.__marketRentSupportVersion=VERSION;

  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const money=v=>Number.isFinite(Number(v))?(typeof fmtC==='function'?fmtC(Number(v)):Number(v).toLocaleString('en-US',{style:'currency',currency:'USD'})):'—';
  const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:d}):'—';

  function status(msg){try{if(typeof setStatus==='function')setStatus(msg);}catch(_e){}}
  function currentAddress(){try{return document.getElementById('f_address')?.value.trim()||state?.address||'';}catch(_e){return '';}}
  function prior(){try{return state?.marketRentSupport||null;}catch(_e){return null;}}

  function ensureStyles(){
    if(document.getElementById('ptMarketRentStyles'))return;
    const s=document.createElement('style');s.id='ptMarketRentStyles';s.textContent=`
      .pt-rent-research-btn{margin-top:6px;width:100%}
      #ptMarketRentModal{position:fixed;inset:0;z-index:10120;background:rgba(15,23,42,.56);display:flex;align-items:flex-start;justify-content:center;padding:34px 14px;overflow:auto}#ptMarketRentModal.hidden{display:none}
      #ptMarketRentModal .ptr-shell{width:min(980px,100%);background:#f7f9fc;border:1px solid #d7e0e8;border-radius:16px;box-shadow:0 28px 80px rgba(15,23,42,.3);overflow:hidden}.ptr-head{display:flex;justify-content:space-between;gap:14px;padding:18px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.ptr-head h3{margin:2px 0;font-size:19px}.ptr-head p{margin:0;color:#667085;font-size:10px}.ptr-close{width:34px;height:34px;border:0;border-radius:999px;background:#eef2f6;font-size:20px;cursor:pointer}.ptr-body{padding:16px 20px 22px}.ptr-grid{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:9px}.ptr-grid .wide{grid-column:1/-1}.ptr-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.ptr-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.ptr-stat{background:#fff;border:1px solid #dfe6ed;border-radius:9px;padding:10px}.ptr-stat span{display:block;color:#667085;font-size:8px;text-transform:uppercase;font-weight:700}.ptr-stat b{display:block;font-size:14px;margin-top:3px}.ptr-conclusion{background:#fff;border:1px solid #b9cee0;border-radius:10px;padding:12px;margin:12px 0}.ptr-conclusion .field{max-width:300px}.ptr-comps{display:grid;gap:8px}.ptr-comp{background:#fff;border:1px solid #dfe6ed;border-radius:9px;padding:10px}.ptr-comp-top{display:flex;justify-content:space-between;gap:10px}.ptr-comp h4{margin:0;font-size:11px}.ptr-comp .rent{font-weight:800}.ptr-comp-meta{display:flex;gap:10px;flex-wrap:wrap;color:#667085;font-size:8.5px;margin-top:5px}.ptr-note{font-size:9px;color:#667085;margin-top:8px}.ptr-error{background:#fff1f1;border:1px solid #e8b1b1;color:#9b2c2c;border-radius:9px;padding:10px;margin-top:10px}
      @media(max-width:760px){.ptr-grid{grid-template-columns:1fr 1fr}.ptr-grid .wide{grid-column:1/-1}.ptr-summary{grid-template-columns:1fr 1fr}.ptr-comp-top{display:block}.ptr-comp .rent{margin-top:4px}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    ensureStyles();let m=document.getElementById('ptMarketRentModal');if(m)return m;
    m=document.createElement('div');m.id='ptMarketRentModal';m.className='hidden';m.innerHTML='<div class="ptr-shell"><div id="ptMarketRentContent"></div></div>';document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.classList.contains('hidden'))close();});return m;
  }
  function close(){document.getElementById('ptMarketRentModal')?.classList.add('hidden');}

  function drawForm(){
    const old=prior(),inputs=old?.inputs||{},m=ensureModal(),host=document.getElementById('ptMarketRentContent');m.classList.remove('hidden');
    host.innerHTML=`<div class="ptr-head"><div><div class="pt-eyebrow">Market Rent Support</div><h3>Research Market Rent</h3><p>RentCast market estimate and comparable rental listings. Your concluded rent remains the final underwriting input.</p></div><button class="ptr-close" type="button">×</button></div><div class="ptr-body"><div class="ptr-grid">
      <div class="field wide"><label>Property Address</label><input data-ptr-address value="${esc(inputs.address||currentAddress())}" placeholder="Full street address, city, state ZIP"></div>
      <div class="field"><label>Property Type</label><select data-ptr-type><option value="">Auto-detect</option>${['Single Family','Condo','Townhouse','Manufactured','Multi-Family','Apartment'].map(x=>`<option ${inputs.propertyType===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>Bedrooms</label><input data-ptr-beds type="number" min="0" step="1" value="${esc(inputs.bedrooms??'')}"></div>
      <div class="field"><label>Bathrooms</label><input data-ptr-baths type="number" min="0" step="0.5" value="${esc(inputs.bathrooms??'')}"></div>
      <div class="field"><label>Square Feet</label><input data-ptr-sf type="number" min="0" step="1" value="${esc(inputs.squareFootage??'')}"></div>
      <div class="field"><label>Max Radius (mi)</label><input data-ptr-radius type="number" min="0.5" max="10" step="0.5" value="${esc(inputs.maxRadius??3)}"></div>
      <div class="field"><label>Listing Age (days)</label><input data-ptr-days type="number" min="30" max="365" step="30" value="${esc(inputs.daysOld??180)}"></div>
      <div class="field"><label>Comparable Count</label><input data-ptr-count type="number" min="5" max="15" step="1" value="${esc(inputs.compCount??10)}"></div>
    </div><div class="ptr-actions"><button class="btn primary" type="button" data-ptr-run>Research Market Rent</button></div><div id="ptrResults"></div></div>`;
    host.querySelector('.ptr-close').onclick=close;host.querySelector('[data-ptr-run]').onclick=runResearch;
    if(old?.estimate)renderResults(old);
  }

  function readInputs(){
    const h=document.getElementById('ptMarketRentContent');
    const val=s=>h.querySelector(s)?.value;
    const maybe=s=>{const x=Number(val(s));return Number.isFinite(x)&&val(s)!==''?x:null;};
    return {address:(val('[data-ptr-address]')||'').trim(),propertyType:val('[data-ptr-type]')||'',bedrooms:maybe('[data-ptr-beds]'),bathrooms:maybe('[data-ptr-baths]'),squareFootage:maybe('[data-ptr-sf]'),maxRadius:maybe('[data-ptr-radius]')||3,daysOld:maybe('[data-ptr-days]')||180,compCount:maybe('[data-ptr-count]')||10};
  }

  async function runResearch(){
    const inputs=readInputs(),results=document.getElementById('ptrResults'),btn=document.querySelector('[data-ptr-run]');
    if(!inputs.address){results.innerHTML='<div class="ptr-error">Enter the full property address first.</div>';return;}
    try{if(typeof cloudUser==='undefined'||!cloudUser){results.innerHTML='<div class="ptr-error">Sign in to PropertyThesis before using Market Rent Support.</div>';return;}}catch(_e){return;}
    btn.disabled=true;btn.textContent='Researching…';results.innerHTML='<div class="note" style="margin-top:12px">Searching current rental data…</div>';
    try{
      const {data,error}=await cloudClient.functions.invoke('rentcast-rent-support',{body:inputs});
      if(error)throw error;if(data?.error)throw new Error(data.error+(data?.details?.message?' — '+data.details.message:''));
      const support={source:'RentCast',researchedAt:new Date().toISOString(),inputs,estimate:Number(data?.rent),rangeLow:Number(data?.rentRangeLow),rangeHigh:Number(data?.rentRangeHigh),subjectProperty:data?.subjectProperty||null,comparables:(data?.comparables||[]).slice(0,15),concludedRent:Number(data?.rent)};
      state.marketRentSupport=support;renderResults(support);status('Market rent research completed');
    }catch(e){results.innerHTML=`<div class="ptr-error">Market rent research failed: ${esc(e?.message||e)}</div>`;status('Market rent research failed');}
    finally{btn.disabled=false;btn.textContent='Research Market Rent';}
  }

  function compAddress(c){return c?.formattedAddress||[c?.addressLine1,c?.city,c?.state,c?.zipCode].filter(Boolean).join(', ')||'Rental comparable';}
  function renderResults(s){
    const host=document.getElementById('ptrResults');if(!host)return;const comps=Array.isArray(s.comparables)?s.comparables:[];
    const med=comps.map(c=>Number(c.price??c.rent)).filter(Number.isFinite).sort((a,b)=>a-b);const median=med.length?med[Math.floor(med.length/2)]:NaN;
    host.innerHTML=`<div class="ptr-summary"><div class="ptr-stat"><span>RentCast Estimate</span><b>${money(s.estimate)}</b></div><div class="ptr-stat"><span>Low Range</span><b>${money(s.rangeLow)}</b></div><div class="ptr-stat"><span>High Range</span><b>${money(s.rangeHigh)}</b></div><div class="ptr-stat"><span>Median Comp Rent</span><b>${money(median)}</b></div></div>
      <div class="ptr-conclusion"><div class="field"><label>Concluded Market Rent</label><input data-ptr-conclusion type="number" step="25" value="${Number.isFinite(Number(s.concludedRent))?Number(s.concludedRent):''}"></div><div class="ptr-actions"><button class="btn primary" type="button" data-ptr-use>Use Concluded Rent in Analysis</button></div><div class="ptr-note">The API estimate does not change your underwriting until you click this button.</div></div>
      <div class="sectionhead"><div><h3 style="margin:0">Rental Comparables</h3><p>${comps.length} comparable listing${comps.length===1?'':'s'} returned by RentCast.</p></div></div><div class="ptr-comps">${comps.map((c,i)=>`<div class="ptr-comp"><div class="ptr-comp-top"><h4>${i+1}. ${esc(compAddress(c))}</h4><div class="rent">${money(c.price??c.rent)}/mo</div></div><div class="ptr-comp-meta"><span>${esc(c.propertyType||'Property')}</span><span>${num(c.bedrooms)} bd / ${num(c.bathrooms,1)} ba</span><span>${num(c.squareFootage)} SF</span><span>${Number.isFinite(Number(c.distance))?Number(c.distance).toFixed(2)+' mi':'Distance —'}</span>${Number.isFinite(Number(c.correlation))?`<span>Similarity ${(Number(c.correlation)*100).toFixed(0)}%</span>`:''}</div></div>`).join('')||'<div class="note">No rental comparables were returned.</div>'}</div>`;
    host.querySelector('[data-ptr-use]').onclick=useConclusion;
  }

  function useConclusion(){
    const v=Number(document.querySelector('[data-ptr-conclusion]')?.value);if(!Number.isFinite(v)||v<=0){status('Enter a valid concluded market rent');return;}
    try{state.marketRentSupport={...(state.marketRentSupport||{}),concludedRent:v};state.rent=v;const base=document.getElementById('f_rent');if(base)base.value=v;document.querySelectorAll('[data-src="f_rent"]').forEach(x=>x.value=v);if(typeof render==='function')render();try{window.GuidedAnalysisSetup?.refresh?.();}catch(_e){}try{window.GuidedAssumptionGuidance?.apply?.();}catch(_e){}try{window.UnsavedChangeProtection?.markDirty?.();}catch(_e){}try{window.SaveStateFeedback?.unsaved?.();}catch(_e){}status('Concluded market rent applied to analysis');close();}catch(e){status('Could not apply concluded rent: '+e.message);}
  }

  function decorate(){
    ensureStyles();let added=false;
    const base=document.getElementById('f_rent');if(base){const field=base.closest('.field');if(field&&!field.querySelector('[data-ptr-open]')){const b=document.createElement('button');b.type='button';b.className='btn ghost pt-rent-research-btn';b.dataset.ptrOpen='1';b.textContent='Research Market Rent';field.appendChild(b);added=true;}}
    document.querySelectorAll('#guidedSetup [data-src="f_rent"]').forEach(inp=>{const field=inp.closest('.gw-field')||inp.parentElement;if(field&&!field.querySelector('[data-ptr-open]')){const b=document.createElement('button');b.type='button';b.className='btn ghost pt-rent-research-btn';b.dataset.ptrOpen='1';b.textContent='Research Market Rent';field.appendChild(b);added=true;}});
    return added;
  }

  document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-ptr-open]');if(b){e.preventDefault();e.stopPropagation();drawForm();return;}if(e.target?.closest?.('#guidedSetup,[data-s8-tab="assumptions"],#appNavNew,[data-pt-open],[data-hub-open]'))setTimeout(decorate,120);},true);
  window.MarketRentSupport={open:drawForm,decorate,runResearch};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,350),{once:true});else setTimeout(decorate,350);
})();
