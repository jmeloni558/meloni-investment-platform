'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyAddressRecognitionVersion||0)>=VERSION)return;
  window.__propertyAddressRecognitionVersion=VERSION;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const val=(v,d='—')=>v===null||v===undefined||v===''?d:v;
  const num=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US'):null;
  let busy=false;

  function ensureStyles(){if(document.getElementById('ptAddressRecognitionStyles'))return;const s=document.createElement('style');s.id='ptAddressRecognitionStyles';s.textContent=`
    .pt-address-tools{margin-top:7px;display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    .pt-address-tools .btn{padding:7px 10px!important;font-size:9px!important;min-height:32px!important}
    .pt-address-hint{font-size:8.5px;color:#667085;line-height:1.4}
    .pt-address-result{margin-top:8px;border:1px solid #cfe0ee;background:linear-gradient(180deg,#f8fbff,#f5fbf9);border-radius:9px;padding:9px 10px;font-size:8.8px;color:#425466;line-height:1.45}
    .pt-address-result.ok{border-color:#b8dfd5;background:#f3fbf8}.pt-address-result.error{border-color:#efc6c3;background:#fff7f6;color:#9c3d36}
    .pt-address-title{display:flex;align-items:center;gap:6px;font-weight:850;color:#174f83;margin-bottom:5px}.pt-address-title .dot{width:7px;height:7px;border-radius:50%;background:#14b8a6;display:inline-block}
    .pt-address-facts{display:flex;gap:7px 14px;flex-wrap:wrap}.pt-address-facts span{white-space:nowrap}.pt-address-facts b{color:#344054}
    @media(max-width:650px){.pt-address-tools{align-items:stretch}.pt-address-tools .btn{width:100%}.pt-address-hint{width:100%}}
  `;document.head.appendChild(s);}

  function addressInputs(){return [...document.querySelectorAll('#f_address,[data-src="f_address"]')];}
  function currentAddress(input){return String(input?.value||document.getElementById('f_address')?.value||window.state?.address||'').trim();}
  function syncAddress(address){addressInputs().forEach(el=>{if(el.value!==address){el.value=address;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}});try{if(window.state)state.address=address;}catch(_e){}}
  function markDirty(){try{window.UnsavedChangeProtection?.markDirty?.();}catch(_e){}try{window.SaveStateFeedback?.unsaved?.();}catch(_e){}}

  function summary(p){const facts=[];if(p.propertyType)facts.push(`<span><b>Type:</b> ${esc(p.propertyType)}</span>`);if(num(p.squareFootage))facts.push(`<span><b>Living Area:</b> ${num(p.squareFootage)} SF</span>`);if(p.yearBuilt)facts.push(`<span><b>Built:</b> ${esc(p.yearBuilt)}</span>`);if(num(p.lotSize))facts.push(`<span><b>Lot:</b> ${num(p.lotSize)} SF</span>`);if(p.bedrooms!==null&&p.bedrooms!==undefined)facts.push(`<span><b>Beds:</b> ${esc(p.bedrooms)}</span>`);if(p.bathrooms!==null&&p.bathrooms!==undefined)facts.push(`<span><b>Baths:</b> ${esc(p.bathrooms)}</span>`);return `<div class="pt-address-title"><span class="dot"></span>Property matched through RentCast</div><div><strong>${esc(p.formattedAddress||'Recognized property')}</strong></div>${facts.length?`<div class="pt-address-facts">${facts.join('')}</div>`:''}<div class="pt-address-hint" style="margin-top:5px">Public-record facts are reference data. Review and override any property or underwriting inputs that differ from your source documents.</div>`;}

  function renderAll(kind,html){document.querySelectorAll('.pt-address-result').forEach(el=>{el.className='pt-address-result '+kind;el.innerHTML=html;});}

  async function lookup(input){if(busy)return;const address=currentAddress(input);if(!address){renderAll('error','Enter the full street address, city, state and ZIP first.');input?.focus();return;}try{if(typeof cloudUser==='undefined'||!cloudUser){renderAll('error','Sign in to PropertyThesis before recognizing a property.');return;}if(typeof cloudClient==='undefined'||!cloudClient){renderAll('error','Property lookup is not available yet.');return;}}catch(_e){renderAll('error','Property lookup is not available yet.');return;}
    busy=true;document.querySelectorAll('[data-pt-recognize]').forEach(b=>{b.disabled=true;b.textContent='Recognizing…';});renderAll('','Checking the property record…');
    try{const {data,error}=await cloudClient.functions.invoke('rentcast-property-lookup',{body:{address}});if(error)throw error;if(data?.error)throw new Error(data.error);if(!data?.matched||!data?.property){renderAll('error','No matching RentCast property record was found. You can continue with the address manually.');return;}const p=data.property;syncAddress(p.formattedAddress||address);try{state.subjectProperty={...(state.subjectProperty||{}),...p,recognizedAt:new Date().toISOString(),source:'RentCast'};}catch(_e){}markDirty();renderAll('ok',summary(p));try{if(typeof setStatus==='function')setStatus('Property recognized');}catch(_e){}
    }catch(e){renderAll('error',`Property recognition failed: ${esc(e?.message||e)}. You can continue with manual entry.`);}finally{busy=false;document.querySelectorAll('[data-pt-recognize]').forEach(b=>{b.disabled=false;b.textContent='Recognize Property';});}}

  function enhance(input){if(!input||input.dataset.ptAddressEnhanced==='1')return;input.dataset.ptAddressEnhanced='1';ensureStyles();input.setAttribute('autocomplete','street-address');input.placeholder=input.placeholder||'Start with the full property address';const tools=document.createElement('div');tools.className='pt-address-tools';tools.innerHTML='<button type="button" class="btn secondary" data-pt-recognize>Recognize Property</button><span class="pt-address-hint">For now, enter the complete address. Live type-ahead suggestions are the next connection.</span>';const result=document.createElement('div');result.className='pt-address-result';result.innerHTML='Enter a complete address and click <b>Recognize Property</b>. Manual entry remains available if no record is found.';input.insertAdjacentElement('afterend',tools);tools.insertAdjacentElement('afterend',result);tools.querySelector('[data-pt-recognize]').addEventListener('click',()=>lookup(input));input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();lookup(input);}});const saved=(()=>{try{return state?.subjectProperty||null;}catch(_e){return null;}})();if(saved?.formattedAddress&&saved.formattedAddress===currentAddress(input))result.className='pt-address-result ok',result.innerHTML=summary(saved);}

  function scan(){addressInputs().forEach(enhance);}
  const mo=new MutationObserver(()=>scan());
  function start(){scan();mo.observe(document.documentElement,{childList:true,subtree:true});}
  window.PropertyAddressRecognition={version:VERSION,scan,lookup};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
