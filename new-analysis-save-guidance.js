'use strict';
(()=>{
  const VERSION=1;
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
      .pt-unsaved-new{border:1px solid #e6b85c;background:#fff8e8;border-radius:12px;padding:13px 15px;display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}
      .pt-unsaved-new strong{display:block;color:#7a4b00;font-size:13px}.pt-unsaved-new span{display:block;color:#745d35;font-size:10px;margin-top:3px;line-height:1.45}.pt-unsaved-new .btn{white-space:nowrap}
      @media(max-width:720px){.pt-unsaved-new{display:block}.pt-unsaved-new .btn{margin-top:10px;width:100%}}
    `;document.head.appendChild(s);
  }

  function removeBanners(){document.querySelectorAll('.pt-unsaved-new').forEach(x=>x.remove());}

  function makeBanner(){
    const d=document.createElement('div');d.className='pt-unsaved-new screen-only';
    d.innerHTML=`<div><strong>New analysis is not saved yet</strong><span>Calculating updates the results only. Save this analysis before leaving or it can be lost.</span></div><button type="button" class="btn primary" data-pt-save-new>Save New Analysis</button>`;
    d.querySelector('[data-pt-save-new]').onclick=async()=>{
      const b=d.querySelector('[data-pt-save-new]');
      b.disabled=true;b.textContent='Saving…';
      try{
        if(typeof saveCurrentCloud==='function')await saveCurrentCloud(false);
      }catch(e){try{setStatus('Cloud save failed: '+e.message);}catch(_e){}}
      if(isUnsavedNew()){b.disabled=false;b.textContent='Save New Analysis';}
      else removeBanners();
    };
    return d;
  }

  function renderGuidance(){
    ensureStyle();removeBanners();
    const cloudBtn=document.getElementById('cloudSaveCurrent');
    if(cloudBtn)cloudBtn.textContent=isUnsavedNew()?'Save New Analysis to This Property':'Save Current Analysis to Cloud';
    if(!isUnsavedNew())return;

    const dash=document.querySelector('#dashboard > .grid');
    if(dash){const b=makeBanner();b.classList.add('span-12');dash.prepend(b);}
    const ass=document.querySelector('#assumptions > .grid');
    if(ass){const b=makeBanner();b.classList.add('span-12');ass.prepend(b);}
  }

  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('#calculateBtn,#quickCalc,#gwNext,.tab,[data-pt-new],#cloudSaveCurrent');
    if(!t)return;
    setTimeout(renderGuidance,120);
  },true);

  window.NewAnalysisSaveGuidance={refresh:renderGuidance};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderGuidance,150),{once:true});
  else setTimeout(renderGuidance,150);
})();
