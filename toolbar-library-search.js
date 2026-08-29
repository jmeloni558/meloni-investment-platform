'use strict';
(()=>{
  const VERSION=2;
  if((window.__toolbarLibrarySearchVersion||0)>=VERSION)return;
  window.__toolbarLibrarySearchVersion=VERSION;

  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const props=()=>typeof cloudProperties!=='undefined'?(cloudProperties||[]):[];
  const clients=()=>typeof cloudClients!=='undefined'?(cloudClients||[]):[];
  const analyses=()=>typeof cloudAnalyses!=='undefined'?(cloudAnalyses||[]):[];

  function ensureStyles(){
    if(document.getElementById('ptToolbarSearchStyles'))return;
    const s=document.createElement('style');s.id='ptToolbarSearchStyles';s.textContent=`
      #propertyhub .hub-search-field{display:none!important}
      .pt-search-action{white-space:nowrap}
      #ptLibrarySearchModal{position:fixed;inset:0;z-index:10120;background:rgba(15,23,42,.54);display:flex;align-items:flex-start;justify-content:center;padding:52px 14px;overflow:auto}
      #ptLibrarySearchModal.hidden{display:none}
      #ptLibrarySearchModal .pts-shell{width:min(760px,100%);background:#f7f9fc;border:1px solid #d7e0e8;border-radius:15px;box-shadow:0 28px 80px rgba(15,23,42,.3);overflow:hidden}
      .pts-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.pts-head h3{margin:1px 0 3px;font-size:18px}.pts-head p{margin:0;color:#667085;font-size:10px}.pts-close{width:32px;height:32px;border:0;border-radius:999px;background:#eef2f6;font-size:18px;cursor:pointer}
      .pts-body{padding:16px 18px 20px}.pts-search{margin-bottom:12px}.pts-search label{display:block;font-size:9px;font-weight:800;color:#475467;margin-bottom:5px}.pts-search input{width:100%;min-height:42px;font-size:14px}
      .pts-results{display:grid;gap:8px}.pts-row{background:#fff;border:1px solid #dce5ed;border-radius:10px;padding:11px 12px}.pts-rowtop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.pts-row h4{margin:0;font-size:13px}.pts-row p{margin:3px 0 0;color:#667085;font-size:9.5px;line-height:1.45}.pts-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.pts-client-properties{display:grid;gap:6px;margin-top:9px;padding-top:9px;border-top:1px solid #edf1f5}.pts-property-link{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#f8fafc;border:1px solid #edf1f5;border-radius:8px;padding:8px 9px}.pts-property-link b{font-size:10.5px}.pts-property-link small{display:block;color:#667085;font-size:8.5px;margin-top:2px}.pts-empty{padding:20px;text-align:center;color:#667085;background:#fff;border:1px dashed #cbd5e1;border-radius:9px}
      @media(max-width:700px){#ptLibrarySearchModal{padding:14px 7px}.pts-rowtop,.pts-property-link{display:block}.pts-property-link .pts-actions{margin-top:7px}.pt-search-action{width:100%}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    ensureStyles();let m=document.getElementById('ptLibrarySearchModal');if(m)return m;
    m=document.createElement('div');m.id='ptLibrarySearchModal';m.className='hidden';m.innerHTML='<div class="pts-shell"><div id="ptLibrarySearchContent"></div></div>';document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.classList.contains('hidden'))close();});
    return m;
  }
  function close(){document.getElementById('ptLibrarySearchModal')?.classList.add('hidden');}

  async function goProperty(pid,action){
    close();
    try{if(window.AppNavigationToolbar?.openExisting)await window.AppNavigationToolbar.openExisting();else if(typeof switchTab==='function')switchTab('propertyhub');}catch(_e){}
    setTimeout(()=>{
      try{window.Stage6Dashboard?.render?.();}catch(_e){}
      setTimeout(()=>{
        const sel=action==='manage'?`[data-pt-manage="${pid}"]`:`[data-hub-open="${pid}"]`;
        document.querySelector(sel)?.click();
      },80);
    },80);
  }

  function propertyClientName(p){const c=clients().find(x=>x.id===p.client_id);return c?.name||'Unassigned';}
  function latestName(pid){return analyses().filter(a=>a.property_id===pid).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0]?.name||'No saved analysis';}

  function propertyResults(q){
    const term=q.trim().toLowerCase();
    return props().filter(p=>{
      const hay=[p.name,p.address,p.city,p.state,p.postal_code,propertyClientName(p)].filter(Boolean).join(' ').toLowerCase();
      return !term||hay.includes(term);
    }).sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0)).slice(0,30);
  }
  function clientResults(q){
    const term=q.trim().toLowerCase();
    return clients().filter(c=>!term||(c.name||'').toLowerCase().includes(term)).sort((a,b)=>(a.name||'').localeCompare(b.name||'')).slice(0,30);
  }

  function renderPropertyRows(q){
    const arr=propertyResults(q);if(!arr.length)return '<div class="pts-empty">No saved properties match that search.</div>';
    return arr.map(p=>`<div class="pts-row"><div class="pts-rowtop"><div><h4>${esc(p.name||'Untitled Property')}</h4><p>${esc(p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ')||'No address entered')}<br>Client: ${esc(propertyClientName(p))} • ${esc(latestName(p.id))}</p></div></div><div class="pts-actions"><button class="btn primary" data-pts-open="${esc(p.id)}">Open Property</button><button class="btn secondary" data-pts-manage="${esc(p.id)}">Manage Analyses</button></div></div>`).join('');
  }
  function renderClientRows(q){
    const arr=clientResults(q);if(!arr.length)return '<div class="pts-empty">No clients match that search.</div>';
    return arr.map(c=>{const linked=props().filter(p=>p.client_id===c.id);const rows=linked.map(p=>`<div class="pts-property-link"><div><b>${esc(p.name||'Untitled Property')}</b><small>${esc(p.address||[p.city,p.state,p.postal_code].filter(Boolean).join(', ')||'No address entered')}</small></div><div class="pts-actions"><button class="btn primary" data-pts-open="${esc(p.id)}">Open</button><button class="btn ghost" data-pts-manage="${esc(p.id)}">Manage</button></div></div>`).join('');return `<div class="pts-row"><div class="pts-rowtop"><div><h4>${esc(c.name||'Unnamed Client')}</h4><p>${esc([c.email,c.phone].filter(Boolean).join(' • ')||'No contact details')} • ${linked.length} ${linked.length===1?'property':'properties'}</p></div></div><div class="pts-client-properties">${rows||'<div class="pts-empty">No properties are assigned to this client.</div>'}</div></div>`;}).join('');
  }

  function bindResultActions(host){host.querySelectorAll('[data-pts-open]').forEach(b=>b.onclick=()=>goProperty(b.dataset.ptsOpen,'open'));host.querySelectorAll('[data-pts-manage]').forEach(b=>b.onclick=()=>goProperty(b.dataset.ptsManage,'manage'));}

  function open(mode){
    try{if(typeof cloudUser!=='undefined'&&!cloudUser){if(typeof showAuth==='function')showAuth();return;}}catch(_e){}
    const m=ensureModal(),host=document.getElementById('ptLibrarySearchContent');m.classList.remove('hidden');
    const propertyMode=mode==='property';
    host.innerHTML=`<div class="pts-head"><div><h3>${propertyMode?'Search Properties':'Search Clients'}</h3><p>${propertyMode?'Search by property name, street address, city, ZIP, or assigned client.':'Search saved client names and open any property assigned to that client.'}</p></div><button class="pts-close" type="button">×</button></div><div class="pts-body"><div class="pts-search"><label>${propertyMode?'Property or address':'Client name'}</label><input id="ptLibrarySearchInput" autocomplete="off" placeholder="${propertyMode?'Start typing an address or property name…':'Start typing a client name…'}"></div><div class="pts-results" id="ptLibrarySearchResults"></div></div>`;
    host.querySelector('.pts-close').onclick=close;
    const input=host.querySelector('#ptLibrarySearchInput'),results=host.querySelector('#ptLibrarySearchResults');
    const draw=()=>{results.innerHTML=propertyMode?renderPropertyRows(input.value):renderClientRows(input.value);bindResultActions(results);};
    input.addEventListener('input',draw);draw();setTimeout(()=>input.focus(),30);
    if(typeof refreshCloud==='function')Promise.resolve(refreshCloud()).then(()=>draw()).catch(()=>{});
  }

  function ensureToolbar(){
    ensureStyles();const actions=document.querySelector('.app-nav-actions');if(!actions)return false;
    let prop=document.getElementById('appNavSearchProperties');if(!prop){prop=document.createElement('button');prop.type='button';prop.id='appNavSearchProperties';prop.className='app-nav-action pt-search-action';prop.textContent='Search Properties';prop.onclick=()=>open('property');const existing=document.getElementById('appNavExisting');if(existing)existing.insertAdjacentElement('afterend',prop);else actions.appendChild(prop);}
    let client=document.getElementById('appNavSearchClients');if(!client){client=document.createElement('button');client.type='button';client.id='appNavSearchClients';client.className='app-nav-action pt-search-action';client.textContent='Search Clients';client.onclick=()=>open('client');prop.insertAdjacentElement('afterend',client);}
    const legacy=document.getElementById('hubSearch');if(legacy){legacy.value='';legacy.dispatchEvent(new Event('input',{bubbles:true}));}
    return true;
  }

  function refresh(){return ensureToolbar();}
  window.ToolbarLibrarySearch={open,refresh};
  function start(){let n=0;const t=setInterval(()=>{if(refresh())clearInterval(t);if(++n>60)clearInterval(t)},120);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
