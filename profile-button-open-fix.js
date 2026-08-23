'use strict';
(() => {
  const VERSION=1;
  if((window.__profileButtonOpenFixVersion||0)>=VERSION)return;
  window.__profileButtonOpenFixVersion=VERSION;

  function client(){
    try{return typeof cloudClient!=='undefined'?cloudClient:null}catch(e){return null}
  }

  async function openProfileStudio(){
    const c=client();
    if(!c){
      try{showAuth()}catch(e){}
      return;
    }
    try{
      const {data,error}=await c.auth.getSession();
      if(error)throw error;
      const session=data?.session;
      if(!session?.user){
        try{showAuth()}catch(e){}
        return;
      }

      try{
        if(typeof setCloudUser==='function' && (!cloudUser || cloudUser.id!==session.user.id)){
          await setCloudUser(session.user);
        }else{
          cloudUser=session.user;
        }
      }catch(e){
        try{cloudUser=session.user}catch(_e){}
      }

      if(window.UserBrandStudio?.open){
        window.UserBrandStudio.open();
        return;
      }
      if(window.UserBranding?.openProfile){
        window.UserBranding.openProfile();
        return;
      }
      const modal=document.getElementById('profileBrandModal');
      if(modal)modal.classList.remove('hidden');
    }catch(err){
      console.error('Unable to open Profile & Branding',err);
      try{setStatus('Unable to open Profile & Branding: '+(err?.message||err))}catch(e){}
    }
  }

  function captureProfileClick(e){
    const btn=e.target?.closest?.('#profileBrandBtn');
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
    openProfileStudio();
  }

  function start(){
    document.addEventListener('click',captureProfileClick,true);
    const btn=document.getElementById('profileBrandBtn');
    if(btn){
      btn.type='button';
      btn.textContent='Profile & Branding';
    }
  }

  window.ProfileButtonOpenFix={open:openProfileStudio};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
