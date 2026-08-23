'use strict';
(() => {
  const VERSION=1;
  if((window.__profileButtonSessionFixVersion||0)>=VERSION)return;
  window.__profileButtonSessionFixVersion=VERSION;

  function client(){
    try{return typeof cloudClient!=='undefined'?cloudClient:null}catch(e){return null}
  }

  function host(){
    return document.querySelector('.top .topactions') || document.querySelector('.topin') || document.querySelector('.top');
  }

  function ensureButton(){
    const h=host();
    if(!h)return null;
    let b=document.getElementById('profileBrandBtn');
    if(!b){
      b=document.createElement('button');
      b.id='profileBrandBtn';
      b.type='button';
      b.className='btn ghost hidden';
      b.textContent='Profile & Branding';
      const signOut=document.getElementById('signOutBtn');
      if(signOut?.parentElement===h)h.insertBefore(b,signOut);
      else h.appendChild(b);
    }else if(b.parentElement!==h){
      h.appendChild(b);
    }
    b.textContent='Profile & Branding';
    b.onclick=()=>{
      if(window.UserBrandStudio?.open)return window.UserBrandStudio.open();
      if(window.UserBranding?.openProfile)return window.UserBranding.openProfile();
    };
    return b;
  }

  async function sync(){
    const b=ensureButton();
    if(!b)return;
    const c=client();
    if(!c){b.classList.add('hidden');return;}
    try{
      const {data}=await c.auth.getSession();
      const signedIn=!!data?.session?.user;
      b.classList.toggle('hidden',!signedIn);
    }catch(e){
      b.classList.add('hidden');
    }
  }

  function start(){
    ensureButton();
    sync();
    const c=client();
    try{c?.auth?.onAuthStateChange?.(()=>setTimeout(sync,0));}catch(e){}
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#authBtn,#signOutBtn,#loginBtn,#signupBtn,#authSignIn,#authSignUp')){
        setTimeout(sync,150);setTimeout(sync,700);
      }
    },true);
    let tries=0;
    const timer=setInterval(()=>{
      sync();
      if(++tries>30)clearInterval(timer);
    },500);
  }

  window.ProfileButtonSessionFix={sync};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
