'use strict';
(()=>{
  function route(){
    if(window.PropertyThesisAuth?.open)window.PropertyThesisAuth.open('signin');
    else location.assign('index.html?signin=1&return='+encodeURIComponent(location.pathname+location.search+location.hash));
  }
  function bind(){
    const header=document.getElementById('authBtn');
    if(header)header.onclick=route;
    document.querySelectorAll('[data-pt-home-signin]').forEach(button=>button.onclick=route);
  }
  function openRequestedAuth(){
    if(document.documentElement.dataset.ptRequestedAuthOpened)return;
    const params=new URLSearchParams(location.search),mode=params.has('create-account')?'signup':params.has('forgot-password')||params.has('signin-popup')?'signin':'';
    if(!mode)return;
    document.documentElement.dataset.ptRequestedAuthOpened='1';
    history.replaceState(null,'',location.pathname+location.hash);
    setTimeout(()=>{window.PropertyThesisAuth?.open?.(mode,params.has('forgot-password')?'Enter your email, then choose Forgot Password.':'');},0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();openRequestedAuth()},{once:true});else{bind();openRequestedAuth()}
  new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
})();
