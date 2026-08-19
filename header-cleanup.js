'use strict';
(() => {
  const VERSION=1;
  if((window.__headerCleanupVersion||0)>=VERSION)return;
  window.__headerCleanupVersion=VERSION;

  function clean(){
    const actions=document.querySelector('.top .topactions');
    if(!actions)return false;
    [...actions.querySelectorAll('.pill')].forEach(el=>{
      const t=(el.textContent||'').trim().toLowerCase();
      if(t==='workbook fidelity model'||t==='guided workflow')el.remove();
    });
    document.getElementById('saveStatus')?.remove();
    return true;
  }

  function start(){
    clean();
    let tries=0;
    const timer=setInterval(()=>{
      clean();
      if(++tries>20)clearInterval(timer);
    },250);
  }

  window.HeaderCleanup={clean};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
