'use strict';
(()=>{
  const VERSION=1;
  if((window.__stage5PdfNeutralizerVersion||0)>=VERSION)return;
  window.__stage5PdfNeutralizerVersion=VERSION;

  async function generateCurrentPdf(){
    try{
      if(window.UserBrandedPdf?.generate){
        await window.UserBrandedPdf.generate();
        return true;
      }
      if(typeof setStatus==='function')setStatus('Current branded PDF engine is unavailable. Reload PropertyThesis and try again.');
      return false;
    }catch(err){
      console.error(err);
      if(typeof setStatus==='function')setStatus(err?.message||'Unable to generate PDF');
      return false;
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#s5_pdf');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    generateCurrentPdf();
  },true);

  window.Stage5PdfNeutralizer={generateCurrentPdf};
})();
