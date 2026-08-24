'use strict';
(() => {
  const VERSION=2;
  if((window.__headerCleanupVersion||0)>=VERSION)return;
  window.__headerCleanupVersion=VERSION;

  function signedIn(){try{return typeof cloudUser!=='undefined'&&!!cloudUser}catch(e){return false}}

  function clean(){
    const actions=document.querySelector('.top .topactions');
    if(actions){
      [...actions.querySelectorAll('.pill')].forEach(el=>{
        const t=(el.textContent||'').trim().toLowerCase();
        if(t==='workbook fidelity model'||t==='guided workflow')el.remove();
      });
    }
    document.getElementById('saveStatus')?.remove();
    refreshReportGuestNote();
    return !!actions;
  }

  function refreshReportGuestNote(){
    const report=document.getElementById('report');
    if(!report)return false;
    let note=document.getElementById('ptReportGuestNote');
    if(!note){
      note=document.createElement('div');
      note.id='ptReportGuestNote';
      note.className='screen-only';
      note.style.cssText='margin:0 0 14px;padding:11px 13px;border:1px solid #d7e5f1;border-radius:9px;background:#f7fbff;color:#344054;font-size:12px;line-height:1.45';
      note.innerHTML='<strong style="color:#175c92">Client reports are available after sign-in.</strong> <button type="button" id="ptReportGuestSignIn" style="border:0;background:transparent;color:#175c92;font:inherit;font-weight:800;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px">Sign in</button> to generate, preview, print, or download a PropertyThesis report.';
      report.insertAdjacentElement('afterbegin',note);
      note.querySelector('#ptReportGuestSignIn')?.addEventListener('click',()=>{try{if(typeof showAuth==='function')showAuth()}catch(e){}});
    }
    note.hidden=signedIn();
    return true;
  }

  function isReportAction(target){
    const el=target?.closest?.('#report button,#clientReport button,[data-hub-report]');
    if(!el)return false;
    if(el.id==='ptReportGuestSignIn')return false;
    if(el.matches('[data-hub-report]'))return true;
    const t=(el.textContent||el.getAttribute('aria-label')||el.title||'').toLowerCase();
    return /report|pdf|print|download|preview|generate/.test(t);
  }

  function gateReportAction(e){
    if(signedIn()||!isReportAction(e.target))return;
    e.preventDefault();e.stopImmediatePropagation();
    try{if(typeof setStatus==='function')setStatus('Sign in to generate PropertyThesis client reports.')}catch(_e){}
    try{if(typeof showAuth==='function')showAuth()}catch(_e){}
  }

  function start(){
    clean();
    let tries=0;
    const timer=setInterval(()=>{
      clean();
      if(++tries>20)clearInterval(timer);
    },250);
    document.addEventListener('click',gateReportAction,true);
    document.addEventListener('click',()=>setTimeout(refreshReportGuestNote,0));
    setTimeout(refreshReportGuestNote,800);
    setTimeout(refreshReportGuestNote,1800);
  }

  window.HeaderCleanup={clean,refreshReportGuestNote};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
