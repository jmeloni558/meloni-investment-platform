'use strict';
(()=>{
  const VERSION=1;
  if((window.__workspaceConsolidationVersion||0)>=VERSION)return;
  window.__workspaceConsolidationVersion=VERSION;

  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  function status(msg){try{if(typeof setStatus==='function')setStatus(msg);}catch(_e){}}
  function signed(){try{return !!cloudUser;}catch(_e){return false;}}

  function ensureStyles(){
    if(document.getElementById('ptWorkspaceConsolidationStyle'))return;
    const s=document.createElement('style');s.id='ptWorkspaceConsolidationStyle';s.textContent=`
      .tab[data-tab="cloud"],[data-app-advanced="cloud"],[data-s8-advanced="cloud"],#cloud{display:none!important}
      .pt-workspace-card{margin:0 0 14px;border:1px solid #dce5ed;border-radius:11px;background:#fff;padding:13px}.pt-workspace-card h4{margin:0 0 3px;font-size:13px}.pt-workspace-card p{margin:0 0 11px;color:#667085;font-size:9.5px}.pt-workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.pt-workspace-grid .field.wide{grid-column:1/-1}.pt-workspace-grid label{font-size:8px}.pt-workspace-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.pt-client-row{display:grid;grid-template-columns:minmax(150px,1fr) auto;gap:8px;align-items:end;margin:8px 0 10px}.pt-client-row label{display:block;font-size:8px;color:#667085;margin-bottom:4px}.pt-client-row select{width:100%}.pt-scenario-cloud{margin-top:12px}.pt-scenario-list{display:grid;gap:7px;margin-top:9px}.pt-scenario-item{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid #e3e8ee;border-radius:9px;background:#fff;padding:9px 10px}.pt-scenario-item b{font-size:11px}.pt-scenario-item small{display:block;color:#667085;font-size:8.5px;margin-top:2px}.pt-scenario-actions{display:flex;gap:6px;flex-wrap:wrap}.pt-hub-refresh{white-space:nowrap}.pt-global-save{margin-left:2px}
      @media(max-width:720px){.pt-workspace-grid{grid-template-columns:1fr}.pt-client-row{grid-template-columns:1fr}.pt-scenario-item{display:block}.pt-scenario-actions{margin-top:8px}.pt-global-save{width:100%}}
    `;document.head.appendChild(s);
  }

  function go(id){try{if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go(id);else if(typeof switchTab==='function')switchTab(id);}catch(_e){}}

  function ensureGlobalSave(){
    ensureStyles();
    const host=document.querySelector('.app-nav-actions');if(!host)return false;
    let b=document.getElementById('ptGlobalSaveAnalysis');
    if(!b){b=document.createElement('button');b.type='button';b.id='ptGlobalSaveAnalysis';b.className='app-nav-action pt-global-save';b.textContent='Save Analysis';host.appendChild(b);b.onclick=async()=>{if(!signed()){try{showAuth();}catch(_e){}return;}if(typeof saveCurrentCloud==='function')await saveCurrentCloud(false);};}
    let hasContext=false;try{hasContext=!!selectedPropertyId;}catch(_e){}
    b.hidden=!signed()||!hasContext;return true;
  }

  function ensureHubRefresh(){
    const toolbar=document.querySelector('#propertyhub .hub-toolbar');if(!toolbar)return false;
    if(toolbar.querySelector('[data-pt-cloud-refresh]'))return true;
    const b=document.createElement('button');b.type='button';b.className='btn ghost pt-hub-refresh';b.dataset.ptCloudRefresh='1';b.textContent='Refresh';b.onclick=async()=>{if(!signed())return; b.disabled=true;b.textContent='Refreshing…';try{if(typeof refreshCloud==='function')await refreshCloud();try{window.Stage6Dashboard?.render?.();}catch(_e){}try{window.PropertyAnalysisManager?.decorateCards?.();}catch(_e){}status('Saved property records refreshed');}finally{b.disabled=false;b.textContent='Refresh';}};toolbar.appendChild(b);return true;
  }

  function currentProperty(pid){try{return (cloudProperties||[]).find(x=>x.id===pid)||null;}catch(_e){return null;}}
  function currentClient(id){try{return (cloudClients||[]).find(x=>x.id===id)||null;}catch(_e){return null;}}

  function decorateManager(){
    const host=document.getElementById('ptAnalysisContent');if(!host||host.querySelector('[data-pt-record-editor]'))return false;
    const newBtn=host.querySelector('[data-pt-new]');const pid=newBtn?.dataset?.ptNew;if(!pid)return false;
    const p=currentProperty(pid);if(!p)return false;
    const body=host.querySelector('.pt-body');if(!body)return false;
    const assigned=currentClient(p.client_id);
    const clients=(typeof cloudClients!=='undefined'?(cloudClients||[]):[]);
    const card=document.createElement('div');card.className='pt-workspace-card';card.dataset.ptRecordEditor=pid;
    card.innerHTML=`<h4>Property & Client Details</h4><p>Saved-record details now live here instead of in a separate Cloud Workspace.</p>
      <div class="pt-client-row"><div><label>Assigned Client</label><select data-pt-client-select><option value="">Unassigned</option>${clients.map(c=>`<option value="${esc(c.id)}" ${c.id===p.client_id?'selected':''}>${esc(c.name||'Unnamed Client')}</option>`).join('')}</select></div><button class="btn ghost" type="button" data-pt-new-client>New Client</button></div>
      <div class="pt-workspace-grid">
        <div class="field wide"><label>Property Name</label><input data-pt-p-name value="${esc(p.name||'')}"></div><div class="field wide"><label>Street Address</label><input data-pt-p-address value="${esc(p.address||'')}"></div><div class="field"><label>City</label><input data-pt-p-city value="${esc(p.city||'')}"></div><div class="field"><label>State</label><input data-pt-p-state value="${esc(p.state||'FL')}"></div><div class="field"><label>ZIP</label><input data-pt-p-zip value="${esc(p.postal_code||'')}"></div><div class="field wide"><label>Property Notes</label><textarea data-pt-p-notes>${esc(p.notes||'')}</textarea></div>
      </div><div class="pt-workspace-actions"><button class="btn secondary" type="button" data-pt-save-property-details>Save Property Details</button></div>
      <div data-pt-client-editor style="margin-top:13px"></div>`;
    const toolbar=body.querySelector('.pt-toolbar');body.insertBefore(card,toolbar||body.firstChild);

    const select=card.querySelector('[data-pt-client-select]');
    function drawClient(id,newMode=false){
      const c=newMode?null:currentClient(id);const ed=card.querySelector('[data-pt-client-editor]');
      if(!newMode&&!c){ed.innerHTML='';return;}
      ed.innerHTML=`<div class="pt-workspace-grid"><div class="field wide"><label>Client Name</label><input data-pt-c-name value="${esc(c?.name||'')}"></div><div class="field"><label>Email</label><input data-pt-c-email type="email" value="${esc(c?.email||'')}"></div><div class="field"><label>Phone</label><input data-pt-c-phone value="${esc(c?.phone||'')}"></div><div class="field wide"><label>Client Notes</label><textarea data-pt-c-notes>${esc(c?.notes||'')}</textarea></div></div><div class="pt-workspace-actions"><button class="btn secondary" type="button" data-pt-save-client>${newMode?'Create & Assign Client':'Save Client Details'}</button></div>`;
      ed.querySelector('[data-pt-save-client]').onclick=async()=>{
        if(!signed())return;
        const payload={user_id:cloudUser.id,name:ed.querySelector('[data-pt-c-name]').value.trim(),email:ed.querySelector('[data-pt-c-email]').value.trim()||null,phone:ed.querySelector('[data-pt-c-phone]').value.trim()||null,notes:ed.querySelector('[data-pt-c-notes]').value.trim()||null,updated_at:new Date().toISOString()};
        if(!payload.name){status('Client name is required');return;}
        let data,error;
        if(newMode){({data,error}=await cloudClient.from('clients').insert(payload).select().single());}
        else{({data,error}=await cloudClient.from('clients').update(payload).eq('id',c.id).eq('user_id',cloudUser.id).select().single());}
        if(error){status('Client save failed: '+error.message);return;}
        const clientId=data.id;const {error:pe}=await cloudClient.from('properties').update({client_id:clientId,updated_at:new Date().toISOString()}).eq('id',pid).eq('user_id',cloudUser.id);if(pe){status('Client saved, but property assignment failed: '+pe.message);return;}
        if(typeof refreshCloud==='function')await refreshCloud();status(newMode?'Client created and assigned':'Client details saved');if(window.PropertyAnalysisManager?.render)window.PropertyAnalysisManager.render(pid);setTimeout(decorateManager,80);
      };
    }
    select.onchange=async()=>{const id=select.value||null;const {error}=await cloudClient.from('properties').update({client_id:id,updated_at:new Date().toISOString()}).eq('id',pid).eq('user_id',cloudUser.id);if(error){status('Client assignment failed: '+error.message);return;}if(typeof refreshCloud==='function')await refreshCloud();drawClient(id,false);status(id?'Client assigned':'Client unassigned');};
    card.querySelector('[data-pt-new-client]').onclick=()=>{select.value='';drawClient(null,true);};
    card.querySelector('[data-pt-save-property-details]').onclick=async()=>{if(!signed())return;const payload={name:card.querySelector('[data-pt-p-name]').value.trim(),address:card.querySelector('[data-pt-p-address]').value.trim()||null,city:card.querySelector('[data-pt-p-city]').value.trim()||null,state:card.querySelector('[data-pt-p-state]').value.trim()||null,postal_code:card.querySelector('[data-pt-p-zip]').value.trim()||null,notes:card.querySelector('[data-pt-p-notes]').value.trim()||null,updated_at:new Date().toISOString()};if(!payload.name){status('Property name is required');return;}const {error}=await cloudClient.from('properties').update(payload).eq('id',pid).eq('user_id',cloudUser.id);if(error){status('Property save failed: '+error.message);return;}if(typeof refreshCloud==='function')await refreshCloud();status('Property details saved');if(window.PropertyAnalysisManager?.render)window.PropertyAnalysisManager.render(pid);setTimeout(decorateManager,80);};
    if(assigned)drawClient(assigned.id,false);
    return true;
  }

  function scenarioSummary(x){const o=x?.outputs||{};const irr=Number(o.irr),npv=Number(o.npv);const ip=Number.isFinite(irr)?(typeof fmtP==='function'?fmtP(irr):(irr*100).toFixed(2)+'%'):'—';const nm=Number.isFinite(npv)?(typeof fmtC==='function'?fmtC(npv):npv.toLocaleString()):'—';return `${ip} IRR • ${nm} NPV`;}
  function renderScenarioCloud(){
    const sec=document.getElementById('scenarios');if(!sec)return false;let box=document.getElementById('ptScenarioCloudBox');
    if(!box){box=document.createElement('div');box.id='ptScenarioCloudBox';box.className='card span-12 pt-scenario-cloud';const grid=sec.querySelector('.grid');grid?.appendChild(box);}
    let aid=null;try{aid=selectedAnalysisId;}catch(_e){}
    if(!signed()){box.innerHTML='<h2>Saved Scenario Sets</h2><div class="note">Sign in to save scenario sets.</div>';return true;}
    if(!aid){box.innerHTML='<h2>Saved Scenario Sets</h2><div class="note">Save the analysis first, then Scenario A/B/C can be stored with it.</div>';return true;}
    const rows=(typeof cloudScenarios!=='undefined'?(cloudScenarios||[]):[]).map(x=>`<div class="pt-scenario-item"><div><b>${esc(x.name||'Scenario')}</b><small>${esc(scenarioSummary(x))}</small></div><div class="pt-scenario-actions"><button class="btn ghost" type="button" data-pt-scenario-load="${esc(x.id)}">Load</button><button class="btn danger" type="button" data-pt-scenario-delete="${esc(x.id)}">Delete</button></div></div>`).join('');
    box.innerHTML=`<div class="sectionhead"><div><h2>Saved Scenario Sets</h2><p>Scenario A/B/C cloud storage for the current analysis.</p></div><div class="actions"><button class="btn secondary" type="button" data-pt-scenario-save>Save Scenario Set</button><button class="btn ghost" type="button" data-pt-scenario-refresh>Refresh</button></div></div><div class="pt-scenario-list">${rows||'<div class="note">No saved scenario set yet.</div>'}</div>`;
    box.querySelector('[data-pt-scenario-save]').onclick=async()=>{if(typeof saveScenarioSetCloud==='function')await saveScenarioSetCloud(false);renderScenarioCloud();};box.querySelector('[data-pt-scenario-refresh]').onclick=async()=>{if(typeof loadCloudScenarios==='function')await loadCloudScenarios(aid);renderScenarioCloud();};box.querySelectorAll('[data-pt-scenario-load]').forEach(b=>b.onclick=()=>{selectedScenarioId=b.dataset.ptScenarioLoad;if(typeof loadSelectedScenarioCloud==='function')loadSelectedScenarioCloud();});box.querySelectorAll('[data-pt-scenario-delete]').forEach(b=>b.onclick=async()=>{selectedScenarioId=b.dataset.ptScenarioDelete;if(typeof deleteScenarioCloud==='function')await deleteScenarioCloud();renderScenarioCloud();});return true;
  }

  const saveOriginal=window.saveCurrentCloud;
  if(typeof saveOriginal==='function')window.saveCurrentCloud=async function(...args){const active=document.querySelector('.section.active')?.id||'dashboard';const out=await saveOriginal.apply(this,args);if(document.querySelector('.section.active')?.id==='cloud')go(active==='cloud'?'dashboard':active);setTimeout(()=>{ensureGlobalSave();renderScenarioCloud();},80);return out;};

  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-pt-manage]'))setTimeout(decorateManager,100);if(e.target?.closest?.('[data-app-advanced="scenarios"],[data-s8-tab="scenarios"],[data-s8-advanced="scenarios"],.tab[data-tab="scenarios"]'))setTimeout(renderScenarioCloud,120);if(e.target?.closest?.('[data-hub-open],[data-pt-open],[data-pt-new],#appNavNew,#appNavExisting'))setTimeout(()=>{ensureGlobalSave();ensureHubRefresh();},150);},true);

  function refresh(){ensureStyles();ensureGlobalSave();ensureHubRefresh();decorateManager();renderScenarioCloud();}
  window.WorkspaceConsolidation={refresh,decorateManager,renderScenarioCloud};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,300),{once:true});else setTimeout(refresh,300);
})();
