'use strict';
(() => {
  const VERSION=2;
  if((window.__reportBuilderV9ControlsVersion||0)>=VERSION)return;
  window.__reportBuilderV9ControlsVersion=VERSION;

  function ensureStyles(){
    let st=document.getElementById('rbV9ControlStyles');
    if(!st){st=document.createElement('style');st.id='rbV9ControlStyles';document.head.appendChild(st);}
    st.textContent=`
      #rbControls .rb-control-grid{grid-template-columns:minmax(220px,.72fr) minmax(0,2.28fr)!important;gap:18px!important}
      #rbControls .rb-sections-panel{min-width:0}
      #rbControls .rb-section-presets{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;padding:0}
      #rbControls .rb-section-presets-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#667085}
      #rbControls .rb-section-preset-actions{display:flex;gap:7px;flex-wrap:wrap}
      #rbControls .rb-section-preset-actions .btn{padding:7px 10px;font-size:9px}
      #rbControls .rb-actions{margin-top:10px!important}
      #rbControls .rb-actions #rbRefresh,#rbControls .rb-actions #rbDownloadPdf{min-width:118px}
      #rbControls .rb-pass2-actions,#rbControls .rb-export-note,#rbControls .rb-pass3-note{display:none!important}
      @media(max-width:900px){#rbControls .rb-section-presets{align-items:flex-start;flex-direction:column}}
    `;
  }

  function apply(){
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    ensureStyles();

    const badge=controls.querySelector('.badge');
    if(badge)badge.textContent='Client Report';

    const grid=controls.querySelector('.rb-control-grid');
    const toggles=controls.querySelector('.rb-toggle-grid');
    const core=document.getElementById('rbSelectCore');
    const all=document.getElementById('rbSelectAll');
    const refresh=document.getElementById('rbRefresh');
    const download=document.getElementById('rbDownloadPdf');
    if(refresh)refresh.textContent='Refresh Preview';

    if(grid&&toggles){
      let panel=controls.querySelector('.rb-sections-panel');
      if(!panel){
        panel=document.createElement('div');
        panel.className='rb-sections-panel';
        toggles.insertAdjacentElement('beforebegin',panel);
        panel.appendChild(toggles);
      }
      let presets=panel.querySelector('.rb-section-presets');
      if(!presets){
        presets=document.createElement('div');
        presets.className='rb-section-presets';
        presets.innerHTML='<span class="rb-section-presets-label">Report detail</span><div class="rb-section-preset-actions"></div>';
        panel.insertBefore(presets,panel.firstChild);
      }
      const presetActions=presets.querySelector('.rb-section-preset-actions');
      if(core&&core.parentElement!==presetActions){core.className='btn secondary';presetActions.appendChild(core);}
      if(all&&all.parentElement!==presetActions){all.className='btn ghost';presetActions.appendChild(all);}
    }

    const mainActions=controls.querySelector('.rb-actions');
    if(mainActions&&download&&download.parentElement!==mainActions){
      download.className='btn primary';
      mainActions.appendChild(download);
    }

    document.getElementById('rbPrintReport')?.remove();
    document.getElementById('rbRefreshExport')?.remove();
    controls.querySelector('.rb-export-note')?.remove();
    controls.querySelector('.rb-pass3-note')?.remove();
    const emptyPass2=controls.querySelector('.rb-pass2-actions');
    if(emptyPass2&&!emptyPass2.children.length)emptyPass2.remove();
    return true;
  }

  function finalizeReport(){
    try{window.ReportBuilderV2?.apply?.();}catch(e){}
    try{window.ReportBuilderV3?.apply?.();}catch(e){}
    try{window.ReportBuilderV4?.apply?.();}catch(e){}
    try{window.ReportBuilderV8?.apply?.();window.ReportBuilderV8Presentation?.apply?.();}catch(e){}
    try{window.ReportAssumptionsNarrative?.apply?.();window.ReportDetailOrder?.apply?.();}catch(e){}
    try{window.ReportSensitivityAnalysis?.apply?.();window.ReportInvestmentOfferAnalysis?.apply?.();}catch(e){}
    try{window.ReportMarketRentSupport?.apply?.();window.ReportMarketRentUnderwriting?.apply?.();}catch(e){}
    try{window.PropertyThesisReportProForma?.apply?.();window.PropertyThesisReportProForma?.injectControls?.();}catch(e){}
    try{window.ReportExecutiveConclusionCurrent?.apply?.();}catch(e){}
    try{window.PropertyThesisMarketRentConclusion?.enhanceReport?.();}catch(e){}
    try{window.UserBranding?.applyReportBranding?.();}catch(e){}
    try{window.PropertyThesisReportBranding?.apply?.();}catch(e){}
    apply();
  }

  function schedule(finalize=false){
    [0,80,220].forEach(ms=>setTimeout(()=>{apply();if(finalize)finalizeReport();},ms));
  }
  document.addEventListener('click',e=>{
    const preset=e.target?.closest?.('#rbSelectCore,#rbSelectAll');
    if(preset){schedule(true);return;}
    if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbDownloadPdf'))schedule(false);
  },true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule(true);},true);

  window.ReportBuilderV9Controls={apply,schedule,finalizeReport};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(false),{once:true});else schedule(false);
})();
