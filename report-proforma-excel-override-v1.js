'use strict';
(()=>{
  const VERSION=1;
  if((window.__reportProFormaExcelOverrideV||0)>=VERSION)return;
  window.__reportProFormaExcelOverrideV=VERSION;

  function force(){
    const btn=document.getElementById('rbDownloadProForma')||document.getElementById('rbProFormaJump');
    if(!btn)return false;
    btn.id='rbDownloadProForma';
    btn.type='button';
    btn.className='btn secondary';
    btn.textContent='Download Pro Forma Excel';
    btn.onclick=e=>{
      try{e?.preventDefault?.();e?.stopPropagation?.();}catch(_e){}
      try{
        if(window.ReportProFormaRestore?.downloadExcel){
          window.ReportProFormaRestore.downloadExcel();
        }else{
          alert('Pro forma export is still loading. Please click Refresh Preview, then try again.');
        }
      }catch(err){
        console.error('Pro forma export failed',err);
        alert('Unable to export the pro forma. Please refresh and try again.');
      }
      return false;
    };
    return true;
  }

  function schedule(){[0,50,120,250,500,900,1500,2500].forEach(ms=>setTimeout(force,ms));}
  function watch(){try{new MutationObserver(()=>force()).observe(document.body,{childList:true,subtree:true});}catch(e){}let n=0;const t=setInterval(()=>{force();if(++n>240)clearInterval(t);},125);}

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#rbDownloadProForma,#rbProFormaJump');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    force();
    btn.click();
  },true);

  window.ReportProFormaExcelOverride={force,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{schedule();watch();},{once:true});else{schedule();watch();}
})();
