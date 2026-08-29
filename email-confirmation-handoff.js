'use strict';
(()=>{
  const VERSION=2;
  if((window.__emailConfirmationHandoffV||0)>=VERSION)return;
  window.__emailConfirmationHandoffV=VERSION;
  const params=new URLSearchParams(location.search);
  if(params.get('resume-free')!=='1')return;
  window.__ptConfirmationHandoff=true;
  const SIGNAL_KEY='ptEmailConfirmedAt';
  let completed=false;

  function signalOriginalTab(){
    const value=String(Date.now());
    try{localStorage.setItem(SIGNAL_KEY,value);}catch(_e){}
    try{const channel=new BroadcastChannel('propertythesis-auth');channel.postMessage({type:'email-confirmed',at:value});channel.close();}catch(_e){}
  }
  function show(state){
    let overlay=document.getElementById('ptEmailConfirmationHandoff');
    if(!overlay){
      overlay=document.createElement('div');overlay.id='ptEmailConfirmationHandoff';
      overlay.innerHTML='<section role="status" aria-live="polite"><div class="pt-handoff-mark">✓</div><h1 id="ptHandoffTitle">Confirming your email…</h1><p id="ptHandoffMessage">Keep your original PropertyThesis tab open. Your analysis will continue there.</p><div class="pt-handoff-actions" hidden><button type="button" id="ptHandoffClose">Return to Original Tab</button></div><p class="pt-handoff-note">For security and to preserve your entered information, the analysis can only continue in the original tab.</p></section>';
      const style=document.createElement('style');style.textContent='#ptEmailConfirmationHandoff{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#edf5f8,#f8fbfc);font-family:Arial,sans-serif;color:#17365d}#ptEmailConfirmationHandoff section{width:min(560px,100%);padding:38px;border:1px solid #cbdde6;border-radius:18px;background:#fff;box-shadow:0 24px 70px rgba(16,45,70,.18);text-align:center}.pt-handoff-mark{display:grid;place-items:center;width:54px;height:54px;margin:0 auto 18px;border-radius:50%;background:#e5f7f2;color:#087f72;font-size:30px;font-weight:900}#ptEmailConfirmationHandoff h1{margin:0 0 12px;font-size:28px}#ptEmailConfirmationHandoff p{margin:0 auto;color:#526874;font-size:14px;line-height:1.6}.pt-handoff-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:24px}.pt-handoff-actions button{padding:12px 16px;border:1px solid #175c92;border-radius:9px;background:#175c92;color:#fff;font-size:12px;font-weight:800;cursor:pointer}.pt-handoff-note{margin-top:18px!important;font-size:11px!important;color:#778995!important}';
      document.head.appendChild(style);document.body.appendChild(overlay);
      document.getElementById('ptHandoffClose').onclick=()=>{window.close();document.getElementById('ptHandoffMessage').textContent='Your original PropertyThesis tab is ready. You may close this tab manually and return to it.';};
    }
    if(state==='complete'){
      document.getElementById('ptHandoffTitle').textContent='Email confirmed';
      document.getElementById('ptHandoffMessage').textContent='Return to your original PropertyThesis tab. It will sign you in and restore your analysis at the final review step.';
      overlay.querySelector('.pt-handoff-actions').hidden=false;
    }
  }
  function finish(session){if(completed||!session?.user)return;completed=true;signalOriginalTab();show('complete');}
  function start(){
    show('pending');
    try{cloudClient?.auth?.onAuthStateChange?.((_event,session)=>finish(session));}catch(_e){}
    [250,700,1400,2600,4500].forEach(ms=>setTimeout(()=>{try{cloudClient?.auth?.getSession?.().then(({data})=>finish(data?.session));}catch(_e){}},ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
