'use strict';
(()=>{
  const VERSION=1;
  if((window.__reportIntegrityGuardVersion||0)>=VERSION)return;
  window.__reportIntegrityGuardVersion=VERSION;

  let dirty=false;
  let lastSignature='';
  let observer=null;

  function stateSignature(){
    try{
      const s=typeof state!=='undefined'?state:null;
      if(!s)return '';
      const keys=['name','address','price','land','units','rent','rentGrowth','vacancy','opEx','mortgage','mortRate','loanYears','interestOnly','points','origFee','ordinaryRate','depTaxRate','depLife','appreciation','hold','sellCost','desiredCap','desiredGrm','requiredReturn'];
      return JSON.stringify(keys.map(k=>s[k]));
    }catch(_e){return '';}
  }

  function ensureStyles(){
    let st=document.getElementById('reportIntegrityGuardStyles');
    if(!st){st=document.createElement('style');st.id='reportIntegrityGuardStyles';document.head.appendChild(st);}
    st.textContent=`
      #stage5ReportControls{display:none!important}
      #pdfReportBtn{display:none!important}
      #rbReportFreshness{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding:6px 9px;border-radius:999px;font-size:9px;font-weight:800;border:1px solid #cfe4d7;background:#f2faf5;color:#17663e;white-space:nowrap}
      #rbReportFreshness.stale{border-color:#f3d3a6;background:#fff8ee;color:#9a5b13}
      #rbReportFreshness .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
      @media(max-width:700px){#rbReportFreshness{margin-left:0}}
    `;
  }

  function removeLegacyReportUi(){
    document.getElementById('stage5ReportControls')?.remove();
    document.getElementById('pdfReportBtn')?.remove();
    const oldPrint=document.getElementById('printReportBtn');if(oldPrint)oldPrint.style.display='none';
    const oldRefresh=document.getElementById('refreshReportBtn');if(oldRefresh)oldRefresh.style.display='none';
  }

  function ensureFreshness(){
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    let badge=document.getElementById('rbReportFreshness');
    if(!badge){
      badge=document.createElement('span');
      badge.id='rbReportFreshness';
      badge.innerHTML='<span class="dot"></span><span class="text">Report current</span>';
      const head=controls.querySelector('.sectionhead');
      head?.appendChild(badge);
    }
    updateFreshness();
    return true;
  }

  function updateFreshness(){
    const badge=document.getElementById('rbReportFreshness');
    if(!badge)return;
    badge.classList.toggle('stale',dirty);
    const txt=badge.querySelector('.text');
    if(txt)txt.textContent=dirty?'Report needs refresh':'Report current';
    badge.title=dirty?'Assumptions have changed since the report was last refreshed.':'The report reflects the current analyzed assumptions.';
  }

  function markDirty(){dirty=true;updateFreshness();}
  function markCurrent(){dirty=false;lastSignature=stateSignature();updateFreshness();}

  function refreshCurrentReport(){
    try{if(typeof readFields==='function')readFields();}catch(_e){}
    try{if(typeof analyze==='function'&&typeof state!=='undefined')result=analyze(state);}catch(_e){}
    try{window.ReportBuilderV1?.render?.();}catch(_e){}
    try{window.ReportBuilderV8Presentation?.apply?.();}catch(_e){}
    try{window.ReportAssumptionsNarrative?.apply?.();}catch(_e){}
    try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){}
    try{window.ReportDetailOrder?.apply?.();}catch(_e){}
    try{window.ReportBuilderV9Controls?.apply?.();}catch(_e){}
    setTimeout(()=>{try{window.ReportSensitivityAnalysis?.apply?.();}catch(_e){} markCurrent();},80);
    return true;
  }

  function goToReport(){
    try{
      if(window.WorkflowNavigationController?.go)window.WorkflowNavigationController.go('report');
      else if(typeof switchTab==='function')switchTab('report');
    }catch(_e){}
  }

  function downloadCurrentReport(){
    goToReport();
    refreshCurrentReport();
    setTimeout(()=>{
      const btn=document.getElementById('rbDownloadPdf');
      if(btn){btn.click();markCurrent();}
      else if(typeof setStatus==='function')setStatus('Open Client Report and use Download PDF.');
    },140);
  }

  function routeLegacyActions(){
    const cloudPdf=document.getElementById('cloudPdf');
    if(cloudPdf&&!cloudPdf.dataset.currentReportRouted){
      cloudPdf.dataset.currentReportRouted='1';
      cloudPdf.textContent='Download Client Report PDF';
      cloudPdf.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();downloadCurrentReport();},true);
    }
  }

  function detectStateDrift(){
    const sig=stateSignature();
    if(lastSignature&&sig&&sig!==lastSignature)markDirty();
  }

  function apply(){
    ensureStyles();
    removeLegacyReportUi();
    routeLegacyActions();
    ensureFreshness();
    detectStateDrift();
    return true;
  }

  document.addEventListener('input',e=>{
    if(e.target?.closest?.('#assumptions')||e.target?.matches?.('#quickPrice,#quickRent,#propertyName'))markDirty();
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.closest?.('#assumptions')||e.target?.matches?.('#quickPrice,#quickRent,#propertyName'))markDirty();
  },true);
  document.addEventListener('click',e=>{
    const t=e.target;
    if(t?.closest?.('#rbRefresh'))setTimeout(()=>{refreshCurrentReport();},0);
    if(t?.closest?.('[data-s8-tab="report"],[data-tab="report"]'))setTimeout(()=>{refreshCurrentReport();apply();},60);
    if(t?.closest?.('#calculateBtn,#quickCalc,#set80Ltv,#setCash,#loadBtn,#loadNamedBtn,#loadCloudAnalysis'))setTimeout(()=>{detectStateDrift();},100);
  },true);

  function boot(){
    apply();
    refreshCurrentReport();
    let tries=0;const timer=setInterval(()=>{apply();if(++tries>30)clearInterval(timer)},250);
    const body=document.body;
    if(body&&window.MutationObserver){
      observer=new MutationObserver(()=>{removeLegacyReportUi();routeLegacyActions();ensureFreshness();});
      observer.observe(body,{childList:true,subtree:true});
    }
  }

  window.ReportIntegrityGuard={apply,refresh:refreshCurrentReport,download:downloadCurrentReport,markDirty,markCurrent};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
