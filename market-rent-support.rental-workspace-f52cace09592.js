'use strict';
(()=>{
  const VERSION=3;
  if((window.__marketRentSupportVersion||0)>=VERSION)return;
  window.__marketRentSupportVersion=VERSION;

  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const money=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?(typeof fmtC==='function'?fmtC(Number(v)):Number(v).toLocaleString('en-US',{style:'currency',currency:'USD'})):'—';
  const num=(v,d=0)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:d}):'—';
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));

  let workspace=null;
  function put(s){if(workspace)workspace.store=s;else state.marketRentSupport=s;}
  function status(msg){try{if(typeof setStatus==='function')setStatus(msg);}catch(_e){}}
  function currentAddress(){if(workspace)return workspace.address;try{return document.getElementById('f_address')?.value.trim()||state?.address||'';}catch(_e){return '';}}
  function prior(){if(workspace)return workspace.store;try{return state?.marketRentSupport||null;}catch(_e){return null;}}
  function markDirty(){if(workspace)return;try{window.UnsavedChangeProtection?.markDirty?.();}catch(_e){}try{window.SaveStateFeedback?.unsaved?.();}catch(_e){}}

  function ensureStyles(){
    if(document.getElementById('ptMarketRentStyles'))return;
    const s=document.createElement('style');s.id='ptMarketRentStyles';s.textContent=`
      .pt-rent-research-btn{margin-top:6px;width:100%}
      #ptMarketRentModal{position:fixed;inset:0;z-index:10120;background:rgba(15,23,42,.56);display:flex;align-items:flex-start;justify-content:center;padding:34px 14px;overflow:auto}#ptMarketRentModal.hidden{display:none}
      #ptMarketRentModal .ptr-shell{width:min(1040px,100%);background:#f7f9fc;border:1px solid #d7e0e8;border-radius:16px;box-shadow:0 28px 80px rgba(15,23,42,.3);overflow:hidden}.ptr-head{display:flex;justify-content:space-between;gap:14px;padding:18px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.ptr-head h3{margin:2px 0;font-size:19px}.ptr-head p{margin:0;color:#667085;font-size:10px}.ptr-close{width:34px;height:34px;border:0;border-radius:999px;background:#eef2f6;font-size:20px;cursor:pointer}.ptr-body{padding:16px 20px 22px}.ptr-grid{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:9px}.ptr-grid .wide{grid-column:1/-1}.ptr-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.ptr-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.ptr-stat{background:#fff;border:1px solid #dfe6ed;border-radius:9px;padding:10px}.ptr-stat span{display:block;color:#667085;font-size:8px;text-transform:uppercase;font-weight:700}.ptr-stat b{display:block;font-size:14px;margin-top:3px}.ptr-conclusion{background:#fff;border:1px solid #b9cee0;border-radius:10px;padding:12px;margin:12px 0}.ptr-conclusion-grid{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:12px}.ptr-conclusion textarea{min-height:88px;resize:vertical}.ptr-comp-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.ptr-comps{display:grid;gap:8px}.ptr-comp{background:#fff;border:1px solid #dfe6ed;border-radius:9px;padding:10px}.ptr-comp.ptr-excluded{opacity:.58;background:#f8fafc}.ptr-comp-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ptr-comp-title{display:flex;gap:9px;align-items:flex-start;min-width:0}.ptr-comp h4{margin:0;font-size:11px}.ptr-comp .rent{font-weight:800;white-space:nowrap}.ptr-comp-meta{display:flex;gap:10px;flex-wrap:wrap;color:#667085;font-size:8.5px;margin-top:5px}.ptr-comp-toggle{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:700;color:#344054;white-space:nowrap}.ptr-note{font-size:9px;color:#667085;margin-top:8px}.ptr-error{background:#fff1f1;border:1px solid #e8b1b1;color:#9b2c2c;border-radius:9px;padding:10px;margin-top:10px}
      @media(max-width:760px){.ptr-grid{grid-template-columns:1fr 1fr}.ptr-grid .wide{grid-column:1/-1}.ptr-summary,.ptr-comp-summary{grid-template-columns:1fr 1fr}.ptr-conclusion-grid{grid-template-columns:1fr}.ptr-comp-top{display:block}.ptr-comp .rent{margin-top:4px}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    ensureStyles();if(workspace)return workspace.dialog;let m=document.getElementById('ptMarketRentModal');if(m)return m;
    m=document.createElement('div');m.id='ptMarketRentModal';m.className='hidden';m.innerHTML='<div class="ptr-shell"><div id="ptMarketRentContent"></div></div>';document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.classList.contains('hidden'))close();});return m;
  }
  function close(){if(workspace)return workspace.close();document.getElementById('ptMarketRentModal')?.classList.add('hidden');}

  function normalizeSupport(s){
    if(!s)return null;
    const comparables=(Array.isArray(s.comparables)?s.comparables:[]).map((c,i)=>({...c,_ptrId:c?._ptrId||String(c?.id||c?.listingId||c?.formattedAddress||c?.addressLine1||i),included:c?.included!==false}));
    return {...s,comparables,analystNote:String(s.analystNote||'')};
  }

  function saveSupport(patch,dirty=true){
    try{put({...(normalizeSupport(prior())||{}),...patch});if(dirty)markDirty();return prior();}catch(_e){return null;}
  }

  function drawForm(){
    const old=normalizeSupport(prior()),inputs=old?.inputs||{},m=ensureModal(),host=workspace?.host||document.getElementById('ptMarketRentContent');m.classList.remove('hidden');
    host.innerHTML=`<div class="ptr-head"><div><div class="pt-eyebrow">Market Rent Support</div><h3>Search Rental Comps</h3><p>RentCast market estimate and comparable rental listings. Your selected comps and analyst conclusion remain the final support for underwriting.</p></div><button class="ptr-close" type="button">×</button></div><div class="ptr-body"><div class="ptr-grid">
      <div class="field wide"><label>Property Address</label><input data-ptr-address value="${esc(inputs.address||currentAddress())}" placeholder="Full street address, city, state ZIP"></div>
      <div class="field"><label>Property Type</label><select data-ptr-type><option value="">Auto-detect</option>${['Single Family','Condo','Townhouse','Manufactured','Multi-Family','Apartment'].map(x=>`<option ${inputs.propertyType===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>Bedrooms</label><input data-ptr-beds type="number" min="0" step="1" value="${esc(inputs.bedrooms??'')}"></div>
      <div class="field"><label>Bathrooms</label><input data-ptr-baths type="number" min="0" step="0.5" value="${esc(inputs.bathrooms??'')}"></div>
      <div class="field"><label>Square Feet</label><input data-ptr-sf type="number" min="0" step="1" value="${esc(inputs.squareFootage??'')}"></div>
      <div class="field"><label>Max Radius (mi)</label><input data-ptr-radius type="number" min="0.5" max="10" step="0.5" value="${esc(inputs.maxRadius??3)}"></div>
      <div class="field"><label>Listing Age (days)</label><input data-ptr-days type="number" min="30" max="365" step="30" value="${esc(inputs.daysOld??180)}"></div>
      <div class="field"><label>Comparable Count</label><input data-ptr-count type="number" min="5" max="15" step="1" value="${esc(inputs.compCount??10)}"></div>
    </div><div class="ptr-actions"><button class="btn primary" type="button" data-ptr-run>Search Rental Comps</button></div><details class="ptr-manual"><summary><b>Add a rental comp manually</b></summary><p>Use this when a rental listing is missing. Required fields are marked *. Enter monthly rent for the unit or listing, not the total income of an entire multi-unit property.</p><div class="ptr-grid"><div class="field wide"><label>Full rental address / unit *</label><input data-rental-manual="address" required maxlength="250"></div><div class="field"><label>Monthly rent ($) *</label><input data-rental-manual="rent" type="number" min="1" step="0.01" required></div><div class="field"><label>Bedrooms</label><input data-rental-manual="bedrooms" type="number" min="0" step="1"></div><div class="field"><label>Bathrooms</label><input data-rental-manual="bathrooms" type="number" min="0" step="0.5"></div><div class="field"><label>Square feet</label><input data-rental-manual="squareFootage" type="number" min="1" step="1"></div><div class="field wide"><label>Source / listing reference *</label><input data-rental-manual="source" required maxlength="300" placeholder="Stellar MLS listing number, listing URL, or lease reference"></div></div><button type="button" class="btn secondary" data-ptr-manual-add>Add Rental Comp</button><p role="status" data-ptr-manual-status></p></details><div id="ptrResults"></div></div>`;
    host.querySelector('.ptr-close').onclick=close;host.querySelector('[data-ptr-run]').onclick=runResearch;host.querySelector('[data-ptr-manual-add]').onclick=addManual;
    if(workspace)host.querySelector('.ptr-head').remove();if(old&&(old.estimate||old.comparables?.length))renderResults(old);
  }

  function readInputs(){
    const h=workspace?.host||document.getElementById('ptMarketRentContent');const val=s=>h.querySelector(s)?.value;
    const maybe=s=>{const raw=val(s),x=Number(raw);return Number.isFinite(x)&&raw!==''?x:null;};
    return {address:(val('[data-ptr-address]')||'').trim(),propertyType:val('[data-ptr-type]')||'',bedrooms:maybe('[data-ptr-beds]'),bathrooms:maybe('[data-ptr-baths]'),squareFootage:maybe('[data-ptr-sf]'),maxRadius:maybe('[data-ptr-radius]')||3,daysOld:maybe('[data-ptr-days]')||180,compCount:maybe('[data-ptr-count]')||10};
  }

  async function runResearch(){
    const context=workspace,user=typeof cloudUser==='undefined'?null:cloudUser?.id;const inputs=readInputs(),results=document.getElementById('ptrResults'),btn=document.querySelector('[data-ptr-run]');
    if(!inputs.address){results.innerHTML='<div class="ptr-error">Enter the full property address first.</div>';return;}
    try{if(typeof cloudUser==='undefined'||!cloudUser){results.innerHTML='<div class="ptr-error">Sign in to PropertyThesis before using Market Rent Support.</div>';return;}}catch(_e){return;}
    btn.disabled=true;btn.textContent='Researching…';results.innerHTML='<div class="note" style="margin-top:12px">Searching current rental data…</div>';
    try{
      const {data,error}=await cloudClient.functions.invoke('rentcast-rent-support',{body:inputs});
      if(context!==workspace||user!==cloudUser?.id)return;if(error)throw error;if(data?.error)throw new Error(data.error+(data?.details?.message?' — '+data.details.message:''));
      const previous=normalizeSupport(prior());
      const retained=(previous?.comparables||[]).filter(c=>c.entryMethod==='manual');const comparables=(data?.comparables||[]).slice(0,Math.max(0,15-retained.length)).map((c,i)=>({...c,_ptrId:String(c?.id||c?.listingId||c?.formattedAddress||c?.addressLine1||i),included:true})).concat(retained);
      const support={source:'RentCast',researchedAt:new Date().toISOString(),inputs,estimate:Number(data?.rent),rangeLow:Number(data?.rentRangeLow),rangeHigh:Number(data?.rentRangeHigh),subjectProperty:data?.subjectProperty||null,comparables,concludedRent:Number(data?.rent),analystNote:previous?.analystNote||''};
      put(support);renderResults(support);markDirty();status('Market rent research completed');
    }catch(e){if(context!==workspace)return;results.innerHTML=`<div class="ptr-error">Market rent research failed: ${esc(e?.message||e)}</div>`;status('Market rent research failed');}
    finally{btn.disabled=false;btn.textContent='Search Rental Comps';}
  }

  function addManual(){
    const host=workspace?.host||document.getElementById('ptMarketRentContent'),inputs=[...host.querySelectorAll('[data-rental-manual]')],msg=host.querySelector('[data-ptr-manual-status]');
    for(const input of inputs)if(!input.checkValidity()){input.reportValidity();msg.textContent='Enter the required address, positive monthly rent, and source / listing reference.';return;}
    const val=k=>host.querySelector('[data-rental-manual="'+k+'"]').value.trim(),optional=k=>val(k)===''?null:Number(val(k));
    if(!val('address')||!val('source')){msg.textContent='A rental address and source / listing reference are required.';return;}
    const s=normalizeSupport(prior())||{comparables:[],inputs:readInputs()};if(s.comparables.length>=15){msg.textContent='Up to 15 rental comps are supported. Remove a listing before adding another.';return;}
    s.comparables.push({_ptrId:'manual:'+crypto.randomUUID(),formattedAddress:val('address'),price:Number(val('rent')),bedrooms:optional('bedrooms'),bathrooms:optional('bathrooms'),squareFootage:optional('squareFootage'),source:'User-entered — '+val('source'),entryMethod:'manual',included:true});
    put(s);renderResults(s);inputs.forEach(i=>i.value='');msg.textContent='Manual rental added. Click Save Rental Comps to keep it with this property.';
  }
  function compAddress(c){return c?.formattedAddress||[c?.addressLine1,c?.city,c?.state,c?.zipCode].filter(Boolean).join(', ')||'Rental comparable';}
  function compRent(c){return Number(c?.price??c?.rent);}
  function compSf(c){return Number(c?.squareFootage);}
  function selectedComps(s){return (s.comparables||[]).filter(c=>c.included!==false);}
  function stats(s){
    const selected=selectedComps(s),rents=selected.map(compRent).filter(Number.isFinite).sort((a,b)=>a-b);
    const avg=rents.length?rents.reduce((a,b)=>a+b,0)/rents.length:NaN;
    const median=!rents.length?NaN:rents.length%2?rents[(rents.length-1)/2]:(rents[rents.length/2-1]+rents[rents.length/2])/2;
    const psf=selected.map(c=>{const r=compRent(c),sf=compSf(c);return Number.isFinite(r)&&Number.isFinite(sf)&&sf>0?r/sf:NaN;}).filter(Number.isFinite);
    const avgPsf=psf.length?psf.reduce((a,b)=>a+b,0)/psf.length:NaN;
    return {count:selected.length,avg,median,avgPsf};
  }

  function renderResults(raw){
    const s=normalizeSupport(raw),host=document.getElementById('ptrResults');if(!host)return;put(s);
    const comps=s.comparables||[],st=stats(s);
    host.innerHTML=`<div class="ptr-summary"><div class="ptr-stat"><span>RentCast Estimate</span><b>${money(s.estimate)}</b></div><div class="ptr-stat"><span>Low Range</span><b>${money(s.rangeLow)}</b></div><div class="ptr-stat"><span>High Range</span><b>${money(s.rangeHigh)}</b></div><div class="ptr-stat"><span>Returned Comps</span><b>${comps.length}</b></div></div>
      <div class="ptr-conclusion"><div class="ptr-conclusion-grid"><div class="field"><label>Concluded monthly market rent (optional)</label><input data-ptr-conclusion type="number" step="25" value="${finite(s.concludedRent)?Number(s.concludedRent):''}"></div><div class="field"><label>Analyst Commentary / Rent Rationale</label><textarea data-ptr-note placeholder="Explain why the concluded rent is appropriate relative to the selected rental comps and subject characteristics.">${esc(s.analystNote||'')}</textarea></div></div><div class="ptr-actions"><button class="btn primary" type="button" data-ptr-use>Use Concluded Rent in Analysis</button><button class="btn ghost" type="button" data-ptr-save-support>Save Rent Support Notes</button></div><div class="ptr-note">The API estimate does not change your underwriting until you click Use Concluded Rent in Analysis. Comp selections and commentary are saved with the analysis.</div></div>
      <div class="sectionhead"><div><h3 style="margin:0">Rental Comparables</h3><p>Select only the listings you consider credible support for the subject.</p></div></div>
      <div class="ptr-comp-summary" data-ptr-comp-summary>${summaryHtml(st)}</div>
      <div class="ptr-comps">${comps.map((c,i)=>compHtml(c,i)).join('')||'<div class="note">No rental comparables were returned.</div>'}</div>`;
    host.querySelector('[data-ptr-use]').onclick=useConclusion;
    host.querySelector('[data-ptr-save-support]').onclick=saveNotes;
    host.querySelectorAll('[data-ptr-remove]').forEach(b=>b.onclick=()=>{const next=normalizeSupport(prior());next.comparables=next.comparables.filter(c=>c._ptrId!==b.dataset.ptrRemove);put(next);renderResults(next);});host.querySelectorAll('[data-ptr-comp-toggle]').forEach(box=>box.addEventListener('change',toggleComp));
    host.querySelector('[data-ptr-conclusion]')?.addEventListener('input',()=>syncConclusion(false));
    host.querySelector('[data-ptr-note]')?.addEventListener('input',()=>syncNote(false));if(workspace){host.querySelector('.ptr-conclusion .ptr-actions').remove();host.querySelector('.ptr-conclusion .ptr-note').textContent='Save Rental Comps below to keep these selections and commentary under this property. This does not change the unit rents in your analysis.';}
  }

  function summaryHtml(st){return `<div class="ptr-stat"><span>Selected Comps</span><b>${st.count}</b></div><div class="ptr-stat"><span>Median Selected Rent</span><b>${money(st.median)}</b></div><div class="ptr-stat"><span>Average Selected Rent</span><b>${money(st.avg)}</b></div><div class="ptr-stat"><span>Average Rent / SF</span><b>${finite(st.avgPsf)?money(st.avgPsf):'—'}</b></div>`;}
  function compHtml(c,i){const included=c.included!==false;return `<div class="ptr-comp ${included?'':'ptr-excluded'}" data-ptr-comp="${esc(c._ptrId)}"><div class="ptr-comp-top"><div class="ptr-comp-title"><label class="ptr-comp-toggle"><input type="checkbox" data-ptr-comp-toggle="${esc(c._ptrId)}" ${included?'checked':''}> Include</label><h4>${i+1}. ${esc(compAddress(c))}</h4></div><div class="rent">${money(compRent(c))}/mo</div></div><div class="ptr-comp-meta"><span>${esc(c.source||'RentCast rental listing')}</span><span>${esc(c.propertyType||'Property')}</span><span>${num(c.bedrooms)} bd / ${num(c.bathrooms,1)} ba</span><span>${num(c.squareFootage)} SF</span><span>${finite(c.distance)?Number(c.distance).toFixed(2)+' mi':'Distance —'}</span>${finite(c.correlation)?`<span>Similarity ${(Number(c.correlation)*100).toFixed(0)}%</span>`:''}${finite(compRent(c))&&finite(compSf(c))&&Number(compSf(c))>0?`<span>${money(compRent(c)/compSf(c))}/SF</span>`:''}</div>${c.entryMethod==='manual'?'<button type="button" class="btn ghost" data-ptr-remove="'+esc(c._ptrId)+'">Remove manual comp</button>':''}</div>`;}

  function toggleComp(e){
    const id=String(e.currentTarget.dataset.ptrCompToggle||''),s=normalizeSupport(prior());if(!s)return;
    const c=s.comparables.find(x=>String(x._ptrId)===id);if(!c)return;c.included=!!e.currentTarget.checked;put(s);
    document.querySelector(`[data-ptr-comp="${CSS.escape(id)}"]`)?.classList.toggle('ptr-excluded',!c.included);
    const sum=document.querySelector('[data-ptr-comp-summary]');if(sum)sum.innerHTML=summaryHtml(stats(s));markDirty();
  }

  function syncConclusion(dirty=true){const v=Number(document.querySelector('[data-ptr-conclusion]')?.value);if(Number.isFinite(v)&&v>=0)saveSupport({concludedRent:v>0?v:null},dirty);}
  function syncNote(dirty=true){const analystNote=document.querySelector('[data-ptr-note]')?.value||'';saveSupport({analystNote},dirty);}
  function saveNotes(){syncConclusion(false);syncNote(false);markDirty();status('Market rent support notes saved to this analysis');}

  function useConclusion(){
    const v=Number(document.querySelector('[data-ptr-conclusion]')?.value);if(!Number.isFinite(v)||v<=0){status('Enter a valid concluded market rent');return;}
    try{syncNote(false);saveSupport({concludedRent:v},false);state.rent=v;if(Array.isArray(state.unitRents))state.unitRents=Array(Math.max(1,Math.round(Number(state.units)||1))).fill(v);const base=document.getElementById('f_rent');if(base)base.value=v;document.querySelectorAll('[data-src="f_rent"]').forEach(x=>x.value=v);if(typeof render==='function')render();try{window.GuidedAnalysisSetup?.refresh?.();}catch(_e){}try{window.GuidedAssumptionGuidance?.apply?.();}catch(_e){}markDirty();status('Concluded market rent applied to analysis');close();}catch(e){status('Could not apply concluded rent: '+e.message);}
  }

  function decorate(){document.querySelectorAll('[data-ptr-open]').forEach(b=>b.remove());return false;}

  document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-ptr-open]');if(b){e.preventDefault();e.stopPropagation();drawForm();return;}if(e.target?.closest?.('#guidedSetup,[data-s8-tab="assumptions"],#appNavNew,[data-pt-open],[data-hub-open]'))setTimeout(decorate,120);},true);
  window.MarketRentSupport={mount:context=>{workspace=context;drawForm();},unmount:()=>{workspace=null;},addManual,getDraft:()=>normalizeSupport(prior())||{comparables:[]},open:()=>{if(workspace)drawForm();},decorate,runResearch,stats:()=>stats(normalizeSupport(prior())||{comparables:[]})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,350),{once:true});else setTimeout(decorate,350);
})();
