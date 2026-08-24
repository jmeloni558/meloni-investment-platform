'use strict';
(() => {
  const VERSION=6;
  if((window.__headerCleanupVersion||0)>=VERSION)return;
  window.__headerCleanupVersion=VERSION;

  function signedIn(){
    try{
      const authUser=document.getElementById('authUser');
      const authText=(authUser?.textContent||'').trim().toLowerCase();
      const signOut=document.getElementById('signOutBtn');
      const signOutVisible=!!signOut&&!signOut.classList.contains('hidden')&&!signOut.hidden&&getComputedStyle(signOut).display!=='none';
      if(signOutVisible&&authText&&authText!=='not signed in')return true;
    }catch(e){}
    try{return typeof cloudUser!=='undefined'&&!!cloudUser}catch(e){return false}
  }
  function openAuth(){try{if(typeof showAuth==='function')showAuth()}catch(e){}}

  function ensureGuestVisibilityStyle(){
    let st=document.getElementById('ptGuestSignedInHideStyle');
    if(st)return;
    st=document.createElement('style');
    st.id='ptGuestSignedInHideStyle';
    st.textContent='body.pt-user-signed-in #ptGuestGuidance,body.pt-user-signed-in #ptSampleShowcase{display:none!important;visibility:hidden!important}';
    document.head.appendChild(st);
  }

  function applyGuestVisibility(){
    ensureGuestVisibilityStyle();
    const loggedIn=signedIn();
    document.body.classList.toggle('pt-user-signed-in',loggedIn);
    document.body.classList.toggle('pt-user-signed-out',!loggedIn);
    ['ptGuestGuidance','ptSampleShowcase'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      if(loggedIn){el.hidden=true;el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important');}
      else{el.hidden=false;el.style.removeProperty('display');el.style.removeProperty('visibility');}
    });
  }

  function clean(){
    const actions=document.querySelector('.top .topactions');
    if(actions){
      [...actions.querySelectorAll('.pill')].forEach(el=>{
        const t=(el.textContent||'').trim().toLowerCase();
        if(t==='workbook fidelity model'||t==='guided workflow')el.remove();
      });
    }
    document.getElementById('saveStatus')?.remove();
    document.getElementById('ptGuestPromo')?.remove();
    applyGuestVisibility();
    applyRentCompGuidance();
    return true;
  }

  function applyRentCompGuidance(){
    const guest=!signedIn();
    document.querySelectorAll('button').forEach(btn=>{
      const text=(btn.textContent||'').trim().toLowerCase();
      if(text!=='research market rent')return;
      const host=btn.closest('.ptr-actions')||btn.parentElement;
      if(!host)return;
      let note=host.parentElement?.querySelector(':scope > .pt-rent-login-guidance');
      if(!note){
        note=document.createElement('div');
        note.className='pt-rent-login-guidance';
        note.style.cssText='margin:10px 0 0;padding:9px 11px;border:1px solid #d7e5f1;border-radius:9px;background:#f7fbff;color:#475467;font-size:10px;line-height:1.45';
        note.innerHTML='<strong style="color:#175c92">Rental comparables require sign-in.</strong> Sign in to search current rent data, review rental comps, and save market-rent support.';
        host.insertAdjacentElement('afterend',note);
      }
      note.hidden=!guest;
      btn.dataset.ptRentGuestGate=guest?'1':'0';
    });
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn)return;
    const text=(btn.textContent||'').trim().toLowerCase();
    if(text==='research market rent'&&!signedIn()){
      e.preventDefault();e.stopImmediatePropagation();
      openAuth();
    }
  },true);

  function start(){
    clean();
    let tries=0;
    const timer=setInterval(()=>{
      clean();
      if(++tries>160)clearInterval(timer);
    },250);
    document.addEventListener('click',()=>setTimeout(clean,0));
    setTimeout(clean,700);
    setTimeout(clean,1800);
    setTimeout(clean,3500);
  }

  window.HeaderCleanup={clean};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
