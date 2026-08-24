'use strict';
(()=>{
  const VERSION=2;
  window.__reportProFormaExcelOverrideV=VERSION;
  function clickExport(e){
    try{e?.preventDefault?.();e?.stopImmediatePropagation?.();}catch(_e){}
    if(window.PropertyThesisProFormaExcelFinal?.downloadExcel){
      window.PropertyThesisProFormaExcelFinal.downloadExcel();
      return false;
    }
    if(window.ReportProFormaRestore?.downloadExcel){
      window.ReportProFormaRestore.downloadExcel();
      return false;
    }
    alert('Run the analysis before exporting the pro forma workbook.');
    return false;
  }
  function force(){
    const btn=document.getElementById('rbDownloadProForma')||document.getElementById('rbProFormaJump');
    if(!btn)return false;
    btn.id='rbDownloadProForma';
    btn.type='button';
    btn.className='btn secondary';
    btn.textContent='Download Pro Forma Excel';
    btn.onclick=clickExport;
    return true;
  }
  function schedule(){[0,80,200,500,1000,2000].forEach(ms=>setTimeout(force,ms));}
  document.addEventListener('click',e=>{
    if(!e.target?.closest?.('#rbDownloadProForma,#rbProFormaJump'))return;
    clickExport(e);
  },true);
  window.ReportProFormaExcelOverride={force,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();