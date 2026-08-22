'use strict';
(()=>{
  const VERSION=1;
  if((window.__analysisHistoryAutosaveVersion||0)>=VERSION)return;
  window.__analysisHistoryAutosaveVersion=VERSION;

  const DRAFT_PREFIX='pt-analysis-draft-v1:';
  let draftTimer=null;
  let lastDraftKey=null;

  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const money=v=>Number.isFinite(Number(v))?(typeof fmtC==='function'?fmtC(Number(v)):Number(v).toLocaleString('en-US',{style:'currency',currency:'USD'})):'—';
  const pct=v=>Number.isFinite(Number(v))?(typeof fmtP==='function'?fmtP(Number(v)):(Number(v)*100).toFixed(2)+'%'):'—';
  const when=v=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?'—':d.toLocaleString([], {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});};

  function userId(){try{return cloudUser?.id||'anon';}catch(_e){return 'anon';}}
  function draftKey(propertyId=selectedPropertyId,analysisId=selectedAnalysisId){return `${DRAFT_PREFIX}${userId()}:${propertyId||'none'}:${analysisId||'new'}`;}
  function propertyLabel(){try{const p=(cloudProperties||[]).find(x=>x.id===selectedPropertyId);return p?.name||p?.address||state?.address||state?.name||'current property';}catch(_e){return 'current property';}}

  function ensureStyles(){
    if(document.getElementById('ptHistoryAutosaveStyles'))return;
    const s=document.createElement('style');s.id='ptHistoryAutosaveStyles';s.textContent=`
      .pt-draft-state{font-size:8.5px;color:#667085;white-space:nowrap;margin-left:7px}.pt-draft-state.saved{color:#52708d}
      .pt-draft-recovery{border:1px solid #9dc0db;background:#eef6fb;border-radius:11px;padding:11px 13px;margin:0 0 13px;display:flex;justify-content:space-between;align-items:center;gap:12px}.pt-draft-recovery strong{display:block;color:#174f83;font-size:11px}.pt-draft-recovery span{display:block;color:#526274;font-size:9px;margin-top:3px}.pt-draft-recovery .pt-recovery-actions{display:flex;gap:7px;flex-wrap:wrap}
      #ptVersionModal{position:fixed;inset:0;z-index:10080;background:rgba(15,23,42,.56);display:flex;align-items:flex-start;justify-content:center;padding:42px 14px;overflow:auto}#ptVersionModal.hidden{display:none}#ptVersionModal .ptv-shell{width:min(820px,100%);background:#f7f9fc;border:1px solid #d7e0e8;border-radius:15px;box-shadow:0 28px 80px rgba(15,23,42,.3);overflow:hidden}.ptv-head{display:flex;justify-content:space-between;gap:12px;padding:18px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.ptv-head h3{margin:2px 0;font-size:18px}.ptv-head p{margin:0;color:#667085;font-size:10px}.ptv-close{width:32px;height:32px;border:0;border-radius:999px;background:#eef2f6;font-size:18px;cursor:pointer}.ptv-body{padding:14px 18px 20px}.ptv-list{display:grid;gap:9px}.ptv-row{background:#fff;border:1px solid #dce5ed;border-radius:10px;padding:12px}.ptv-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.ptv-top b{font-size:12px}.ptv-top span{font-size:9px;color:#667085}.ptv-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:9px 0}.ptv-metric{background:#f8fafc;border:1px solid #edf1f5;border-radius:7px;padding:7px}.ptv-metric span{display:block;font-size:7.5px;color:#667085}.ptv-metric b{display:block;font-size:10px;margin-top:2px}.ptv-empty{padding:20px;text-align:center;color:#667085;background:#fff;border:1px dashed #cbd5e1;border-radius:9px}
      @media(max-width:700px){.pt-draft-recovery{display:block}.pt-draft-recovery .pt-recovery-actions{margin-top:9px}.ptv-metrics{grid-template-columns:repeat(2,1fr)}}
    `;document.head.appendChild(s);
  }

  function ensureDraftBadge(){
    ensureStyles();let b=document.getElementById('ptDraftState');if(b)return b;
    const host=document.querySelector('.app-nav-toolbar')||document.querySelector('.topactions');if(!host)return null;
    b=document.createElement('span');b.id='ptDraftState';b.className='pt-draft-state';b.hidden=true;host.appendChild(b);return b;
  }
  function showDraftState(text){const b=ensureDraftBadge();if(!b)return;b.hidden=false;b.className='pt-draft-state saved';b.textContent=text;}
  function hideDraftState(){const b=document.getElementById('ptDraftState');if(b)b.hidden=true;}

  function tracked(el){return !!el?.closest?.('#guidedSetup,#assumptions,#dashboard,#report,#scenarios,#support,#buydown');}
  function readDraftState(){
    const snap={...(typeof state==='object'&&state?state:{})};
    try{
      if(typeof fg==='object'&&fg){for(const fields of Object.values(fg))for(const [k,,t] of fields){const el=document.getElementById('f_'+k);if(!el)continue;if(t==='b')snap[k]=el.value==='true';else{const raw=Number(el.value);if(Number.isFinite(raw))snap[k]=raw/(t==='%'?100:1);}}}
      const n=document.getElementById('f_name'),a=document.getElementById('f_address');if(n)snap.name=n.value.trim();if(a)snap.address=a.value.trim();
      const repairs=document.getElementById('f_initialRepairs');if(repairs&&Number.isFinite(Number(repairs.value)))snap.initialRepairs=Number(repairs.value);
    }catch(_e){}
    return snap;
  }
  function rawInputs(){
    const out={};document.querySelectorAll('#assumptions input[id],#assumptions select[id],#guidedSetup input[data-src],#guidedSetup select[data-src]').forEach(el=>{const id=el.id||el.dataset.src;if(id)out[id]=el.value;});return out;
  }
  function saveDraft(){
    try{
      if(!selectedPropertyId&&!selectedAnalysisId)return;
      const key=draftKey();lastDraftKey=key;
      const payload={savedAt:new Date().toISOString(),propertyId:selectedPropertyId||null,analysisId:selectedAnalysisId||null,state:readDraftState(),buyState:typeof buyState==='object'?{...buyState}:null,raw:rawInputs()};
      localStorage.setItem(key,JSON.stringify(payload));
      const t=new Date(payload.savedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});showDraftState('Draft autosaved • '+t);
    }catch(_e){}
  }
  function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,1200);}
  function clearDraft(key){try{if(key)localStorage.removeItem(key);}catch(_e){}hideDraftState();removeRecovery();}

  function removeRecovery(){document.querySelectorAll('.pt-draft-recovery').forEach(x=>x.remove());}
  function applyRaw(raw){if(!raw)return;for(const [id,val] of Object.entries(raw)){const el=document.getElementById(id)||document.querySelector(`[data-src="${CSS.escape(id)}"]`);if(el)el.value=val;}}
  function restoreDraft(d){
    if(!d)return;
    try{state={...defaults,...(d.state||{})};if(d.buyState&&typeof buydownDefaults!=='undefined')buyState={...buydownDefaults,...d.buyState};if(typeof renderFields==='function')renderFields();applyRaw(d.raw);try{window.GuidedAnalysisSetup?.refresh?.();}catch(_e){}try{window.GuidedAssumptionGuidance?.apply?.();}catch(_e){}try{window.GuidedInitialRepairs?.apply?.();}catch(_e){}try{window.UnsavedChangeProtection?.markDirty?.();}catch(_e){}try{window.SaveStateFeedback?.unsaved?.();}catch(_e){}showDraftState('Recovered draft • '+new Date(d.savedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));removeRecovery();}catch(_e){}
  }
  function checkDraft(){
    removeRecovery();let d=null;const key=draftKey();try{d=JSON.parse(localStorage.getItem(key)||'null');}catch(_e){}if(!d?.savedAt)return;
    let currentUpdated=0;try{const a=(cloudAnalyses||[]).find(x=>x.id===selectedAnalysisId);currentUpdated=new Date(a?.updated_at||0).getTime();}catch(_e){}
    if(selectedAnalysisId&&new Date(d.savedAt).getTime()<=currentUpdated+1000)return;
    const host=document.getElementById('guidedSetup')||document.querySelector('#dashboard > .grid')||document.querySelector('#assumptions > .grid');if(!host)return;
    ensureStyles();const box=document.createElement('div');box.className='pt-draft-recovery screen-only';box.innerHTML=`<div><strong>Recover autosaved draft for ${esc(propertyLabel())}?</strong><span>A newer browser draft was saved ${esc(when(d.savedAt))}. Restore it or discard it and keep the cloud-saved version.</span></div><div class="pt-recovery-actions"><button class="btn primary" data-pt-draft-restore>Restore Draft</button><button class="btn ghost" data-pt-draft-discard>Discard Draft</button></div>`;
    host.prepend(box);box.querySelector('[data-pt-draft-restore]').onclick=()=>restoreDraft(d);box.querySelector('[data-pt-draft-discard]').onclick=()=>clearDraft(key);
  }

  async function snapshotVersion(analysisId){
    if(!analysisId||!cloudUser)return;
    const {data,error}=await cloudClient.from('analyses').select('*').eq('id',analysisId).eq('user_id',cloudUser.id).single();if(error||!data)return;
    const payload={user_id:cloudUser.id,analysis_id:data.id,property_id:data.property_id,name:data.name,assumptions:data.assumptions||{},outputs:data.outputs||{},report_meta:data.report_meta||{},created_at:new Date().toISOString()};
    const {error:verErr}=await cloudClient.from('analysis_versions').insert(payload);if(verErr)throw verErr;
  }

  const saveOriginal=window.saveCurrentCloud;
  if(typeof saveOriginal==='function'){
    window.saveCurrentCloud=async function(...args){
      const beforeKey=draftKey();const beforeId=selectedAnalysisId;
      const out=await saveOriginal.apply(this,args);
      const msg=(document.getElementById('saveStatus')?.textContent||'').toLowerCase();
      if(/save canceled|enter an analysis name|save failed|could not be updated/.test(msg))return out;
      const afterId=selectedAnalysisId;
      if(afterId){try{await snapshotVersion(afterId);}catch(e){try{setStatus('Analysis saved, but version history could not be updated: '+e.message);}catch(_e){}}clearDraft(beforeKey);clearDraft(draftKey(selectedPropertyId,afterId));}
      return out;
    };
  }

  function ensureVersionModal(){
    ensureStyles();let m=document.getElementById('ptVersionModal');if(m)return m;
    m=document.createElement('div');m.id='ptVersionModal';m.className='hidden';m.innerHTML='<div class="ptv-shell"><div id="ptVersionContent"></div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)closeHistory();});return m;
  }
  function closeHistory(){document.getElementById('ptVersionModal')?.classList.add('hidden');}
  async function openHistory(id){
    if(!id||!cloudUser)return;const a=(cloudAnalyses||[]).find(x=>x.id===id);if(!a)return;
    const m=ensureVersionModal(),host=document.getElementById('ptVersionContent');m.classList.remove('hidden');host.innerHTML='<div class="ptv-head"><div><h3>Version History</h3><p>Loading saved versions…</p></div><button class="ptv-close">×</button></div><div class="ptv-body"><div class="ptv-empty">Loading…</div></div>';host.querySelector('.ptv-close').onclick=closeHistory;
    const {data,error}=await cloudClient.from('analysis_versions').select('*').eq('analysis_id',id).order('created_at',{ascending:false});
    if(error){host.querySelector('.ptv-body').innerHTML='<div class="ptv-empty">Could not load version history.</div>';return;}
    const versions=data||[];const rows=versions.map((v,i)=>{const s=v.assumptions||{},o=v.outputs||{};return `<div class="ptv-row"><div class="ptv-top"><b>Version ${versions.length-i}</b><span>${esc(when(v.created_at))}</span></div><div class="ptv-metrics"><div class="ptv-metric"><span>Purchase Price</span><b>${esc(money(s.price))}</b></div><div class="ptv-metric"><span>Rent</span><b>${esc(money(s.rent))}</b></div><div class="ptv-metric"><span>IRR</span><b>${esc(pct(o.irr))}</b></div><div class="ptv-metric"><span>NPV</span><b>${esc(money(o.npv))}</b></div></div><button class="btn secondary" data-pt-version-restore="${esc(v.id)}">Restore This Version</button></div>`;}).join('');
    host.innerHTML=`<div class="ptv-head"><div><h3>Version History — ${esc(a.name||'Analysis')}</h3><p>${versions.length} saved ${versions.length===1?'version':'versions'}. Restoring first preserves the current state as another version.</p></div><button class="ptv-close">×</button></div><div class="ptv-body"><div class="ptv-list">${rows||'<div class="ptv-empty">No versions have been created yet. The next cloud save will create the first version.</div>'}</div></div>`;host.querySelector('.ptv-close').onclick=closeHistory;host.querySelectorAll('[data-pt-version-restore]').forEach(b=>b.onclick=()=>restoreVersion(id,b.dataset.ptVersionRestore));
  }
  async function restoreVersion(analysisId,versionId){
    if(!confirm('Restore this saved version? The current analysis will first be preserved in version history.'))return;
    const {data:v,error}=await cloudClient.from('analysis_versions').select('*').eq('id',versionId).eq('user_id',cloudUser.id).single();if(error||!v)return;
    try{await snapshotVersion(analysisId);}catch(_e){}
    const payload={name:v.name,assumptions:v.assumptions||{},outputs:v.outputs||{},report_meta:v.report_meta||{},updated_at:new Date().toISOString()};
    const {error:uerr}=await cloudClient.from('analyses').update(payload).eq('id',analysisId).eq('user_id',cloudUser.id);if(uerr){try{setStatus('Version restore failed: '+uerr.message);}catch(_e){}return;}
    if(typeof refreshCloud==='function')await refreshCloud();try{window.UnsavedChangeProtection?.markClean?.();}catch(_e){}try{setStatus('Saved version restored.');}catch(_e){}closeHistory();try{if(window.PropertyAnalysisManager?.render)window.PropertyAnalysisManager.render(v.property_id);}catch(_e){}
  }

  function decorateHistoryButtons(){
    const root=document.getElementById('ptAnalysisContent');if(!root)return;
    root.querySelectorAll('.pt-row').forEach(row=>{const open=row.querySelector('[data-pt-open]');const actions=row.querySelector('.pt-actions');if(!open||!actions||actions.querySelector('[data-pt-history]'))return;const b=document.createElement('button');b.type='button';b.className='btn ghost';b.dataset.ptHistory=open.dataset.ptOpen;b.textContent='History';const del=actions.querySelector('[data-pt-delete]');actions.insertBefore(b,del||null);});
  }

  document.addEventListener('input',e=>{if(tracked(e.target))scheduleDraft();},true);
  document.addEventListener('change',e=>{if(tracked(e.target))scheduleDraft();},true);
  document.addEventListener('click',e=>{const h=e.target?.closest?.('[data-pt-history]');if(h){e.preventDefault();e.stopPropagation();openHistory(h.dataset.ptHistory);return;}const t=e.target?.closest?.('[data-pt-manage],[data-pt-rename],[data-pt-duplicate],[data-pt-delete]');if(t)setTimeout(decorateHistoryButtons,180);const nav=e.target?.closest?.('[data-pt-open],[data-hub-open],[data-pt-new],[data-hub-edit],#appNavNew,#s10NewAnalysis');if(nav)setTimeout(checkDraft,350);},true);

  window.AnalysisHistoryAutosave={saveDraft,checkDraft,openHistory,decorateHistoryButtons,snapshotVersion};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{ensureDraftBadge();decorateHistoryButtons();checkDraft();},250);},{once:true});else setTimeout(()=>{ensureDraftBadge();decorateHistoryButtons();checkDraft();},250);
})();
