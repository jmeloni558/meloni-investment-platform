'use strict';
(() => {
  const VERSION=2;
  if((window.__reportBuilderV4Version||0)>=VERSION)return;
  window.__reportBuilderV4Version=VERSION;

  function setMessage(msg){
    if(typeof setStatus==='function')setStatus(msg);
    const btn=document.getElementById('rbDownloadPdf');
    if(btn)btn.dataset.status=msg;
  }

  async function generatePdf(){
    try{
      if(window.UserBrandedPdf?.generate){
        await window.UserBrandedPdf.generate();
        return true;
      }
      setMessage('Current branded PDF engine is unavailable. Reload PropertyThesis and try again.');
      return false;
    }catch(err){
      console.error(err);
      setMessage(err?.message||'Unable to generate PDF');
      return false;
    }
  }

  function addControls(){
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    const badge=controls.querySelector('.badge');
    if(badge)badge.textContent='Page 3 • PDF Export';
    if(document.getElementById('rbDownloadPdf'))return true;
    const pass2=document.querySelector('#rbControls .rb-pass2-actions');
    const host=pass2||controls.querySelector('.rb-actions')||controls;
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='rbDownloadPdf';
    btn.className='btn primary';
    btn.textContent='Download PDF';
    if(pass2)pass2.prepend(btn);else host.appendChild(btn);
    btn.addEventListener('click',generatePdf);
    const note=controls.querySelector('.rb-export-note');
    if(note)note.textContent='Download PDF creates the current branded client report. Print / Save PDF remains available as a browser-print fallback.';
    return true;
  }

  function apply(){addControls();return true;}
  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="report"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReportBuilderV4={apply,generatePdf};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
