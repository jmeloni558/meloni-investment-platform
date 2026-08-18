'use strict';
(() => {
  if(window.__stage6Initialized){
    if(window.Stage6Dashboard?.cleanup)window.Stage6Dashboard.cleanup();
    if(window.Stage6Dashboard?.render)window.Stage6Dashboard.render();
    return;
  }
  window.__stage6Initialized=true;

  const money=v=>Number.isFinite(Number(v))?fmtC(Number(v)):'N/A';
  const pct=v=>Number.isFinite(Number(v))?fmtP(Number(v)):'N/A';
  const mult=v=>Number.isFinite(Number(v))?Number(v).toFixed(2)+'x':'N/A';
  let showArchived=false, searchTerm='';

  function cleanupDuplicates(){
    const tabs=[...document.querySelectorAll('.tab[data-tab="propertyhub"]')];
    tabs.slice(1).forEach(el=>el.remove());
    const secs=[...document.querySelectorAll('section#propertyhub')];
    secs.slice(1).forEach(el=>el.remove());
  }

  function latestForProperty(pid){
    return (cloudAnalyses||[])
      .filter(a=>a.property_id===pid)
      .sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0]||null;
  }
  function clientForProperty(p){return (cloudClients||[]).find(c=>c.id===p.client_id)||null}
  function valueText(a){
    const s=a?.report_meta?.stage5||{};
    const lo=Number(s.valueLow),hi=Number(s.valueHigh);
    if(Number.isFinite(lo)&&Number.isFinite(hi)&&hi>=lo&&lo>0)return `${money(lo)} – ${money(hi)}`;
    const price=Number(a?.assumptions?.price);
    return Number.isFinite(price)&&price>0?money(price):'Not concluded';
  }
  function statusText(a){
    if(!a)return 'No analysis';
    const irr=Number(a.outputs?.irr), npv=Number(a.outputs?.npv), req=Number(a.assumptions?.requiredReturn);
    if(Number.isFinite(npv)&&npv>=0&&Number.isFinite(irr)&&Number.isFinite(req)&&irr>=req)return 'Supportable';
    if(Number.isFinite(npv)&&npv>=0)return 'Mixed / Review';
    return 'Review Needed';
  }
  function inject(){
    cleanupDuplicates();
    const nav=document.querySelector('.nav');
    let btn=document.querySelector('.tab[data-tab="propertyhub"]');
    let sec=document.getElementById('propertyhub');

    if(!btn){
      const cloudTab=[...document.querySelectorAll('.tab')].find(b=>b.dataset.tab==='cloud');
      btn=document.createElement('button');
      btn.className='tab';btn.dataset.tab='propertyhub';btn.textContent='Property Dashboard';
      nav?.insertBefore(btn,cloudTab||null);
    }
    btn.onclick=()=>{switchTab('propertyhub');renderHub()};

    if(sec)return;
    sec=document.createElement('section');
    sec.id='propertyhub'; sec.className='section';
    sec.innerHTML=`<div class="grid">
      <div class="card span-12">
        <div class="sectionhead">
          <div><h2>Property Dashboard</h2><p>Open, update, report, clone and archive investment-property files from one workspace.</p></div>
          <div class="actions">
            <button class="btn primary" id="hubNewAnalysis">New Analysis</button>
            <button class="btn secondary" id="hubRefresh">Refresh Cloud Data</button>
          </div>
        </div>
        <div class="hub-toolbar">
          <div class="field"><label>Search properties or clients</label><input id="hubSearch" placeholder="Address, property, client…"></div>
          <label class="hub-check"><input id="hubArchived" type="checkbox"> Show archived</label>
          <div id="hubSummary" class="hub-summary"></div>
        </div>
      </div>
      <div class="card span-12" id="hubSignedOut"><div class="callout"><strong>Sign in to view your property files.</strong><p>The dashboard uses your private cloud records and remains empty when you are signed out.</p></div></div>
      <div class="span-12" id="hubCards"></div>
    </div>`;
    document.querySelector('.footer')?.insertAdjacentElement('beforebegin',sec);

    if(!document.getElementById('stage6Styles')){
      const st=document.createElement('style');st.id='stage6Styles';
      st.textContent=`
        .hub-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:14px;align-items:end}
        .hub-check{display:flex;align-items:center;gap:7px;padding:9px 0;font-weight:700;color:#475467}
        .hub-summary{font-size:12px;color:#667085;text-align:right;padding:9px 0}
        .hub-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .hub-card{background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:16px}
        .hub-card.archived{opacity:.72;background:#fafafa}
        .hub-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
        .hub-title h3{font-size:17px;margin:0;color:#172033}.hub-title p{margin:3px 0 0;color:#667085;font-size:11px}
        .hub-state{font-size:10px;font-weight:800;padding:4px 8px;border-radius:999px;background:#eef5fb;color:#174f83;white-space:nowrap}
        .hub-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}
        .hub-metric{background:#f8fafc;border:1px solid #e6eaf0;border-radius:8px;padding:9px}
        .hub-metric span{display:block;color:#667085;font-size:9px}.hub-metric b{display:block;font-size:14px;margin-top:2px}
        .hub-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px 16px;font-size:11px;color:#596579;margin-bottom:12px}
        .hub-meta b{color:#344054}.hub-actions{display:flex;gap:7px;flex-wrap:wrap}
        @media(max-width:950px){.hub-grid{grid-template-columns:1fr}.hub-toolbar{grid-template-columns:1fr}.hub-summary{text-align:left}.hub-metrics{grid-template-columns:repeat(2,1fr)}}
      `;
      document.head.appendChild(st);
    }

    document.getElementById('hubSearch').addEventListener('input',e=>{searchTerm=e.target.value.trim().toLowerCase();renderHub()});
    document.getElementById('hubArchived').addEventListener('change',e=>{showArchived=e.target.checked;renderHub()});
    document.getElementById('hubRefresh').onclick=async()=>{if(!cloudUser){showAuth();return}await refreshCloud();renderHub()};
    document.getElementById('hubNewAnalysis').onclick=()=>{selectedClientId=selectedPropertyId=selectedAnalysisId=null;state={...defaults};renderFields();render();switchTab('assumptions');setStatus('New analysis started')};
  }

  function renderHub(){
    cleanupDuplicates();
    inject();
    const signed=!!cloudUser;
    const signedOut=document.getElementById('hubSignedOut');if(signedOut)signedOut.style.display=signed?'none':'block';
    const cards=document.getElementById('hubCards');
    if(!cards)return;
    if(!signed){cards.innerHTML='';const sum=document.getElementById('hubSummary');if(sum)sum.textContent='';return}
    const props=(cloudProperties||[]).filter(p=>{
      if(!showArchived&&p.archived)return false;
      const c=clientForProperty(p);
      const hay=[p.name,p.address,p.city,p.state,p.postal_code,c?.name].filter(Boolean).join(' ').toLowerCase();
      return !searchTerm||hay.includes(searchTerm);
    });
    const activeCount=(cloudProperties||[]).filter(p=>!p.archived).length;
    const archivedCount=(cloudProperties||[]).filter(p=>p.archived).length;
    const sum=document.getElementById('hubSummary');if(sum)sum.textContent=`${activeCount} active • ${archivedCount} archived • ${cloudAnalyses.length} analyses`;
    if(!props.length){cards.innerHTML='<div class="card"><div class="note">No properties match the current dashboard filter.</div></div>';return}
    cards.innerHTML='<div class="hub-grid">'+props.map(p=>{
      const a=latestForProperty(p.id),c=clientForProperty(p),o=a?.outputs||{},s=a?.assumptions||{};
      const updated=a?.updated_at||p.updated_at;
      return `<div class="hub-card ${p.archived?'archived':''}">
        <div class="hub-title">
          <div><h3>${esc4(p.name||'Untitled Property')}</h3><p>${esc4(p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ')||'No address entered')}</p></div>
          <span class="hub-state">${p.archived?'Archived':statusText(a)}</span>
        </div>
        <div class="hub-metrics">
          <div class="hub-metric"><span>Purchase Price</span><b>${money(s.price)}</b></div>
          <div class="hub-metric"><span>Value Conclusion</span><b>${valueText(a)}</b></div>
          <div class="hub-metric"><span>IRR</span><b>${pct(o.irr)}</b></div>
          <div class="hub-metric"><span>DSCR</span><b>${mult(o.year1_dscr)}</b></div>
        </div>
        <div class="hub-meta">
          <div><b>Client:</b> ${esc4(c?.name||'Unassigned')}</div>
          <div><b>Rent:</b> ${money(s.rent)}/mo</div>
          <div><b>Cap Rate:</b> ${pct(o.cap)}</div>
          <div><b>NPV:</b> ${money(o.npv)}</div>
          <div><b>Latest Analysis:</b> ${esc4(a?.name||'None')}</div>
          <div><b>Updated:</b> ${updated?new Date(updated).toLocaleDateString():'—'}</div>
        </div>
        <div class="hub-actions">
          <button class="btn primary" data-hub-open="${p.id}">${a?'Open Analysis':'Open Property'}</button>
          ${a?`<button class="btn secondary" data-hub-report="${p.id}">Generate Report</button>
          <button class="btn ghost" data-hub-clone="${p.id}">Clone Analysis</button>`:''}
          <button class="btn ghost" data-hub-update="${p.id}">Update Property</button>
          <button class="btn ${p.archived?'secondary':'danger'}" data-hub-archive="${p.id}">${p.archived?'Restore':'Archive'}</button>
        </div>
      </div>`;
    }).join('')+'</div>';
    wireHubActions();
  }

  async function selectPropertyAndLatest(pid){
    const p=(cloudProperties||[]).find(x=>x.id===pid); if(!p)return null;
    selectProperty(pid);
    const a=latestForProperty(pid);
    if(a){await selectAnalysis(a.id)}
    return a;
  }
  async function openAnalysis(pid,tab='dashboard'){
    const a=await selectPropertyAndLatest(pid);
    if(!a){switchTab('cloud');setStatus('Property opened — create or save an analysis for this property');return}
    await loadSelectedCloud();
    if(tab!=='dashboard')switchTab(tab);
  }
  async function cloneAnalysis(pid){
    const a=await selectPropertyAndLatest(pid);
    if(!a)return;
    await loadSelectedCloud();
    await saveCurrentCloud(true);
    renderHub();
  }
  async function updateProperty(pid){
    selectProperty(pid);switchTab('cloud');
    setTimeout(()=>document.getElementById('p_name')?.focus(),100);
  }
  async function archiveProperty(pid){
    if(!cloudUser)return showAuth();
    const p=(cloudProperties||[]).find(x=>x.id===pid);if(!p)return;
    const next=!p.archived;
    const {error}=await cloudClient.from('properties').update({archived:next,updated_at:new Date().toISOString()}).eq('id',pid);
    if(error){setStatus('Archive update failed: '+error.message);return}
    p.archived=next;renderHub();renderCloudLists();setStatus(next?'Property archived':'Property restored');
  }
  function wireHubActions(){
    document.querySelectorAll('[data-hub-open]').forEach(b=>b.onclick=()=>openAnalysis(b.dataset.hubOpen));
    document.querySelectorAll('[data-hub-report]').forEach(b=>b.onclick=async()=>{await openAnalysis(b.dataset.hubReport,'report');setTimeout(()=>document.getElementById('s5_refresh')?.click(),80)});
    document.querySelectorAll('[data-hub-clone]').forEach(b=>b.onclick=()=>cloneAnalysis(b.dataset.hubClone));
    document.querySelectorAll('[data-hub-update]').forEach(b=>b.onclick=()=>updateProperty(b.dataset.hubUpdate));
    document.querySelectorAll('[data-hub-archive]').forEach(b=>b.onclick=()=>archiveProperty(b.dataset.hubArchive));
  }

  const oldRefresh=refreshCloud;
  refreshCloud=async function(){const out=await oldRefresh();renderHub();return out};
  const oldSet=setCloudUser;
  setCloudUser=async function(user){const out=await oldSet(user);renderHub();return out};
  const oldSaveProp=savePropertyCloud;
  savePropertyCloud=async function(){const out=await oldSaveProp();renderHub();return out};
  const oldSaveAnalysis=saveCurrentCloud;
  saveCurrentCloud=async function(clone=false){const out=await oldSaveAnalysis(clone);renderHub();return out};

  window.Stage6Dashboard={render:renderHub,cleanup:cleanupDuplicates};
  const boot=()=>{cleanupDuplicates();inject();renderHub();const badge=document.querySelector('.stage-pill');if(badge)badge.textContent='Stage 6 Workspace'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
