'use strict';
(()=>{
  function loginUrl(){return 'login.html?return='+encodeURIComponent(location.pathname+location.search+location.hash)}
  function route(){location.assign(loginUrl())}
  function bind(){
    const header=document.getElementById('authBtn');
    if(header)header.onclick=route;
    document.querySelectorAll('[data-pt-home-signin]').forEach(button=>button.onclick=route);
  }
  function openRequestedAuth(){
    if(document.documentElement.dataset.ptRequestedAuthOpened)return;
    const params=new URLSearchParams(location.search),mode=params.has('create-account')?'signup':params.has('forgot-password')?'signin':'';
    if(!mode)return;
    document.documentElement.dataset.ptRequestedAuthOpened='1';
    history.replaceState(null,'',location.pathname+location.hash);
    setTimeout(()=>{window.PropertyThesisAuth?.open?.(mode,params.has('forgot-password')?'Enter your email, then choose Forgot Password.':'');},0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();openRequestedAuth()},{once:true});else{bind();openRequestedAuth()}
  new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
})();
