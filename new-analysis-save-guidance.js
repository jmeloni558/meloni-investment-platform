'use strict';
(()=>{
  const VERSION=2;
  if((window.__newAnalysisSaveGuidanceVersion||0)>=VERSION)return;
  window.__newAnalysisSaveGuidanceVersion=VERSION;

  function isUnsavedNew(){
    try{return !!(cloudUser&&selectedPropertyId&&!selectedAnalysisId);}catch(_e){return false;}
  }

  function propertyLabel(){
    try{
      const p=(cloudProperties||[]).find(x=>x.id===selectedPropertyId);
      return p?.name||p?.address||state?.address||'this property';
    }catch(_e){return 'this property';}
  }

  function ensureStyle(){
    if(document.getElementById('ptUnsavedNewStyle'))return;
    const s=document.createElement('style');s.id='ptUnsavedNewStyle';s.textContent=`
      .pt-unsaved-new{border:1px solid #e6b85c;background:#fff8e8;border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 14px}
      .pt-unsaved-new strong{display:block;color:#7a4b00;font-size:13px}.pt-unsaved-new span{display:block;color:#745d35;font-size:10px;margin-top:4px;line-height:1.5}.pt-unsaved-new .btn{white-space:nowrap}
      #guidedSetup>.pt-unsaved-new{margin:0 0 14px}
      @media(max-width:720px){.pt-unsaved-new{display:block}.pt-unsaved-new .btn{margin-top:10px;width:100%}}
    `;document.head.appendChild(s);
  }

  function removeBanners(){document.querySelectorAll('.pt-unsaved-new').forEach(x=>x.remove());}

  function makeBanner(){
    const label=propertyLabel();
    const d=document.createElement('div');d.className='pt-unsaved-new screen-only';
    d.innerHTML=`<div><strong>Unsaved new analysis for ${label}</strong><span>Calculate only updates the results. To keep this as a separate analysis under the saved property, click <b>Save New Analysis to This Property</b> before leaving.</span></div><button type="button" class="btn primary" data-pt-save-new>Save New Analysis to This Property</button>`;
    d.querySelector('[data-pt-save-new]').onclick=async()=>{
      const b=d.querySelector('[data-pt-save-new]');
      b.disabled=true;b.textContent='Saving…';
      try{if(typeof saveCurrentCloud==='function')await saveCurrentCloud(false);}catch(e){try{setStatus('Cloud save failed: '+e.message);}catch(_e){}}
      if(isUnsavedNew()){b.disabled=false;b.textContent='Save New Analysis to This Property';}
      else removeBanners();
    };
    return d;
  }

  function renderGuidance(){
    ensureStyle();removeBanners();
    const cloudBtn=document.getElementById('cloudSaveCurrent');
    if(cloudBtn)cloudBtn.textContent=isUnsavedNew()?'Save New Analysis to This Property':'Save Current Analysis to Cloud';
    if(!isUnsavedNew())return;

    const guided=document.getElementById('guidedSetup');
    if(guided){guided.prepend(makeBanner());}
    else{
      const ass=document.querySelector('#assumptions > .grid');
      if(ass){const b=makeBanner();b.classList.add('span-12');ass.prepend(b);}
    }
    const dash=document.querySelector('#dashboard > .grid');
    if(dash){const b=makeBanner();b.classList.add('span-12');dash.prepend(b);}
  }

  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('#calculateBtn,#quickCalc,#gwNext,.tab,#cloudSaveCurrent,[data-pt-save-new]');
    if(!t)return;
    setTimeout(renderGuidance,120);
  },true);

  window.NewAnalysisSaveGuidance={refresh:renderGuidance};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderGuidance,150),{once:true});
  else setTimeout(renderGuidance,150);
})();