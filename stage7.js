'use strict';
(() => {
  if(window.__stage7Initialized)return;
  window.__stage7Initialized=true;
  let currentPropertyId=null;
  const money=v=>Number.isFinite(Number(v))?fmtC(Number(v)):'N/A';
  const pct=v=>Number.isFinite(Number(v))?fmtP(Number(v)):'N/A';
  const mult=v=>Number.isFinite(Number(v))?Number(v).toFixed(2)+'x':'N/A';
  const safeDate=v=>v?new Date(v).toLocaleString():'—';
  const propertyById=id=>(cloudProperties||[]).find(x=>x.id===id)||null;
  const clientById=id=>(cloudClients||[]).find(x=>x.id===id)||null;
  const analysesFor=id=>(cloudAnalyses||[]).filter(x=>x.property_id===id).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  const latestFor=id=>analysesFor(id)[0]||null;
  function reportPrefs(a){return a?.report_meta?.stage5||{}}
  function fullResult(a){try{return a?analyze({...defaults,...(a.assumptions||{})}):null}catch(_e){return null}}
  function concludedValue(a){const r=reportPrefs(a),lo=Number(r.valueLow),hi=Number(r.valueHigh);if(lo>0&&hi>=lo)return `${money(lo)} – ${money(hi)}`;const z=fullResult(a);if(z)return `${money(Math.min(z.capValue,z.grmValue))} – ${money(Math.max(z.capValue,z.grmValue))}`;return 'Not concluded'}
  function injectSection(){
    if(document.getElementById('propertyfile'))return;
    const sec=document.createElement('section');sec.id='propertyfile';sec.className='section';
    sec.innerHTML='<div class="grid" id="propertyFileBody"></div>';
    document.querySelector('.footer')?.insertAdjacentElement('beforebegin',sec);
    if(!document.getElementById('stage7Styles')){const st=document.createElement('style');st.id='stage7Styles';st.textContent=`
      .pf-hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.pf-hero h2{font-size:22px;margin:0}.pf-hero p{margin:4px 0 0;color:#667085}.pf-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}.pf-kpi{background:#f8fafc;border:1px solid #e6eaf0;border-radius:9px;padding:10px}.pf-kpi span{display:block;font-size:9px;color:#667085;text-transform:uppercase;letter-spacing:.04em}.pf-kpi b{display:block;font-size:15px;margin-top:3px}.pf-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pf-line{display:flex;justify-content:space-between;gap:14px;padding:7px 0;border-bottom:1px solid #eef1f4;font-size:12px}.pf-line:last-child{border-bottom:0}.pf-line span{color:#667085}.pf-history{display:grid;gap:8px}.pf-history-row{display:grid;grid-template-columns:minmax(170px,1.4fr) repeat(5,minmax(70px,.7fr)) auto;gap:8px;align-items:center;padding:10px;border:1px solid #e6eaf0;border-radius:9px;background:#fff;font-size:11px}.pf-history-row small{color:#667085}.pf-scenario-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.pf-scenario{border:1px solid #e6eaf0;border-radius:9px;padding:11px;background:#f8fafc}.pf-scenario h4{margin:0 0 7px}.pf-report-note{white-space:pre-wrap;color:#475467;font-size:12px;line-height:1.55}.pf-breadcrumb{display:flex;gap:8px;align-items:center;margin-bottom:10px}.pf-breadcrumb button{border:0;background:none;color:#175c92;font-weight:700;cursor:pointer;padding:0}.pf-status{font-size:10px;font-weight:800;padding:5px 9px;border-radius:999px;background:#eef5fb;color:#174f83}.pf-empty{padding:24px;text-align:center;color:#667085}@media(max-width:1050px){.pf-kpis{grid-template-columns:repeat(3,1fr)}.pf-history-row{grid-template-columns:1fr 1fr}.pf-scenario-grid,.pf-two{grid-template-columns:1fr}}@media(max-width:650px){.pf-kpis{grid-template-columns:repeat(2,1fr)}.pf-hero{display:block}.pf-hero .actions{margin-top:10px}}
    `;document.head.appendChild(st)}
  }
  async function openPropertyFile(pid){
    if(!cloudUser){showAuth();return}
    const p=propertyById(pid);if(!p)return;
    currentPropertyId=pid;selectProperty(pid);
    const a=latestFor(pid);if(a){await selectAnalysis(a.id);await loadCloudScenarios(a.id)}else{cloudScenarios=[]}
    renderPropertyFile();switchTab('propertyfile');window.scrollTo({top:0,behavior:'smooth'});
  }
  function statusFor(a){if(!a)return 'No Analysis';const o=a.outputs||{},req=Number(a.assumptions?.requiredReturn),irr=Number(o.irr),npv=Number(o.npv);if(npv>=0&&Number.isFinite(irr)&&Number.isFinite(req)&&irr>=req)return 'Supportable';if(npv>=0)return 'Mixed / Review';return 'Review Needed'}
  function renderPropertyFile(){
    injectSection();const body=document.getElementById('propertyFileBody');const p=propertyById(currentPropertyId);
    if(!p){body.innerHTML='<div class="card span-12 pf-empty">Select a property from Existing Properties.</div>';return}
    const c=clientById(p.client_id),hist=analysesFor(p.id),a=hist[0]||null,o=a?.outputs||{},s=a?.assumptions||{},r=reportPrefs(a),z=fullResult(a),coc=z&&(-z.initial)?z.years[0].atcf/(-z.initial):NaN;
    const reportUpdated=a?.report_meta?.report_updated_at||a?.updated_at;
    body.innerHTML=`
      <div class="card span-12">
        <div class="pf-breadcrumb"><button id="pfBack">Existing Properties</button><span>›</span><span>${esc4(p.name||'Property File')}</span></div>
        <div class="pf-hero"><div><h2>${esc4(p.name||'Untitled Property')}</h2><p>${esc4(p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ')||'No address entered')}</p></div><div class="actions"><span class="pf-status">${p.archived?'Archived':statusFor(a)}</span><button class="btn secondary" id="pfReport">Generate Report</button><button class="btn primary" id="pfNewAnalysis">New Analysis</button></div></div>
      </div>
      <div class="card span-12"><div class="sectionhead"><div><h2>Current Investment Snapshot</h2><p>${a?'Latest saved analysis: '+esc4(a.name):'No analysis has been saved for this property yet.'}</p></div><span class="badge">${a?safeDate(a.updated_at):'No analysis'}</span></div>
        <div class="pf-kpis"><div class="pf-kpi"><span>Purchase Price</span><b>${money(s.price)}</b></div><div class="pf-kpi"><span>Monthly Rent</span><b>${money(s.rent)}</b></div><div class="pf-kpi"><span>NOI</span><b>${money(o.year1_noi)}</b></div><div class="pf-kpi"><span>Cap Rate</span><b>${pct(o.cap)}</b></div><div class="pf-kpi"><span>IRR</span><b>${pct(o.irr)}</b></div><div class="pf-kpi"><span>DSCR</span><b>${mult(o.year1_dscr)}</b></div><div class="pf-kpi"><span>Cash-on-Cash</span><b>${pct(coc)}</b></div><div class="pf-kpi"><span>NPV</span><b>${money(o.npv)}</b></div><div class="pf-kpi"><span>Value Conclusion</span><b>${concludedValue(a)}</b></div><div class="pf-kpi"><span>Direct Cap Value</span><b>${money(z?.capValue)}</b></div><div class="pf-kpi"><span>GRM Value</span><b>${money(z?.grmValue)}</b></div><div class="pf-kpi"><span>Hold Period</span><b>${s.hold||'—'} yrs</b></div></div>
      </div>
      <div class="span-12 pf-two"><div class="card"><h2>Property & Client</h2><div class="pf-line"><span>Client</span><b>${esc4(c?.name||'Unassigned')}</b></div><div class="pf-line"><span>Email</span><b>${esc4(c?.email||'—')}</b></div><div class="pf-line"><span>Phone</span><b>${esc4(c?.phone||'—')}</b></div><div class="pf-line"><span>Property status</span><b>${p.archived?'Archived':'Active'}</b></div><div class="pf-line"><span>Property updated</span><b>${safeDate(p.updated_at)}</b></div><div class="pf-line"><span>Notes</span><b>${esc4(p.notes||'—')}</b></div><div class="actions" style="margin-top:12px"><button class="btn ghost" id="pfEditProperty">Edit Property Record</button><button class="btn ${p.archived?'secondary':'ghost'}" id="pfArchive">${p.archived?'Restore Property':'Archive Property'}</button><button class="btn danger" id="pfDelete">Delete Property</button></div></div>
      <div class="card"><h2>Report Status</h2><div class="pf-line"><span>Prepared for</span><b>${esc4(r.clientName||c?.name||'Not entered')}</b></div><div class="pf-line"><span>Concluded range</span><b>${concludedValue(a)}</b></div><div class="pf-line"><span>Market rent override</span><b>${r.marketRent?money(r.marketRent):'Not entered'}</b></div><div class="pf-line"><span>Market cap override</span><b>${r.marketCap?Number(r.marketCap).toFixed(2)+'%':'Not entered'}</b></div><div class="pf-line"><span>Last report update</span><b>${safeDate(reportUpdated)}</b></div><div class="pf-report-note" style="margin-top:10px"><b>Analyst commentary</b><br>${esc4(r.recommendationNote||'No custom commentary entered.')}</div></div></div>
      <div class="card span-12"><div class="sectionhead"><div><h2>Analysis History</h2><p>Every cloud-saved version for this property, newest first.</p></div><span class="badge">${hist.length} saved</span></div><div class="pf-history">${hist.length?hist.map((x,i)=>{const xo=x.outputs||{},xs=x.assumptions||{};return `<div class="pf-history-row"><div><b>${esc4(x.name||'Analysis')}</b><br><small>${safeDate(x.updated_at)}${i===0?' • Current':''}</small></div><div><small>Price</small><br><b>${money(xs.price)}</b></div><div><small>Rent</small><br><b>${money(xs.rent)}</b></div><div><small>Cap</small><br><b>${pct(xo.cap)}</b></div><div><small>IRR</small><br><b>${pct(xo.irr)}</b></div><div><small>NPV</small><br><b>${money(xo.npv)}</b></div><div class="actions"><button class="btn ghost" data-pf-open-analysis="${x.id}">Open</button><button class="btn ghost" data-pf-open-report="${x.id}">Report</button></div></div>`}).join(''):'<div class="note">No saved analyses yet.</div>'}</div></div>
      <div class="card span-12"><div class="sectionhead"><div><h2>Financing Scenarios</h2><p>Saved scenarios associated with the latest analysis.</p></div><span class="badge">${cloudScenarios.length} saved</span></div><div class="pf-scenario-grid">${cloudScenarios.length?cloudScenarios.map(x=>`<div class="pf-scenario"><h4>${esc4(x.name)}</h4><div class="pf-line"><span>IRR</span><b>${pct(x.outputs?.irr)}</b></div><div class="pf-line"><span>NPV</span><b>${money(x.outputs?.npv)}</b></div><div class="pf-line"><span>Monthly Payment</span><b>${money(x.outputs?.monthly_payment)}</b></div><div class="pf-line"><span>DSCR</span><b>${mult(x.outputs?.year1_dscr)}</b></div></div>`).join(''):'<div class="note">No financing scenarios have been saved for the latest analysis.</div>'}</div></div>`;
    wireFileActions();
  }
  async function loadAnalysisVersion(id,tab='dashboard'){
    const x=(cloudAnalyses||[]).find(a=>a.id===id);if(!x)return;selectedPropertyId=x.property_id;selectedAnalysisId=x.id;await loadSelectedCloud();if(tab!=='dashboard')switchTab(tab);
  }
  function newAnalysisForProperty(){const p=propertyById(currentPropertyId);if(!p)return;selectedPropertyId=p.id;selectedClientId=p.client_id||null;selectedAnalysisId=null;state={...defaults,name:p.name||'',address:p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ')};renderFields();render();switchTab('assumptions');setStatus('New analysis started for '+(p.name||'property'))}
  async function toggleArchive(){const p=propertyById(currentPropertyId);if(!p||!cloudUser)return;const next=!p.archived;const {error}=await cloudClient.from('properties').update({archived:next,updated_at:new Date().toISOString()}).eq('id',p.id);if(error)return setStatus(error.message);p.archived=next;renderPropertyFile();window.Stage6Dashboard?.render();setStatus(next?'Property archived':'Property restored')}
  async function deleteCurrentProperty(){
    const pid=currentPropertyId;if(!pid)return;
    if(window.Stage6Dashboard?.deleteProperty){await window.Stage6Dashboard.deleteProperty(pid);}
    if(!propertyById(pid)){currentPropertyId=null;switchTab('propertyhub');window.Stage6Dashboard?.render?.();}
  }
  function wireFileActions(){
    document.getElementById('pfBack').onclick=()=>switchTab('propertyhub');
    const latest=latestFor(currentPropertyId);
    document.getElementById('pfReport').onclick=()=>latest?loadAnalysisVersion(latest.id,'report'):newAnalysisForProperty();
    document.getElementById('pfNewAnalysis').onclick=newAnalysisForProperty;
    document.getElementById('pfEditProperty').onclick=()=>{selectProperty(currentPropertyId);switchTab('cloud');setTimeout(()=>document.getElementById('p_name')?.focus(),80)};
    document.getElementById('pfArchive').onclick=toggleArchive;
    document.getElementById('pfDelete').onclick=deleteCurrentProperty;
    document.querySelectorAll('[data-pf-open-analysis]').forEach(b=>b.onclick=()=>loadAnalysisVersion(b.dataset.pfOpenAnalysis));
    document.querySelectorAll('[data-pf-open-report]').forEach(b=>b.onclick=()=>loadAnalysisVersion(b.dataset.pfOpenReport,'report'));
  }
  function enhanceWorkspace(){
    document.querySelectorAll('#hubCards .hub-card').forEach(card=>{
      const open=card.querySelector('[data-hub-open]');if(!open)return;
      const pid=open.dataset.hubOpen;if(!pid||card.querySelector('[data-stage7-file]'))return;
      const b=document.createElement('button');b.className='btn primary';b.dataset.stage7File=pid;b.textContent='Open Property';b.onclick=()=>openPropertyFile(pid);
      open.parentElement?.insertBefore(b,open);
      open.remove();
    });
  }
  const obs=new MutationObserver(()=>enhanceWorkspace());
  const start=()=>{injectSection();enhanceWorkspace();const hub=document.getElementById('hubCards');if(hub)obs.observe(hub,{childList:true,subtree:true});const oldRender=window.Stage6Dashboard?.render;if(oldRender&&!window.Stage6Dashboard.stage7Wrapped){window.Stage6Dashboard.render=function(){const out=oldRender.apply(this,arguments);setTimeout(enhanceWorkspace,0);return out};window.Stage6Dashboard.stage7Wrapped=true}const badge=document.querySelector('.stage-pill');if(badge)badge.textContent='Stage 7 Property Files'};
  window.Stage7PropertyFile={open:openPropertyFile,render:renderPropertyFile};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
