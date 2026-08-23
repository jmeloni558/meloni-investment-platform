'use strict';
(()=>{
  const VERSION=1;
  if((window.__protectedPdfExportControllerVersion||0)>=VERSION)return;
  window.__protectedPdfExportControllerVersion=VERSION;
  let busy=false;

  function status(msg){try{if(typeof setStatus==='function')setStatus(msg);}catch(_e){}}

  async function run(btn){
    if(busy)return;
    busy=true;
    const originalText=btn?.textContent||'Download PDF';
    try{
      if(btn){btn.disabled=true;btn.textContent='Verifying protected calculations...';}
      const gate=window.PropertyThesisReportEngineGate;
      if(!gate?.ensureProtected)throw new Error('Protected report engine verification is unavailable.');
      await gate.ensureProtected();
      if(btn)btn.textContent='Generating PDF...';
      const pdf=window.UserBrandedPdf;
      if(!pdf?.generate)throw new Error('PDF generator is unavailable.');
      await pdf.generate();
    }catch(e){
      const msg=String(e?.message||e);
      console.error(e);
      status('PDF export stopped: '+msg);
      alert('PDF export was stopped because protected calculations could not be verified. '+msg);
    }finally{
      busy=false;
      if(btn){btn.disabled=false;btn.textContent=originalText;}
    }
  }

  window.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#rbDownloadPdf');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    run(btn);
  },true);

  window.PropertyThesisProtectedPdfExport={version:VERSION,run,status:()=>({busy})};
})();
