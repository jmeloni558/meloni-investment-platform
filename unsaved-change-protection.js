'use strict';
(()=>{
  const VERSION=1;
  if((window.__unsavedChangeProtectionVersion||0)>=VERSION)return;
  window.__unsavedChangeProtectionVersion=VERSION;

  let dirty=false;

  const editRoots=['assumptions','dashboard','report','scenarios','support','buydown'];
  const destructiveSelector=[
    '#appNavNew','#s10NewAnalysis','[data-pt-new]',
    '[data-hub-open]','[data-hub-edit]','[data-hub-report]',
    '[data-pt-open]','[data-pt-report]','#loadCloudAnalysis'
  ].join(',');

  function label(){
    try{
      const p=(cloudProperties||[]).find(x=>x.id===selectedPropertyId);
      return p?.name||p?.address||state?.address||state?.name||'the current analysis';
    }catch(_e){return 'the current analysis';}
  }

  function ensureBadge(){
    let b=document.getElementById('ptDirtyBadge');
    if(b)return b;
    const host=document.querySelector('.app-nav-toolbar')||document.querySelector('.topactions');
    if(!host)return null;
    b=document.createElement('span');
    b.id='ptDirtyBadge';
    b.className='pt-dirty-badge';
    b.textContent='Unsaved changes';
    b.hidden=true;
    host.appendChild(b);
    if(!document.getElementById('ptDirtyBadgeStyle')){
      const s=document.createElement('style');
      s.id='ptDirtyBadgeStyle';
      s.textContent='.pt-dirty-badge{margin-left:auto;border:1px solid #e6b85c;background:#fff8e8;color:#7a4b00;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:800;white-space:nowrap}.pt-dirty-badge[hidden]{display:none!important}';
      document.head.appendChild(s);
    }
    return b;
  }

  function refreshBadge(){const b=ensureBadge();if(b)b.hidden=!dirty;}
  function markDirty(){if(dirty)return;dirty=true;refreshBadge();}
  function markClean(){dirty=false;refreshBadge();}

  function isTrackedInput(el){
    if(!el||!el.closest)return false;
    if(el.closest('.pt-unsaved-new'))return false;
    return editRoots.some(id=>el.closest('#'+id))||!!el.closest('#guidedSetup');
  }

  function confirmDiscard(){
    return window.confirm(`You have unsaved changes for ${label()}.\n\nIf you continue, those changes may be lost.\n\nPress Cancel to stay here and save the analysis first.`);
  }

  document.addEventListener('input',e=>{if(isTrackedInput(e.target))markDirty();},true);
  document.addEventListener('change',e=>{if(isTrackedInput(e.target))markDirty();},true);

  document.addEventListener('click',e=>{
    const t=e.target?.closest?.(destructiveSelector);
    if(!t||!dirty)return;
    if(!confirmDiscard()){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    markClean();
  },true);

  document.addEventListener('click',e=>{
    const save=e.target?.closest?.('#cloudSaveCurrent,[data-pt-save-new]');
    if(!save)return;
    [250,700,1400].forEach(ms=>setTimeout(()=>{
      const status=document.getElementById('saveStatus')?.textContent||'';
      if(/analysis saved to cloud/i.test(status))markClean();
      try{if(selectedAnalysisId&&!document.querySelector('.pt-unsaved-new'))markClean();}catch(_e){}
    },ms));
  },true);

  window.addEventListener('beforeunload',e=>{
    if(!dirty)return;
    e.preventDefault();
    e.returnValue='';
  });

  window.UnsavedChangeProtection={markDirty,markClean,isDirty:()=>dirty,refresh:refreshBadge};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshBadge,100),{once:true});
  else setTimeout(refreshBadge,100);
})();
