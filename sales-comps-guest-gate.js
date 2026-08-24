'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptSalesCompsGuestGateV||0)>=VERSION)return;
  window.__ptSalesCompsGuestGateV=VERSION;

  function signedIn(){try{return typeof cloudUser!=='undefined'&&!!cloudUser}catch(e){return false}}
  function openAuth(){try{if(typeof showAuth==='function')showAuth()}catch(e){}}

  function ensureStyles(){
    if(document.getElementById('ptSalesCompsGuestGateStyles'))return;
    const s=document.createElement('style');
    s.id='ptSalesCompsGuestGateStyles';
    s.textContent=`.pt-sales-guest-note{margin:0 0 10px;padding:9px 10px;border:1px solid #d7e5f1;border-radius:9px;background:#f7fbff;color:#475467;font-size:9px;line-height:1.5}.pt-sales-guest-note b{color:#175c92}.pt-sales-guest-note button{border:0;background:transparent;color:#175c92;font:inherit;font-weight:800;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}`;
    document.head.appendChild(s);
  }

  function apply(){
    ensureStyles();
    const card=document.querySelector('[data-pt-sales-evidence]');
    if(!card)return false;
    let note=card.querySelector('.pt-sales-guest-note');
    if(!note){
      note=document.createElement('div');
      note.className='pt-sales-guest-note';
      note.innerHTML='<b>Sales comparables require sign-in.</b> <button type="button" data-pt-sales-signin>Sign in</button> to search recent sold properties, review comparable sales, and save selected market evidence.';
      const body=card.querySelector('.pt-se-body');
      if(body)body.insertAdjacentElement('afterbegin',note);else card.appendChild(note);
      note.querySelector('[data-pt-sales-signin]')?.addEventListener('click',openAuth);
    }
    note.hidden=signedIn();
    return true;
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-se-fetch]');
    if(!btn||signedIn())return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openAuth();
  },true);

  function start(){
    [0,150,500,1200,2500].forEach(ms=>setTimeout(apply,ms));
    const root=document.getElementById('assumptions')||document.body;
    new MutationObserver(()=>setTimeout(apply,0)).observe(root,{childList:true,subtree:true});
    document.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.PropertyThesisSalesCompsGuestGate={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
