'use strict';
(()=>{
  const VERSION=2;
  if((window.__saveStateFeedbackVersion||0)>=VERSION)return;
  window.__saveStateFeedbackVersion=VERSION;

  let stateName='clean';

  function propertyLabel(){
    try{
      const p=(cloudProperties||[]).find(x=>x.id===selectedPropertyId);
      return p?.name||p?.address||state?.address||state?.name||'current property';
    }catch(_e){return 'current property';}
  }

  function ensure(){
    let b=document.getElementById('ptSaveStateBadge');
    if(b)return b;
    const host=document.querySelector('.app-nav-toolbar')||document.querySelector('.topactions');
    if(!host)return null;
    b=document.createElement('span');
    b.id='ptSaveStateBadge';
    b.className='pt-save-state';
    b.hidden=true;
    host.appendChild(b);
    if(!document.getElementById('ptSaveStateStyle')){
      const s=document.createElement('style');s.id='ptSaveStateStyle';s.textContent=`
        #ptDirtyBadge{display:none!important}
        .pt-save-state{margin-left:auto;border-radius:999px;padding:6px 10px;font-size:9px;font-weight:800;white-space:nowrap;border:1px solid #d0d5dd;background:#fff;color:#475467}
        .pt-save-state.unsaved{border-color:#e6b85c;background:#fff8e8;color:#7a4b00}
        .pt-save-state.saving{border-color:#9dc0db;background:#eef6fb;color:#175c92}
        .pt-save-state.saved{border-color:#9fd3af;background:#eef9f1;color:#196b35}
        .pt-save-state.error{border-color:#e5a7a7;background:#fff1f1;color:#a22b2b}
        .pt-save-state[hidden]{display:none!important}
      `;document.head.appendChild(s);
    }
    return b;
  }

  function show(kind,text){
    stateName=kind;
    const b=ensure();if(!b)return;
    b.hidden=false;
    b.className='pt-save-state '+kind;
    b.textContent=text;
  }
  function clear(){
    stateName='clean';
    const b=document.getElementById('ptSaveStateBadge');
    if(!b)return;
    b.hidden=true;
    b.className='pt-save-state';
    b.textContent='';
  }
  function unsaved(){show('unsaved','Unsaved changes');}
  function saving(){show('saving','Saving…');}
  function saved(){
    const time=new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    show('saved',`Saved to ${propertyLabel()} • ${time}`);
  }
  function error(){show('error','Save failed — changes remain unsaved');}

  function tracked(el){
    if(!el||!el.closest)return false;
    if(el.closest('.pt-unsaved-new'))return false;
    return !!el.closest('#guidedSetup,#assumptions,#dashboard,#report,#scenarios,#support,#buydown');
  }

  document.addEventListener('input',e=>{if(tracked(e.target))unsaved();},true);
  document.addEventListener('change',e=>{if(tracked(e.target))unsaved();},true);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#appNavNew,#s10NewAnalysis'))clear();
  },true);

  const original=window.saveCurrentCloud;
  if(typeof original==='function'){
    window.saveCurrentCloud=async function(...args){
      saving();
      const beforeId=typeof selectedAnalysisId!=='undefined'?selectedAnalysisId:null;
      try{
        const out=await original.apply(this,args);
        const msg=(document.getElementById('saveStatus')?.textContent||'').toLowerCase();
        if(/save canceled|enter an analysis name/.test(msg)){unsaved();return out;}
        if(/save failed|could not be updated/.test(msg)){error();return out;}
        const afterId=typeof selectedAnalysisId!=='undefined'?selectedAnalysisId:null;
        if(afterId||beforeId||/analysis saved/.test(msg))saved();
        else unsaved();
        return out;
      }catch(e){error();throw e;}
    };
  }

  window.SaveStateFeedback={unsaved,saving,saved,error,clear,state:()=>stateName,refresh:ensure};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(ensure,120),{once:true});
  else setTimeout(ensure,120);
})();
