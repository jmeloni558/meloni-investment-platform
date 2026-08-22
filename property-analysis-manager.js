'use strict';
(()=>{
  const VERSION=2;
  if((window.__propertyAnalysisManagerVersion||0)>=VERSION)return;
  window.__propertyAnalysisManagerVersion=VERSION;

  let activePropertyId=null;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const analyses=()=>typeof cloudAnalyses!=='undefined'?(cloudAnalyses||[]):[];
  const properties=()=>typeof cloudProperties!=='undefined'?(cloudProperties||[]):[];
  const money=v=>Number.isFinite(Number(v))?(typeof fmtC==='function'?fmtC(Number(v)):Number(v).toLocaleString('en-US',{style:'currency',currency:'USD'})):'—';
  const pct=v=>Number.isFinite(Number(v))?(typeof fmtP==='function'?fmtP(Number(v)):(Number(v)*100).toFixed(2)+'%'):'—';
  const ratio=v=>Number.isFinite(Number(v))?Number(v).toFixed(2)+'x':'—';
  const when=v=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?'—':d.toLocaleString([], {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});};
  const propertyFor=id=>properties().find(p=>p.id===id)||null;
  const analysesFor=id=>analyses().filter(a=>a.property_id===id).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));

  function status(msg){if(typeof setStatus==='function')setStatus(msg);}
  function ensureStyles(){
    if(document.getElementById('ptAnalysisManagerStyles'))return;
    const s=document.createElement('style');s.id='ptAnalysisManagerStyles';s.textContent=`
      #ptAnalysisModal{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.5);display:flex;align-items:flex-start;justify-content:center;padding:36px 16px;overflow:auto}
      #ptAnalysisModal.hidden{display:none}#ptAnalysisModal .pt-shell{width:min(1050px,100%);background:#f7f9fc;border:1px solid #d7e0e8;border-radius:16px;box-shadow:0 28px 80px rgba(15,23,42,.28);overflow:hidden}
      .pt-head{display:flex;justify-content:space-between;gap:16px;padding:20px 22px;background:#fff;border-bottom:1px solid #e4e9ef}.pt-head h2{margin:2px 0 3px;font-size:21px}.pt-head p{margin:0;color:#667085;font-size:12px}.pt-eyebrow{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#52708d}.pt-close{width:34px;height:34px;border:0;border-radius:999px;background:#eef2f6;font-size:20px;cursor:pointer}
      .pt-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:15px 22px 4px}.pt-stat{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 11px}.pt-stat span{display:block;font-size:9px;color:#667085;text-transform:uppercase;font-weight:700}.pt-stat b{display:block;margin-top:3px;font-size:14px}
      .pt-body{padding:15px 22px 22px}.pt-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.pt-toolbar h3{margin:0;font-size:15px}.pt-list{display:grid;gap:10px}.pt-row{background:#fff;border:1px solid #dde5ed;border-radius:11px;padding:13px}.pt-row.latest{border-color:#9fc0dd;box-shadow:inset 3px 0 0 #2d6d9f}.pt-rowtop{display:flex;justify-content:space-between;gap:10px}.pt-row h4{margin:0;font-size:14px}.pt-time{font-size:10px;color:#667085}.pt-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin:10px 0}.pt-metric{background:#f8fafc;border:1px solid #edf1f5;border-radius:8px;padding:8px}.pt-metric span{display:block;font-size:8px;color:#667085}.pt-metric b{display:block;margin-top:2px;font-size:11px}.pt-actions{display:flex;gap:7px;flex-wrap:wrap}.pt-empty{padding:22px;text-align:center;background:#fff;border:1px dashed #cfd8e3;border-radius:10px;color:#667085}
      #propertyhub .pt-manage-analysis{order:-1}
      @media(max-width:800px){#ptAnalysisModal{padding:12px 6px}.pt-summary{grid-template-columns:repeat(2,1fr);padding:12px 12px 4px}.pt-body{padding:12px}.pt-head{padding:16px 14px}.pt-metrics{grid-template-columns:repeat(2,1fr)}.pt-rowtop{display:block}.pt-time{margin-top:4px}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    ensureStyles();
    let m=document.getElementById('ptAnalysisModal');
    if(m)return m;
    m=document.createElement('div');m.id='ptAnalysisModal';m.className='hidden';m.innerHTML='<div class="pt-shell"><div id="ptAnalysisContent"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.classList.contains('hidden'))close();});
    return m;
  }

  function decorateCards(){
    const hub=document.getElementById('propertyhub');if(!hub)return false;
    const cards=[...hub.querySelectorAll('.hub-card')];
    let added=0;
    for(const card of cards){
      const openBtn=card.querySelector('[data-hub-open]');
      const pid=openBtn&&openBtn.dataset?openBtn.dataset.hubOpen:null;
      const actions=card.querySelector('.hub-actions');
      if(!pid||!actions)continue;
      card.dataset.ptProperty=pid;
      if(!actions.querySelector('[data-pt-manage]')){
        const b=document.createElement('button');b.type='button';b.className='btn secondary pt-manage-analysis';b.dataset.ptManage=pid;b.textContent='Manage Analyses';
        actions.insertBefore(b,actions.firstChild);added++;
      }
    }
    return cards.length>0||added>0;
  }

  function render(pid){
    const p=propertyFor(pid);if(!p)return false;
    activePropertyId=pid;
    const arr=analysesFor(pid),latest=arr[0],s=latest?.assumptions||{},o=latest?.outputs||{};
    const rows=arr.map((a,i)=>{const x=a.assumptions||{},y=a.outputs||{};return `<div class="pt-row ${i===0?'latest':''}"><div class="pt-rowtop"><h4>${esc(a.name||'Saved Analysis')}${i===0?' <span class="badge">Latest</span>':''}</h4><div class="pt-time">${esc(when(a.updated_at))}</div></div><div class="pt-metrics"><div class="pt-metric"><span>Purchase Price</span><b>${esc(money(x.price))}</b></div><div class="pt-metric"><span>Monthly Rent</span><b>${esc(money(x.rent))}</b></div><div class="pt-metric"><span>Cap Rate</span><b>${esc(pct(y.cap))}</b></div><div class="pt-metric"><span>IRR</span><b>${esc(pct(y.irr))}</b></div><div class="pt-metric"><span>NPV</span><b>${esc(money(y.npv))}</b></div><div class="pt-metric"><span>DSCR</span><b>${esc(ratio(y.year1_dscr))}</b></div></div><div class="pt-actions"><button class="btn primary" data-pt-open="${esc(a.id)}">Open Analysis</button><button class="btn secondary" data-pt-report="${esc(a.id)}">Generate Report</button><button class="btn ghost" data-pt-rename="${esc(a.id)}">Rename</button><button class="btn ghost" data-pt-duplicate="${esc(a.id)}">Duplicate</button><button class="btn danger" data-pt-delete="${esc(a.id)}">Delete</button></div></div>`;}).join('');
    const host=document.getElementById('ptAnalysisContent');
    host.innerHTML=`<div class="pt-head"><div><div class="pt-eyebrow">Property File</div><h2>${esc(p.name||'Untitled Property')}</h2><p>${esc(p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ')||'No address entered')}</p></div><button class="pt-close" type="button">×</button></div><div class="pt-summary"><div class="pt-stat"><span>Saved Analyses</span><b>${arr.length}</b></div><div class="pt-stat"><span>Latest Price</span><b>${esc(money(s.price))}</b></div><div class="pt-stat"><span>Latest IRR</span><b>${esc(pct(o.irr))}</b></div><div class="pt-stat"><span>Latest Updated</span><b>${esc(latest?when(latest.updated_at):'—')}</b></div></div><div class="pt-body"><div class="pt-toolbar"><h3>Saved Analyses</h3><button class="btn ghost" data-pt-new="${esc(pid)}">Start New Analysis</button></div><div class="pt-list">${rows||'<div class="pt-empty">No saved analyses yet.</div>'}</div></div>`;
    host.querySelector('.pt-close').onclick=close;
    host.querySelectorAll('[data-pt-open]').forEach(b=>b.onclick=()=>openAnalysis(b.dataset.ptOpen,'dashboard'));
    host.querySelectorAll('[data-pt-report]').forEach(b=>b.onclick=()=>openAnalysis(b.dataset.ptReport,'report'));
    host.querySelectorAll('[data-pt-rename]').forEach(b=>b.onclick=()=>renameAnalysis(b.dataset.ptRename));
    host.querySelectorAll('[data-pt-duplicate]').forEach(b=>b.onclick=()=>duplicateAnalysis(b.dataset.ptDuplicate));
    host.querySelectorAll('[data-pt-delete]').forEach(b=>b.onclick=()=>deleteAnalysis(b.dataset.ptDelete));
    host.querySelector('[data-pt-new]').onclick=()=>startNew(pid);
    return true;
  }

  function open(pid){const m=ensureModal();if(!render(pid))return;m.classList.remove('hidden');document.body.style.overflow='hidden';}
  function close(){const m=document.getElementById('ptAnalysisModal');if(m)m.classList.add('hidden');document.body.style.overflow='';activePropertyId=null;}

  function hydrate(a){
    if(!a)return false;
    selectedPropertyId=a.property_id;selectedAnalysisId=a.id;selectedScenarioId=null;
    const p=propertyFor(a.property_id);if(p)selectedClientId=p.client_id||null;
    const x={...(a.assumptions||{})},buy=x.buyState;delete x.buyState;
    state={...defaults,...x};if(buy&&typeof buydownDefaults!=='undefined')buyState={...buydownDefaults,...buy};
    if(typeof renderFields==='function')renderFields();result=analyze(state);return true;
  }

  async function openAnalysis(id,target){
    const a=analyses().find(x=>x.id===id);if(!a||!hydrate(a))return;
    close();
    try{if(typeof loadCloudScenarios==='function')await loadCloudScenarios(id);}catch(_e){}
    if(window.WorkflowNavigationController&&typeof window.WorkflowNavigationController.go==='function')window.WorkflowNavigationController.go(target);
    else if(typeof switchTab==='function')switchTab(target);
    if(target==='report')setTimeout(()=>{
      try{window.ReportBuilderV1?.render?.();}catch(_e){}
      try{window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}
      try{window.ReportAssumptionsNarrative?.apply?.();}catch(_e){}
      try{window.ReportDetailOrder?.apply?.();}catch(_e){}
      try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){}
      try{window.PropertyThesisReportBranding?.apply?.();}catch(_e){}
    },100);
  }

  async function renameAnalysis(id){const a=analyses().find(x=>x.id===id);if(!a)return;const n=prompt('Rename analysis:',a.name||'Saved Analysis');if(n==null||!n.trim())return;const {error}=await cloudClient.from('analyses').update({name:n.trim(),updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',cloudUser.id);if(error){status('Rename failed: '+error.message);return;}await refreshCloud();render(a.property_id);status('Analysis renamed');}
  async function duplicateAnalysis(id){const a=analyses().find(x=>x.id===id);if(!a)return;const payload={user_id:cloudUser.id,property_id:a.property_id,name:(a.name||'Saved Analysis')+' — Copy',assumptions:{...(a.assumptions||{})},outputs:{...(a.outputs||{})},report_meta:{...(a.report_meta||{})},updated_at:new Date().toISOString()};const {error}=await cloudClient.from('analyses').insert(payload);if(error){status('Duplicate failed: '+error.message);return;}await refreshCloud();render(a.property_id);status('Analysis duplicated');}
  async function deleteAnalysis(id){const a=analyses().find(x=>x.id===id);if(!a||!confirm('Delete '+(a.name||'this analysis')+'? This cannot be undone.'))return;const {error}=await cloudClient.from('analyses').delete().eq('id',id).eq('user_id',cloudUser.id);if(error){status('Delete failed: '+error.message);return;}await refreshCloud();render(a.property_id);status('Analysis deleted');}
  function startNew(pid){close();const b=document.querySelector('[data-hub-edit="'+pid+'"]')||document.querySelector('[data-hub-open="'+pid+'"]');if(b)b.click();}

  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pt-manage]');if(!b)return;e.preventDefault();e.stopPropagation();open(b.dataset.ptManage);},false);
  window.PropertyAnalysisManager={open,close,render,decorateCards,openAnalysis};
  ensureModal();
})();