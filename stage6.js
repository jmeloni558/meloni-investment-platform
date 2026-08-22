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
    return (cloudAnalyses||[]).filter(a=>a.property_id===pid).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0]||null;
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
    const irr=Number(a.outputs?.irr),npv=Number(a.outputs?.npv),req=Number(a.assumptions?.requiredReturn);
    if(Number.isFinite(npv)&&npv>=0&&Number.isFinite(irr)&&Number.isFinite(req)&&irr>=req)return 'Supportable';
    if(Number.isFinite(npv)&&npv>=0)return 'Mixed / Review';
    return 'Review Needed';
  }
  function goPrimary(id){
    if(window.WorkflowNavigationController?.go){window.WorkflowNavigationController.go(id);return;}
    switchTab(id);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function hydrateSavedAnalysis(a){
    if(!a)return false;
    selectedPropertyId=a.property_id;selectedAnalysisId=a.id;selectedScenarioId=null;
    const p=(cloudProperties||[]).find(x=>x.id===a.property_id);
    if(p)selectedClientId=p.client_id||null;
    const assumptions={...(a.assumptions||{})};
    const embeddedBuy=assumptions.buyState;delete assumptions.buyState;
    state={...defaults,...assumptions};
    if(embeddedBuy&&typeof buydownDefaults!=='undefined')buyState={...buydownDefaults,...embeddedBuy};
    try{if(typeof renderFields==='function')renderFields();}catch(_e){}
    try{result=analyze(state);}catch(e){try{if(typeof setStatus==='function')setStatus('Could not load saved analysis: '+e.message);}catch(_e){}return false;}
    try{window.GuidedAnalysisSetup?.refresh?.();}catch(_e){}
    try{window.GuidedAssumptionGuidance?.apply?.();}catch(_e){}
    try{window.GuidedInitialRepairs?.apply?.();}catch(_e){}
    return true;
  }
  function startAnalysisForProperty(pid){
    const p=(cloudProperties||[]).find(x=>x.id===pid);if(!p)return;
    selectedPropertyId=p.id;selectedClientId=p.client_id||null;selectedAnalysisId=null;selectedScenarioId=null;
    state={...defaults,name:p.name||'',address:p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', '),price:0,land:0,units:1,rent:0,loanYears:30};
    try{renderFields();}catch(_e){}
    goPrimary('assumptions');
    try{window.GuidedAnalysisSetup?.reset?.();}catch(_e){}
    try{if(typeof setStatus==='function')setStatus('Property opened — enter the analysis assumptions');}catch(_e){}
  }

  function inject(){
    cleanupDuplicates();
    const nav=document.querySelector('.nav');
    let btn=document.querySelector('.tab[data-tab="propertyhub"]');
    let sec=document.getElementById('propertyhub');
    if(!btn){
      const cloudTab=[...document.querySelectorAll('.tab')].find(b=>b.dataset.tab==='cloud');
      btn=document.createElement('button');btn.className='tab';btn.dataset.tab='propertyhub';btn.textContent='Existing Properties';nav?.insertBefore(btn,cloudTab||null);
    }
    btn.onclick=async()=>{if(cloudUser&&typeof refreshCloud==='function')await refreshCloud();switchTab('propertyhub');renderHub()};
    if(sec)return;
    sec=document.createElement('section');sec.id='propertyhub';sec.className='section';
    sec.innerHTML=`<div class="grid">
      <div class="span-12 hub-toolbar-shell"><div class="hub-toolbar">
        <div class="field hub-search-field"><label>Search saved properties</label><input id="hubSearch" placeholder="Address, property, client…"></div>
        <label class="hub-check"><input id="hubArchived" type="checkbox"> Show archived</label>
        <div id="hubSummary" class="hub-summary"></div>
      </div></div>
      <div class="card span-12" id="hubSignedOut"><div class="callout"><strong>Sign in to view your property files.</strong><p>Your saved properties load automatically from your private cloud records after sign-in.</p></div></div>
      <div class="span-12" id="hubCards"></div>
    </div>`;
    document.querySelector('.footer')?.insertAdjacentElement('beforebegin',sec);
    if(!document.getElementById('stage6Styles')){
      const st=document.createElement('style');st.id='stage6Styles';st.textContent=`
        .hub-toolbar-shell{padding:0 2px 2px}.hub-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:12px;align-items:end}
        .hub-search-field label{font-size:9px;margin-bottom:4px}.hub-search-field input{min-height:36px}.hub-check{display:flex;align-items:center;gap:7px;padding:9px 0;font-weight:700;color:#475467;white-space:nowrap}.hub-summary{font-size:11px;color:#667085;text-align:right;padding:9px 0;white-space:nowrap}
        .hub-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.hub-card{background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:16px}.hub-card.archived{opacity:.72;background:#fafafa}.hub-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.hub-title h3{font-size:17px;margin:0;color:#172033}.hub-title p{margin:3px 0 0;color:#667085;font-size:11px}.hub-state{font-size:10px;font-weight:800;padding:4px 8px;border-radius:999px;background:#eef5fb;color:#174f83;white-space:nowrap}.hub-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.hub-metric{background:#f8fafc;border:1px solid #e6eaf0;border-radius:8px;padding:9px}.hub-metric span{display:block;color:#667085;font-size:9px}.hub-metric b{display:block;font-size:14px;margin-top:2px}.hub-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px 16px;font-size:11px;color:#596579;margin-bottom:12px}.hub-meta b{color:#344054}.hub-actions{display:flex;gap:7px;flex-wrap:wrap}.hub-delete{margin-left:auto}
        @media(max-width:950px){.hub-grid{grid-template-columns:1fr}.hub-toolbar{grid-template-columns:1fr}.hub-summary{text-align:left;padding-top:0}.hub-check{padding-bottom:0}.hub-metrics{grid-template-columns:repeat(2,1fr)}.hub-delete{margin-left:0}}
      `;document.head.appendChild(st);
    }
    document.getElementById('hubSearch').addEventListener('input',e=>{searchTerm=e.target.value.trim().toLowerCase();renderHub()});
    document.getElementById('hubArchived').addEventListener('change',e=>{showArchived=e.target.checked;renderHub()});
  }

  function renderHub(){
    cleanupDuplicates();inject();
    document.querySelector('#propertyhub .s8-help')?.remove();
    const signed=!!cloudUser;
    const signedOut=document.getElementById('hubSignedOut');if(signedOut)signedOut.style.display=signed?'none':'block';
    const cards=document.getElementById('hubCards');if(!cards)return;
    if(!signed){cards.innerHTML='';const sum=document.getElementById('hubSummary');if(sum)sum.textContent='';return}
    const props=(cloudProperties||[]).filter(p=>{if(!showArchived&&p.archived)return false;const c=clientForProperty(p);const hay=[p.name,p.address,p.city,p.state,p.postal_code,c?.name].filter(Boolean).join(' ').toLowerCase();return !searchTerm||hay.includes(searchTerm)});
    const activeCount=(cloudProperties||[]).filter(p=>!p.archived).length,archivedCount=(cloudProperties||[]).filter(p=>p.archived).length;
    const sum=document.getElementById('hubSummary');if(sum)sum.textContent=`${activeCount} active • ${archivedCount} archived • ${cloudAnalyses.length} analyses`;
    if(!props.length){cards.innerHTML='<div class="card"><div class="note">No properties match the current dashboard filter.</div></div>';return}
    cards.innerHTML='<div class="hub-grid">'+props.map(p=>{
      const a=latestForProperty(p.id),c=clientForProperty(p),o=a?.outputs||{},s=a?.assumptions||{},updated=a?.updated_at||p.updated_at;
      return `<div class="hub-card ${p.archived?'archived':''}"><div class="hub-title"><div><h3>${esc4(p.name||'Untitled Property')}</h3><p>${esc4(p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ')||'No address entered')}</p></div><span class="hub-state">${p.archived?'Archived':statusText(a)}</span></div>
        <div class="hub-metrics"><div class="hub-metric"><span>Purchase Price</span><b>${money(s.price)}</b></div><div class="hub-metric"><span>Value Conclusion</span><b>${valueText(a)}</b></div><div class="hub-metric"><span>IRR</span><b>${pct(o.irr)}</b></div><div class="hub-metric"><span>DSCR</span><b>${mult(o.year1_dscr)}</b></div></div>
        <div class="hub-meta"><div><b>Client:</b> ${esc4(c?.name||'Unassigned')}</div><div><b>Rent:</b> ${money(s.rent)}/mo</div><div><b>Cap Rate:</b> ${pct(o.cap)}</div><div><b>NPV:</b> ${money(o.npv)}</div><div><b>Latest Analysis:</b> ${esc4(a?.name||'None')}</div><div><b>Updated:</b> ${updated?new Date(updated).toLocaleDateString():'—'}</div></div>
        <div class="hub-actions"><button class="btn primary" data-hub-open="${p.id}">Open Property</button>${a?`<button class="btn secondary" data-hub-report="${p.id}">Generate Report</button><button class="btn ghost" data-hub-clone="${p.id}">Clone Analysis</button>`:''}<button class="btn ghost" data-hub-edit="${p.id}">Edit Analysis</button><button class="btn ${p.archived?'secondary':'ghost'}" data-hub-archive="${p.id}">${p.archived?'Restore':'Archive'}</button><button class="btn danger hub-delete" data-hub-delete="${p.id}">Delete Property</button></div></div>`;
    }).join('')+'</div>';
    wireHubActions();
  }

  async function openProperty(pid,target='dashboard'){
    const p=(cloudProperties||[]).find(x=>x.id===pid);if(!p)return;
    const a=latestForProperty(pid);
    if(!a){startAnalysisForProperty(pid);return}
    if(!hydrateSavedAnalysis(a))return;
    try{await loadCloudScenarios(a.id);}catch(_e){}
    goPrimary(target);
    try{if(typeof setStatus==='function')setStatus(target==='report'?'Saved analysis loaded — client report ready':'Saved analysis loaded');}catch(_e){}
    if(target==='report')setTimeout(()=>{try{window.ReportBuilderV1?.renderReport?.();}catch(_e){}try{document.getElementById('s5_refresh')?.click();}catch(_e){}},80);
  }
  async function cloneAnalysis(pid){
    if(!cloudUser)return showAuth();
    const a=latestForProperty(pid);if(!a)return;
    const payload={user_id:cloudUser.id,property_id:pid,name:(a.name||'Base Analysis')+' — Copy',assumptions:a.assumptions||{},outputs:a.outputs||{},report_meta:a.report_meta||{},updated_at:new Date().toISOString()};
    const {data,error}=await cloudClient.from('analyses').insert(payload).select().single();
    if(error){setStatus('Clone failed: '+error.message);return}
    selectedPropertyId=pid;selectedAnalysisId=data.id;await refreshCloud();renderHub();setStatus('Analysis cloned');
  }
  async function archiveProperty(pid){
    if(!cloudUser)return showAuth();const p=(cloudProperties||[]).find(x=>x.id===pid);if(!p)return;const next=!p.archived;
    const {error}=await cloudClient.from('properties').update({archived:next,updated_at:new Date().toISOString()}).eq('id',pid).eq('user_id',cloudUser.id);
    if(error){setStatus('Archive update failed: '+error.message);return}p.archived=next;renderHub();try{renderCloudLists()}catch(_e){}setStatus(next?'Property archived':'Property restored');
  }
  async function deletePropertyPermanently(pid){
    if(!cloudUser){showAuth();return}const p=(cloudProperties||[]).find(x=>x.id===pid);if(!p)return;
    const analyses=(cloudAnalyses||[]).filter(a=>a.property_id===pid),label=p.name||p.address||'this property';
    const extra=analyses.length?` This will also permanently delete ${analyses.length} saved ${analyses.length===1?'analysis':'analyses'} and their saved financing scenarios.`:'';
    if(!window.confirm(`Delete ${label}?${extra} This cannot be undone.`))return;
    try{setStatus('Deleting property…')}catch(_e){}
    const {data,error}=await cloudClient.from('properties').delete().eq('id',pid).eq('user_id',cloudUser.id).select('id');
    if(error){try{setStatus('Property delete failed: '+error.message)}catch(_e){}window.alert('Property could not be deleted: '+error.message);return}
    if(!Array.isArray(data)||!data.some(row=>row.id===pid)){const message='Supabase did not delete the property. Refresh your session and try again.';try{setStatus(message)}catch(_e){}window.alert(message);await refreshCloud();return}
    cloudProperties=(cloudProperties||[]).filter(x=>x.id!==pid);cloudAnalyses=(cloudAnalyses||[]).filter(x=>x.property_id!==pid);
    if(selectedPropertyId===pid){selectedPropertyId=null;selectedAnalysisId=null;selectedScenarioId=null;cloudScenarios=[]}
    renderHub();try{renderCloudLists()}catch(_e){}await refreshCloud();renderHub();try{setStatus('Property permanently deleted')}catch(_e){}
  }
  function wireHubActions(){
    document.querySelectorAll('[data-hub-open]').forEach(b=>b.onclick=()=>openProperty(b.dataset.hubOpen,'dashboard'));
    document.querySelectorAll('[data-hub-report]').forEach(b=>b.onclick=()=>openProperty(b.dataset.hubReport,'report'));
    document.querySelectorAll('[data-hub-edit]').forEach(b=>b.onclick=()=>openProperty(b.dataset.hubEdit,'assumptions'));
    document.querySelectorAll('[data-hub-clone]').forEach(b=>b.onclick=()=>cloneAnalysis(b.dataset.hubClone));
    document.querySelectorAll('[data-hub-archive]').forEach(b=>b.onclick=()=>archiveProperty(b.dataset.hubArchive));
    document.querySelectorAll('[data-hub-delete]').forEach(b=>b.onclick=()=>deletePropertyPermanently(b.dataset.hubDelete));
  }

  const oldRefresh=refreshCloud;refreshCloud=async function(){const out=await oldRefresh();renderHub();return out};
  const oldSet=setCloudUser;setCloudUser=async function(user){const out=await oldSet(user);renderHub();return out};
  const oldSaveProp=savePropertyCloud;savePropertyCloud=async function(){const out=await oldSaveProp();renderHub();return out};
  const oldSaveAnalysis=saveCurrentCloud;saveCurrentCloud=async function(clone=false){const out=await oldSaveAnalysis(clone);renderHub();return out};

  window.Stage6Dashboard={render:renderHub,cleanup:cleanupDuplicates,deleteProperty:deletePropertyPermanently,openProperty};
  const boot=()=>{cleanupDuplicates();inject();renderHub();const badge=document.querySelector('.stage-pill');if(badge)badge.textContent='Stage 6 Workspace'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();