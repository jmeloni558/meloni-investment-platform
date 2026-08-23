'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyFactsAutofillV||0)>=VERSION)return;
  window.__propertyFactsAutofillV=VERSION;

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
  const empty=v=>v===null||v===undefined||v==='';

  const FIELDS=[
    ['propertyType','Property Type','text'],
    ['bedrooms','Bedrooms','number'],
    ['bathrooms','Bathrooms','number'],
    ['squareFootage','Living Area (SF)','number'],
    ['yearBuilt','Year Built','number'],
    ['lotSize','Lot Size (SF)','number'],
    ['county','County','text'],
    ['subdivision','Subdivision','text'],
    ['assessorID','Assessor / Parcel ID','text']
  ];

  function ensureStyles(){
    if(document.getElementById('ptPropertyFactsAutofillStyle'))return;
    const s=document.createElement('style');
    s.id='ptPropertyFactsAutofillStyle';
    s.textContent=`
      .pt-property-facts{grid-column:1/-1;border:1px solid #cfe0ec;background:#f8fbfd;border-radius:11px;padding:12px 13px;margin-top:1px}
      .pt-property-facts-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}
      .pt-property-facts-head h3{font-size:11px;margin:0 0 2px;color:#243b53}.pt-property-facts-head p{font-size:8.5px;line-height:1.4;color:#667085;margin:0}
      .pt-rentcast-badge{font-size:7px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;background:#e7f7ef;color:#067647;border:1px solid #b7e3ca;border-radius:999px;padding:3px 7px;white-space:nowrap}
      .pt-property-facts-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px 11px}
      .pt-property-fact label{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:8.3px;font-weight:800;color:#475467;margin-bottom:4px}
      .pt-property-fact label small{font-size:6.5px;font-weight:900;color:#067647;text-transform:uppercase;letter-spacing:.035em}
      .pt-property-fact input{width:100%;height:36px;border:1px solid #cbd8e3;border-radius:8px;background:#fff;padding:7px 9px;font-size:10px;outline:none}
      .pt-property-fact input:focus{border-color:#2b6fa8;box-shadow:0 0 0 3px #2b6fa817}
      .pt-property-facts-foot{margin-top:8px;font-size:7.8px;color:#667085;line-height:1.4}
      @media(max-width:820px){.pt-property-facts-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.pt-property-facts-grid{grid-template-columns:1fr}.pt-property-facts-head{display:block}.pt-rentcast-badge{display:inline-block;margin-top:7px}}
    `;
    document.head.appendChild(s);
  }

  function subject(){
    try{return state?.subjectProperty||window.PropertyThesisSubjectProperty||null;}catch(_e){return window.PropertyThesisSubjectProperty||null;}
  }

  function visibleAddressField(){
    return qsa('[data-src="f_address"],#f_address').find(el=>el.offsetParent!==null)||qs('[data-src="f_address"]')||qs('#f_address');
  }

  function hostFor(input){
    const field=input?.closest?.('.gw-field,.field');
    const grid=field?.parentElement;
    if(!field||!grid)return null;
    return {field,grid};
  }

  function valueFor(p,key){
    const v=p?.[key];
    return empty(v)?'':v;
  }

  function buildCard(p){
    const card=document.createElement('section');
    card.className='pt-property-facts';
    card.dataset.ptPropertyFacts='1';
    card.innerHTML=`
      <div class="pt-property-facts-head">
        <div><h3>Property Facts</h3><p>Matched property data is prefilled for convenience. Review and edit any item that is incorrect.</p></div>
        <span class="pt-rentcast-badge">Auto-filled from RentCast</span>
      </div>
      <div class="pt-property-facts-grid">
        ${FIELDS.map(([key,label,type])=>`<div class="pt-property-fact"><label>${esc(label)} <small>RentCast</small></label><input data-pt-fact="${esc(key)}" type="${type}" ${type==='number'?'step="any" min="0"':''} value="${esc(valueFor(p,key))}"></div>`).join('')}
      </div>
      <div class="pt-property-facts-foot">Property facts are descriptive data only. Changing them here does not change purchase price, rent, expenses, financing, or valuation assumptions.</div>`;
    return card;
  }

  function updateState(key,value){
    let normalized=value;
    if(['bedrooms','bathrooms','squareFootage','yearBuilt','lotSize'].includes(key))normalized=value===''?null:num(value);
    try{
      if(typeof state!=='undefined'&&state){
        state.subjectProperty={...(state.subjectProperty||{}),[key]:normalized,propertyFactsEditedAt:new Date().toISOString()};
        if(key==='propertyType'||key==='bedrooms'||key==='bathrooms'||key==='squareFootage'){
          const existing=state.marketRentSupport||{};
          const inputs={...(existing.inputs||{})};
          if(key==='propertyType')inputs.propertyType=normalized||'';
          if(key==='bedrooms')inputs.bedrooms=normalized;
          if(key==='bathrooms')inputs.bathrooms=normalized;
          if(key==='squareFootage')inputs.squareFootage=normalized;
          state.marketRentSupport={...existing,inputs};
        }
      }
    }catch(_e){}
    if(window.PropertyThesisSubjectProperty)window.PropertyThesisSubjectProperty={...window.PropertyThesisSubjectProperty,[key]:normalized};
  }

  function bind(card){
    qsa('[data-pt-fact]',card).forEach(input=>{
      input.addEventListener('change',()=>updateState(input.dataset.ptFact,input.value.trim()));
      input.addEventListener('input',()=>{
        input.closest('.pt-property-fact')?.querySelector('small')?.replaceChildren(document.createTextNode('Edited'));
      });
    });
  }

  function render(p=subject()){
    ensureStyles();
    if(!p)return false;
    const input=visibleAddressField();
    const host=hostFor(input);if(!host)return false;
    qsa('[data-pt-property-facts]').forEach(x=>x.remove());
    const card=buildCard(p);
    host.field.insertAdjacentElement('afterend',card);
    bind(card);
    return true;
  }

  function restore(){
    const p=subject();if(!p)return;
    setTimeout(()=>render(p),80);
  }

  document.addEventListener('propertythesis:subject-recognized',e=>{
    const p=e.detail?.property;if(!p)return;
    render(p);
  });
  document.addEventListener('propertythesis:analysis-loaded',restore);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-step="0"],#gwBack,#gwNext,[data-nav="assumptions"]'))setTimeout(restore,120);
  },true);

  window.PropertyThesisPropertyFacts={render,restore,get:subject};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
})();
