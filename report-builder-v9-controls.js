'use strict';
(() => {
  const VERSION=8;
  if((window.__reportBuilderV9ControlsVersion||0)>=VERSION)return;
  window.__reportBuilderV9ControlsVersion=VERSION;

  function ensureStyles(){
    let st=document.getElementById('rbV9ControlStyles');
    if(!st){st=document.createElement('style');st.id='rbV9ControlStyles';document.head.appendChild(st);}
    st.textContent=`
      #rbControls{border:1px solid #cbd8e5!important;border-radius:14px!important;background:#fff!important;box-shadow:0 8px 24px rgba(29,57,84,.08)!important;overflow:hidden!important;padding:0!important;margin-bottom:22px!important}
      #rbControls>.sectionhead{margin:0!important;padding:15px 18px!important;background:linear-gradient(180deg,#f7fbff 0%,#f2f7fb 100%)!important;border-bottom:1px solid #d7e3ed!important;align-items:center!important}
      #rbControls>.sectionhead h2{font-size:17px!important;color:#173f66!important;margin:0 0 3px!important}
      #rbControls>.sectionhead p{font-size:10px!important;line-height:1.45!important;color:#667085!important;margin:0!important}
      #rbControls>.sectionhead .badge{background:#e7f1fa!important;border-color:#bfd3e5!important;color:#174f83!important;font-weight:850!important}
      #rbControls .rb-control-grid{display:grid!important;grid-template-columns:minmax(230px,.78fr) minmax(0,2.22fr)!important;gap:14px!important;padding:14px 16px 0!important;align-items:stretch!important}
      #rbControls .rb-work-zone{border:1px solid #dce5ed;border-radius:11px;background:#fbfcfe;padding:12px;min-width:0}
      #rbControls .rb-zone-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid #e7edf2}
      #rbControls .rb-zone-title{font-size:10px;font-weight:900;letter-spacing:.065em;text-transform:uppercase;color:#174f83}
      #rbControls .rb-zone-help{display:block;margin-top:2px;font-size:9px;line-height:1.35;color:#7a8699;font-weight:500;text-transform:none;letter-spacing:0}
      #rbControls .rb-recipient-panel .field{margin:0!important}
      #rbControls .rb-recipient-panel label{font-size:9px!important;font-weight:800!important;color:#475467!important}
      #rbControls .rb-recipient-panel input{margin-top:5px!important;background:#fff!important;border:1px solid #cfd9e3!important;border-radius:8px!important;min-height:38px!important}
      #rbControls .rb-sections-panel{min-width:0}
      #rbControls .rb-section-presets{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;padding:0}
      #rbControls .rb-section-presets-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#667085}
      #rbControls .rb-section-preset-actions{display:flex;gap:7px;flex-wrap:wrap}
      #rbControls .rb-section-preset-actions .btn{padding:7px 10px!important;font-size:9px!important;border-radius:7px!important}
      #rbControls #rbSelectCore{background:#eef5fb!important;border-color:#bdd1e2!important;color:#174f83!important;font-weight:800!important}
      #rbControls #rbSelectAll{background:#fff!important;border-color:#d5dee7!important;color:#475467!important}
      #rbControls .rb-toggle-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
      #rbControls .rb-toggle{min-height:36px!important;padding:7px 8px!important;border:1px solid #e0e6ed!important;border-radius:7px!important;background:#fff!important;font-size:9px!important;line-height:1.28!important;color:#475467!important;align-items:flex-start!important;transition:.15s ease!important}
      #rbControls .rb-toggle:hover{border-color:#b9ccdc!important;background:#f7fbff!important}
      #rbControls .rb-toggle:has(input:checked){border-color:#b8cfe2!important;background:#f2f8fd!important;color:#264b69!important}
      #rbControls .rb-toggle input{margin-top:1px!important;accent-color:#17689f}
      #rbControls .rb-export-panel{margin:14px 16px 16px!important;border:1px solid #cbdbe8!important;border-radius:11px!important;background:linear-gradient(180deg,#f7fbfe,#f3f8fc)!important;padding:12px!important}
      #rbControls .rb-export-panel .rb-zone-head{margin-bottom:10px!important}
      #rbControls .rb-actions{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;margin:0!important}
      #rbControls .rb-actions .btn{min-height:38px!important;padding:9px 14px!important;border-radius:8px!important;font-size:10px!important;font-weight:800!important}
      #rbControls .rb-actions #rbRefresh{background:#fff!important;border:1px solid #b8c9d8!important;color:#36566f!important;min-width:128px!important}
      #rbControls .rb-actions #rbDownloadPdf{background:#17689f!important;border-color:#17689f!important;color:#fff!important;min-width:138px!important;box-shadow:0 3px 8px rgba(23,104,159,.18)!important}
      #rbControls .rb-actions #rbDownloadProForma{background:#fff!important;border:1px solid #8eb5cf!important;color:#175f8e!important;min-width:170px!important}
      #rbControls .rb-pass2-actions,#rbControls .rb-export-note,#rbControls .rb-pass3-note{display:none!important}
      @media(max-width:980px){#rbControls .rb-control-grid{grid-template-columns:1fr!important}#rbControls .rb-toggle-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:650px){#rbControls .rb-toggle-grid{grid-template-columns:1fr!important}#rbControls .rb-section-presets{align-items:flex-start;flex-direction:column}#rbControls .rb-actions{display:grid!important;grid-template-columns:1fr!important}#rbControls .rb-actions .btn{width:100%!important}}
    `;
  }

  function zoneHead(title,help){
    const el=document.createElement('div');
    el.className='rb-zone-head';
    el.innerHTML=`<div><span class="rb-zone-title">${title}</span><span class="rb-zone-help">${help}</span></div>`;
    return el;
  }

  function ensureProFormaButton(){
    let btn=document.getElementById('rbDownloadProForma');
    if(!btn){
      btn=document.createElement('button');
      btn.id='rbDownloadProForma';
      btn.type='button';
      btn.className='btn secondary';
    }
    btn.textContent='Download Pro Forma';
    btn.disabled=false;
    btn.removeAttribute('aria-hidden');
    btn.style.display='';
    btn.onclick=async e=>{
      try{e?.preventDefault?.();e?.stopPropagation?.();}catch(_e){}
      try{
        let exporter=window.PropertyThesisProFormaDownload;
        if(!exporter?.download){
          await new Promise((resolve,reject)=>{
            const existing=document.querySelector('script[data-pt-proforma-exporter]');
            if(existing){
              existing.addEventListener('load',resolve,{once:true});
              existing.addEventListener('error',()=>reject(new Error('The pro forma exporter could not be loaded.')),{once:true});
              setTimeout(resolve,1200);
              return;
            }
            const script=document.createElement('script');
            script.src='report-proforma-download-controller-v1.js?direct='+Date.now();
            script.async=false;
            script.dataset.ptProformaExporter='1';
            script.onload=resolve;
            script.onerror=()=>reject(new Error('The pro forma exporter could not be loaded.'));
            document.head.appendChild(script);
          });
          exporter=window.PropertyThesisProFormaDownload;
        }
        if(!exporter?.download) throw new Error('The pro forma exporter did not initialize.');
        await exporter.download();
      }catch(err){
        console.error('PropertyThesis pro forma export launch failed',err);
        alert(err?.message||'Unable to export the pro forma workbook.');
      }
      return false;
    };
    return btn;
  }

  function apply(){
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    ensureStyles();

    const head=controls.querySelector(':scope > .sectionhead');
    const h2=head?.querySelector('h2');
    const hp=head?.querySelector('p');
    const badge=head?.querySelector('.badge');
    if(h2)h2.textContent='Client Report Builder';
    if(hp)hp.textContent='Set the recipient and report detail, preview the finished analysis, then export the client deliverables.';
    if(badge)badge.textContent='Step 3 • Client Report';

    const grid=controls.querySelector('.rb-control-grid');
    const toggles=controls.querySelector('.rb-toggle-grid');
    const core=document.getElementById('rbSelectCore');
    const all=document.getElementById('rbSelectAll');
    const refresh=document.getElementById('rbRefresh');
    const download=document.getElementById('rbDownloadPdf');
    const proforma=ensureProFormaButton();
    if(refresh)refresh.textContent='Refresh Preview';

    if(grid){
      let recipient=grid.querySelector('.rb-recipient-panel');
      const first=grid.firstElementChild;
      if(!recipient&&first){
        recipient=first;
        recipient.classList.add('rb-work-zone','rb-recipient-panel');
        if(!recipient.querySelector('.rb-zone-head'))recipient.insertBefore(zoneHead('1 · Recipient','Optional client name shown on the finished report.'),recipient.firstChild);
      }

      if(toggles){
        let panel=controls.querySelector('.rb-sections-panel');
        if(!panel){
          panel=document.createElement('div');
          panel.className='rb-sections-panel';
          toggles.insertAdjacentElement('beforebegin',panel);
          panel.appendChild(toggles);
        }
        panel.classList.add('rb-work-zone');
        if(!panel.querySelector(':scope > .rb-zone-head'))panel.insertBefore(zoneHead('2 · Report Detail','Choose the level of detail included in the client-facing report.'),panel.firstChild);
        let presets=panel.querySelector('.rb-section-presets');
        if(!presets){
          presets=document.createElement('div');
          presets.className='rb-section-presets';
          presets.innerHTML='<span class="rb-section-presets-label">Quick presets</span><div class="rb-section-preset-actions"></div>';
          const zhead=panel.querySelector(':scope > .rb-zone-head');
          zhead?.insertAdjacentElement('afterend',presets);
        }else{
          const lbl=presets.querySelector('.rb-section-presets-label');if(lbl)lbl.textContent='Quick presets';
        }
        const presetActions=presets.querySelector('.rb-section-preset-actions');
        if(core&&core.parentElement!==presetActions){core.className='btn secondary';presetActions.appendChild(core);}
        if(all&&all.parentElement!==presetActions){all.className='btn ghost';presetActions.appendChild(all);}
      }
    }

    let mainActions=controls.querySelector('.rb-actions');
    if(mainActions){
      let exportPanel=controls.querySelector('.rb-export-panel');
      if(!exportPanel){
        exportPanel=document.createElement('div');
        exportPanel.className='rb-export-panel';
        exportPanel.appendChild(zoneHead('3 · Preview & Export','Refresh the on-screen report, then download the client PDF or the branded Excel pro forma.'));
        controls.appendChild(exportPanel);
      }
      if(mainActions.parentElement!==exportPanel)exportPanel.appendChild(mainActions);
      if(refresh&&refresh.parentElement!==mainActions)mainActions.appendChild(refresh);
      if(download&&download.parentElement!==mainActions){download.className='btn primary';mainActions.appendChild(download);}
      if(proforma&&proforma.parentElement!==mainActions)mainActions.appendChild(proforma);
    }

    document.getElementById('rbPrintReport')?.remove();
    document.getElementById('rbRefreshExport')?.remove();
    document.getElementById('rbProFormaJump')?.remove();
    document.getElementById('rbExcelWorkbookExportFinal')?.remove();
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
    try{window.ReportExecutiveConclusionCurrent?.apply?.();}catch(e){}
    try{window.PropertyThesisMarketRentConclusion?.enhanceReport?.();}catch(e){}
    try{window.UserBranding?.applyReportBranding?.();}catch(e){}
    try{window.PropertyThesisReportBranding?.apply?.();}catch(e){}
    apply();
  }

  function schedule(finalize=false){
    const times=finalize?[120,320,650]:[0,80,220,650,1200];
    times.forEach(ms=>setTimeout(()=>{apply();if(finalize)finalizeReport();},ms));
  }

  document.addEventListener('click',e=>{
    const preset=e.target?.closest?.('#rbSelectCore,#rbSelectAll');
    if(preset){
      setTimeout(()=>{try{window.ReportBuilderV1?.renderReport?.();}catch(_e){}},60);
      schedule(true);
      return;
    }
    if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbDownloadPdf,#rbDownloadProForma'))schedule(false);
  },true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule(true);},true);

  window.ReportBuilderV9Controls={version:VERSION,apply,schedule,finalizeReport,ensureProFormaButton};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(false),{once:true});else schedule(false);
})();
