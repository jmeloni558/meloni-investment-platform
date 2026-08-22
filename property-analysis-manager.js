'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyAnalysisManagerVersion||0)>=VERSION)return;
  window.__propertyAnalysisManagerVersion=VERSION;

  let activePropertyId=null;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const money=v=>Number.isFinite(Number(v))?(typeof fmtC==='function'?fmtC(Number(v)):Number(v).toLocaleString('en-US',{style:'currency',currency:'USD'})):'—';
  const pct=v=>Number.isFinite(Number(v))?(typeof fmtP==='function'?fmtP(Number(v)):(Number(v)*100).toFixed(2)+'%'):'—';
  const ratio=v=>Number.isFinite(Number(v))?Number(v).toFixed(2)+'x':'—';
  const date=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString([], {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});};
  const analysesFor=pid=>((typeof cloudAnalyses!=='undefined'?cloudAnalyses:[])||[]).filter(a=>a.property_id===pid).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  const propertyFor=pid=>((typeof cloudProperties!=='undefined'?cloudProperties:[])||[]).find(p=>p.id===pid)||null;
  const clientFor=p=>((typeof cloudClients!=='undefined'?cloudClients:[])||[]).find(c=>c.id===p?.client_id)||null;

  function ensureStyles(){
    if(document.getElementById('propertyAnalysisManagerStyles'))return;
    const s=document.createElement('style');s.id='propertyAnalysisManagerStyles';s.textContent=`
      .pt-manage-btn{margin-left:auto}.hub-card.pt-detail-card{cursor:pointer}.hub-card.pt-detail-card:hover{border-color:#b9cce0;box-shadow:0 8px 24px rgba(16,42,67,.10)}
      #ptAnalysisModal{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.48);display:flex;align-items:flex-start;justify-content:center;padding:40px 18px;overflow:auto}
      #ptAnalysisModal.hidden{display:none}#ptAnalysisModal .pt-am-shell{width:min(1080px,100%);background:#f7f9fc;border-radius:16px;box-shadow:0 28px 80px rgba(15,23,42,.28);overflow:hidden;border:1px solid #d8e1ea}
      .pt-am-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px 24px;background:#fff;border-bottom:1px solid #e4e9ef}.pt-am-eyebrow{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#52708d}.pt-am-head h2{margin:4px 0 3px;font-size:22px;color:#172033}.pt-am-head p{margin:0;color:#667085;font-size:12px}.pt-am-close{border:0;background:#eef2f6;border-radius:999px;width:34px;height:34px;font-size:20px;cursor:pointer;color:#475467}
      .pt-am-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:16px 24px 4px}.pt-am-stat{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:11px 12px}.pt-am-stat span{display:block;font-size:9px;color:#667085;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.pt-am-stat b{display:block;margin-top:3px;font-size:14px;color:#1f2937}
      .pt-am-body{padding:16px 24px 24px}.pt-am-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}.pt-am-toolbar h3{margin:0;font-size:15px;color:#27364a}.pt-am-toolbar small{color:#667085}.pt-am-list{display:grid;gap:10px}.pt-am-row{background:#fff;border:1px solid #dde5ed;border-radius:11px;padding:14px}.pt-am-row.latest{border-color:#9fc0dd;box-shadow:inset 3px 0 0 #2d6d9f}.pt-am-rowtop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.pt-am-row h4{margin:0;font-size:14px;color:#1f2937}.pt-am-rowtime{font-size:10px;color:#667085;white-space:nowrap}.pt-am-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin:11px 0}.pt-am-metric{background:#f8fafc;border:1px solid #edf1f5;border-radius:8px;padding:8px}.pt-am-metric span{display:block;font-size:8px;color:#667085}.pt-am-metric b{display:block;margin-top:2px;font-size:11px;color:#344054}.pt-am-actions{display:flex;gap:7px;flex-wrap:wrap}.pt-am-empty{background:#fff;border:1px dashed #cfd8e3;border-radius:10px;padding:22px;text-align:center;color:#667085}
      @media(max-width:800px){#ptAnalysisModal{padding:16px 8px}.pt-am-summary{grid-template-columns:repeat(2,1fr);padding:14px 14px 2px}.pt-am-body{padding:14px}.pt-am-head{padding:18px 16px}.pt-am-metrics{grid-template-columns:repeat(2,1fr)}.pt-am-rowtop{display:block}.pt-am-rowtime{margin-top:4px}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    ensureStyles();
    let m=document.getElementById('ptAnalysisModal');
    if(m)return m;
    m=document.createElement('div');m.id='ptAnalysisModal';m.className='hidden';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
    m.innerHTML='<div class="pt-am-shell" role="document"><div id="ptAnalysisModalContent"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.classList.contains('hidden'))close();});
    return m;
  }

  function decorateCards(){
    const hub=document.getElementById('propertyhub');if(!hub)return false;
    hub.querySelectorAll('.hub-card').forEach(card=>{
      const source=card.querySelector('[data-hub-open]');const pid=source?.dataset.hubOpen;if(!pid)return;
      card.classList.add('pt-detail-card');card.dataset.ptProperty=pid;
      const actions=card.querySelector('.hub-actions');
      if(actions&&!actions.querySelector('[data-pt-manage]')){
        const b=document.createElement('button');b.type='button';b.className='btn secondary pt-manage-btn';b.dataset.ptManage=pid;b.textContent='Manage Analyses';actions.insertBefore(b,actions.firstChild);
      }
    });
    return true;
  }

  function render(pid){
    const p=propertyFor(pid);if(!p)return false;activePropertyId=pid;
    const arr=analysesFor(pid),c=clientFor(p),latest=arr[0],s=latest?.assumptions||{},o=latest?.outputs||{};
    const rows=arr.map((a,i)=>{const as=a.assumptions||{},ao=a.outputs||{};return `<div class="pt-am-row ${i===0?'latest':''}" data-analysis-row="${esc(a.id)}"><div class="pt-am-rowtop"><div><h4>${esc(a.name||'Saved Analysis')}${i===0?' <span class="badge">Latest</span>':''}</h4></div><div class="pt-am-rowtime">${esc(date(a.updated_at))}</div></div><div class="pt-am-metrics"><div class="pt-am-metric"><span>Purchase Price</span><b>${esc(money(as.price))}</b></div><div class="pt-am-metric"><span>Monthly Rent</span><b>${esc(money(as.rent))}</b></div><div class="pt-am-metric"><span>Cap Rate</span><b>${esc(pct(ao.cap))}</b></div><div class="pt-am-metric"><span>IRR</span><b>${esc(pct(ao.irr))}</b></div><div class="pt-am-metric"><span>NPV</span><b>${esc(money(ao.npv))}</b></div><div class="pt-am-metric"><span>DSCR</span><b>${esc(ratio(ao.year1_dscr))}</b></div></div><div class="pt-am-actions"><button class="btn primary" data-pt-open-analysis="${esc(a.id)}">Open Analysis</button><button class="btn secondary" data-pt-report-analysis="${esc(a.id)}">Generate Report</button><button class="btn ghost" data-pt-rename-analysis="${esc(a.id)}">Rename</button><button class="btn ghost" data-pt-duplicate-analysis="${esc(a.id)}">Duplicate</button><button class="btn danger" data-pt-delete-analysis="${esc(a.id)}">Delete</button></div></div>`;}).join('');
    const content=document.getElementById('ptAnalysisModalContent');
    content.innerHTML=`<div class="pt-am-head"><div><div class="pt-am-eyebrow">Property File</div><h2>${esc(p.name||'Untitled Property')}</h2><p>${esc(p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ')||'No address entered')}${c?.name?` • ${esc(c.name)}`:''}</p></div><button class="pt-am-close" type="button" aria-label="Close">×</button></div><div class="pt-am-summary"><div class="pt-am-stat"><span>Saved Analyses</span><b>${arr.length}</b></div><div class="pt-am-stat"><span>Latest Price</span><b>${esc(money(s.price))}</b></div><div class="pt-am-stat"><span>Latest IRR</span><b>${esc(pct(o.irr))}</b></div><div class="pt-am-stat"><span>Latest Updated</span><b>${esc(latest?date(latest.updated_at):'—')}</b></div></div><div class="pt-am-body"><div class="pt-am-toolbar"><div><h3>Saved Analyses</h3><small>Newest analysis is shown first.</small></div><button class="btn ghost" type="button" data-pt-new-analysis="${esc(pid)}">Start New Analysis</button></div><div class="pt-am-list">${rows||'<div class="pt-am-empty">No saved analyses yet. Start a new analysis for this property.</div>'}</div></div>`;
    content.querySelector('.pt-am-close').onclick=close;
    wireActions(content,pid);
    return true;
  }

  function open(pid){const m=ensureModal();if(!render(pid))return;m.classList.remove('hidden');document.body.style.overflow='hidden';}
  function close(){const m=document.getElementById('ptAnalysisModal');if(m)m.classList.add('hidden');document.body.style.overflow='';activePropertyId=null;}

  async function openAnalysis(id,target='dashboard'){
    if(typeof selectedAnalysisId!=='undefined')selectedAnalysisId=id;
    const item=((typeof cloudAnalyses!=='undefined'?cloudAnalyses:[])||[]).find(a=>a.id===id);if(item&&typeof selectedPropertyId!=='undefined')selectedPropertyId=item.property_id;
    close();
    if(typeof loadSelectedCloud==='function')await loadSelectedCloud();
    if(target==='report'){
      try{if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('report');else if(typeof switchTab==='function')switchTab('report');}catch(_e){}
      setTimeout(()=>{
        try{window.ReportBuilderV1?.render?.();}catch(_e){}
        try{window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}
        try{window.ReportAssumptionsNarrative?.apply?.();}catch(_e){}
        try{window.ReportDetailOrder?.apply?.();}catch(_e){}
        try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){}
        try{window.PropertyThesisReportBranding?.apply?.();}catch(_e){}
      },100);
    }
  }

  async function renameAnalysis(id){
    const a=((typeof cloudAnalyses!=='undefined'?cloudAnalyses:[])||[]).find(x=>x.id===id);if(!a)return;
    const next=window.prompt('Rename analysis:',a.name||'Saved Analysis');if(next==null)return;const name=next.trim();if(!name)return;
    const {error}=await cloudClient.from('analyses').update({name,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',cloudUser.id);
    if(error){setStatus?.('Rename failed: '+error.message);return;}
    await refreshCloud();render(activePropertyId||a.property_id);setStatus?.('Analysis renamed');
  }

  async function duplicateAnalysis(id){
    const a=((typeof cloudAnalyses!=='undefined'?cloudAnalyses:[])||[]).find(x=>x.id===id);if(!a)return;
    const payload={user_id:cloudUser.id,property_id:a.property_id,name:(a.name||'Saved Analysis')+' — Copy',assumptions:a.assumptions||{},outputs:a.outputs||{},report_meta:a.report_meta||{},updated_at:new Date().toISOString()};
    const {data,error}=await cloudClient.from('analyses').insert(payload).select().single();
    if(error){setStatus?.('Duplicate failed: '+error.message);return;}
    await refreshCloud();render(a.property_id);setStatus?.('Analysis duplicated');
    return data;
  }

  async function deleteAnalysis(id){
    const a=((typeof cloudAnalyses!=='undefined'?cloudAnalyses:[])||[]).find(x=>x.id===id);if(!a)return;
    if(!window.confirm(`Delete ${a.name||'this analysis'}? This cannot be undone.`))return;
    const {error}=await cloudClient.from('analyses').delete().eq('id',id).eq('user_id',cloudUser.id);
    if(error){setStatus?.('Delete failed: '+error.message);return;}
    if(typeof selectedAnalysisId!=='undefined'&&selectedAnalysisId===id)selectedAnalysisId=null;
    await refreshCloud();render(a.property_id);setStatus?.('Analysis deleted');
  }

  function startNew(pid){
    close();
    const card=document.querySelector(`.hub-card [data-hub-edit="${CSS.escape(pid)}"]`);
    if(card){card.click();return;}
    const openBtn=document.querySelector(`.hub-card [data-hub-open="${CSS.escape(pid)}"]`);openBtn?.click();
  }

  function wireActions(host,pid){
    host.querySelectorAll('[data-pt-open-analysis]').forEach(b=>b.onclick=()=>openAnalysis(b.dataset.ptOpenAnalysis,'dashboard'));
    host.querySelectorAll('[data-pt-report-analysis]').forEach(b=>b.onclick=()=>openAnalysis(b.dataset.ptReportAnalysis,'report'));
    host.querySelectorAll('[data-pt-rename-analysis]').forEach(b=>b.onclick=()=>renameAnalysis(b.dataset.ptRenameAnalysis));
    host.querySelectorAll('[data-pt-duplicate-analysis]').forEach(b=>b.onclick=()=>duplicateAnalysis(b.dataset.ptDuplicateAnalysis));
    host.querySelectorAll('[data-pt-delete-analysis]').forEach(b=>b.onclick=()=>deleteAnalysis(b.dataset.ptDeleteAnalysis));
    host.querySelector('[data-pt-new-analysis]')?.addEventListener('click',()=>startNew(pid));
  }

  function clickHandler(e){
    const manage=e.target?.closest?.('[data-pt-manage]');if(manage){e.preventDefault();e.stopPropagation();open(manage.dataset.ptManage);return;}
    const card=e.target?.closest?.('.hub-card.pt-detail-card');if(!card)return;
    if(e.target.closest('button,a,input,textarea,select,label'))return;
    const pid=card.dataset.ptProperty;if(pid)open(pid);
  }

  function scheduleDecorate(){setTimeout(decorateCards,120);setTimeout(decorateCards,400);}
  function start(){
    ensureModal();scheduleDecorate();
    document.addEventListener('click',clickHandler,false);
    document.addEventListener('click',e=>{if(e.target?.closest?.('.tab[data-tab="propertyhub"]'))scheduleDecorate();},false);
    document.addEventListener('input',e=>{if(e.target?.closest?.('#propertyhub'))scheduleDecorate();},false);
    document.addEventListener('change',e=>{if(e.target?.closest?.('#propertyhub'))scheduleDecorate();},false);
  }

  window.PropertyAnalysisManager={open,close,render,decorateCards,openAnalysis};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
