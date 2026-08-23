'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyCharacteristicsVersion||0)>=VERSION)return;
  window.__propertyCharacteristicsVersion=VERSION;

  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const allowedRentCastTypes=new Set(['Single Family','Condo','Townhouse','Manufactured','Multi-Family','Apartment']);
  function status(msg){try{if(typeof setStatus==='function')setStatus(msg);}catch(_e){}}
  function signed(){try{return !!cloudUser;}catch(_e){return false;}}
  function selectedPid(){try{return selectedPropertyId||document.querySelector('#ptAnalysisContent [data-pt-new]')?.dataset?.ptNew||null;}catch(_e){return null;}}
  function property(pid=selectedPid()){try{return (cloudProperties||[]).find(x=>x.id===pid)||null;}catch(_e){return null;}}
  function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
  function fieldNum(card,sel,{integer=false,min=null,max=null}={}){
    const raw=card.querySelector(sel)?.value?.trim?.()??'';
    if(raw==='')return null;
    const x=Number(raw);if(!Number.isFinite(x))return NaN;
    const y=integer?Math.round(x):x;
    if(min!=null&&y<min)return NaN;if(max!=null&&y>max)return NaN;return y;
  }

  function ensureStyles(){
    if(document.getElementById('ptPropertyCharacteristicsStyles'))return;
    const s=document.createElement('style');s.id='ptPropertyCharacteristicsStyles';s.textContent=`
      .pt-property-characteristics{margin:0 0 14px;border:1px solid #dce5ed;border-radius:11px;background:#fff;padding:13px}
      .pt-property-characteristics h4{margin:0 0 3px;font-size:13px}.pt-property-characteristics p{margin:0 0 11px;color:#667085;font-size:9.5px}
      .pt-characteristics-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.pt-characteristics-grid label{font-size:8px}.pt-characteristics-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      @media(max-width:760px){.pt-characteristics-grid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.pt-characteristics-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function fallback(p,key){
    if(p?.[key]!==null&&p?.[key]!==undefined&&p?.[key]!=='')return p[key];
    try{
      const inputs=state?.marketRentSupport?.inputs||{};
      if(key==='property_type')return inputs.propertyType||'';
      if(key==='bedrooms')return inputs.bedrooms??'';
      if(key==='bathrooms')return inputs.bathrooms??'';
      if(key==='living_area')return inputs.squareFootage??'';
      if(key==='units')return state?.units??'';
    }catch(_e){}
    return '';
  }

  function decorateManager(){
    ensureStyles();
    const host=document.getElementById('ptAnalysisContent');if(!host)return false;
    const body=host.querySelector('.pt-body');if(!body)return false;
    const pid=selectedPid();if(!pid)return false;
    const p=property(pid);if(!p)return false;
    let card=host.querySelector('[data-pt-property-characteristics]');
    if(card&&card.dataset.ptPropertyCharacteristics!==pid){card.remove();card=null;}
    if(card)return true;
    card=document.createElement('div');card.className='pt-property-characteristics';card.dataset.ptPropertyCharacteristics=pid;
    const type=fallback(p,'property_type');
    const types=['','Single Family','Condo','Townhouse','Manufactured','Multi-Family','Apartment','Other'];
    card.innerHTML=`<h4>Property Characteristics</h4><p>Saved once at the property level and reused across analyses, including Market Rent research.</p><div class="pt-characteristics-grid">
      <div class="field"><label>Property Type</label><select data-pt-char-type>${types.map(x=>`<option value="${esc(x)}" ${x===type?'selected':''}>${esc(x||'Select type')}</option>`).join('')}</select></div>
      <div class="field"><label>Bedrooms</label><input data-pt-char-beds type="number" min="0" step="1" value="${esc(fallback(p,'bedrooms'))}"></div>
      <div class="field"><label>Bathrooms</label><input data-pt-char-baths type="number" min="0" step="0.5" value="${esc(fallback(p,'bathrooms'))}"></div>
      <div class="field"><label>Living Area (SF)</label><input data-pt-char-sf type="number" min="0" step="1" value="${esc(fallback(p,'living_area'))}"></div>
      <div class="field"><label>Year Built</label><input data-pt-char-year type="number" min="1600" max="2100" step="1" value="${esc(fallback(p,'year_built'))}"></div>
      <div class="field"><label>Units</label><input data-pt-char-units type="number" min="1" step="1" value="${esc(fallback(p,'units'))}"></div>
    </div><div class="pt-characteristics-actions"><button class="btn secondary" type="button" data-pt-char-save>Save Property Characteristics</button></div>`;
    const recordEditor=body.querySelector('[data-pt-record-editor]');
    if(recordEditor)recordEditor.insertAdjacentElement('afterend',card);else body.insertBefore(card,body.querySelector('.pt-toolbar')||body.firstChild);
    card.querySelector('[data-pt-char-save]').onclick=async()=>{
      if(!signed())return;
      const bedrooms=fieldNum(card,'[data-pt-char-beds]',{integer:true,min:0,max:99});
      const bathrooms=fieldNum(card,'[data-pt-char-baths]',{min:0,max:99});
      const living_area=fieldNum(card,'[data-pt-char-sf]',{integer:true,min:0,max:1000000});
      const year_built=fieldNum(card,'[data-pt-char-year]',{integer:true,min:1600,max:2100});
      const units=fieldNum(card,'[data-pt-char-units]',{integer:true,min:1,max:10000});
      if([bedrooms,bathrooms,living_area,year_built,units].some(Number.isNaN)){status('Check the property characteristics for invalid values');return;}
      const payload={property_type:card.querySelector('[data-pt-char-type]').value||null,bedrooms,bathrooms,living_area,year_built,units,updated_at:new Date().toISOString()};
      const btn=card.querySelector('[data-pt-char-save]');btn.disabled=true;btn.textContent='Saving…';
      try{
        const {error}=await cloudClient.from('properties').update(payload).eq('id',pid).eq('user_id',cloudUser.id);
        if(error){status('Property characteristics save failed: '+error.message);return;}
        if(typeof refreshCloud==='function')await refreshCloud();
        status('Property characteristics saved');btn.textContent='Saved';setTimeout(()=>{if(btn.isConnected)btn.textContent='Save Property Characteristics';},1200);
      }finally{btn.disabled=false;}
    };
    return true;
  }

  function prefillMarketRent(){
    const p=property();if(!p)return false;
    try{
      if(!state)return false;
      const existing=state.marketRentSupport||{};
      const inputs={...(existing.inputs||{})};
      if(!inputs.propertyType&&allowedRentCastTypes.has(p.property_type))inputs.propertyType=p.property_type;
      if((inputs.bedrooms===null||inputs.bedrooms===undefined||inputs.bedrooms==='')&&p.bedrooms!==null&&p.bedrooms!==undefined)inputs.bedrooms=p.bedrooms;
      if((inputs.bathrooms===null||inputs.bathrooms===undefined||inputs.bathrooms==='')&&p.bathrooms!==null&&p.bathrooms!==undefined)inputs.bathrooms=Number(p.bathrooms);
      if((inputs.squareFootage===null||inputs.squareFootage===undefined||inputs.squareFootage==='')&&p.living_area!==null&&p.living_area!==undefined)inputs.squareFootage=p.living_area;
      state.marketRentSupport={...existing,inputs};
      return true;
    }catch(_e){return false;}
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-pt-manage]'))setTimeout(decorateManager,130);
    if(e.target?.closest?.('[data-ptr-open]'))prefillMarketRent();
  },true);

  function refresh(){decorateManager();}
  window.PropertyCharacteristics={refresh,decorateManager,prefillMarketRent};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,420),{once:true});else setTimeout(refresh,420);
})();
