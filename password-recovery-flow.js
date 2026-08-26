'use strict';
(()=>{
  const VERSION=5;
  const SUPABASE_URL='https://lmaiqpkogmmsldkziggy.supabase.co';
  const SUPABASE_KEY='sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7';
  if((window.__propertyThesisPasswordRecoveryVersion||0)>=VERSION)return;
  window.__propertyThesisPasswordRecoveryVersion=VERSION;

  const style=document.createElement('style');
  style.textContent=`#ptRecoveryOverlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.72);display:grid;place-items:center;padding:20px}#ptRecoveryCard{width:min(440px,100%);background:#fff;border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:Arial,sans-serif;color:#111827}#ptRecoveryCard h2{margin:0 0 6px;font-size:24px}#ptRecoveryCard p{margin:0 0 18px;color:#475467;line-height:1.45}#ptRecoveryCard label{display:block;font-weight:700;margin:12px 0 6px}#ptRecoveryCard input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d0d5dd;border-radius:10px;font-size:16px}#ptRecoveryCard button{width:100%;margin-top:16px;padding:11px 14px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;font-size:16px;cursor:pointer}#ptRecoveryCard button[disabled]{opacity:.6;cursor:wait}#ptRecoveryMsg{margin-top:12px;font-size:14px;min-height:20px}`;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.id='ptRecoveryOverlay';
  overlay.innerHTML=`<div id="ptRecoveryCard"><h2>Reset your PropertyThesis password</h2><p>Choose a new password for your account. Use at least 12 characters.</p><label for="ptRecoveryPassword">New password</label><input id="ptRecoveryPassword" type="password" autocomplete="new-password"><label for="ptRecoveryConfirm">Confirm new password</label><input id="ptRecoveryConfirm" type="password" autocomplete="new-password"><button id="ptRecoverySave">Update Password</button><div id="ptRecoveryMsg" role="status"></div></div>`;
  document.body.appendChild(overlay);

  const msg=t=>{const el=document.getElementById('ptRecoveryMsg');if(el)el.textContent=t||'';};
  const button=document.getElementById('ptRecoverySave');
  let fallbackClient=null;

  async function getClient(){
    try{if(typeof cloudClient!=='undefined'&&cloudClient)return cloudClient;}catch(_e){}
    if(fallbackClient)return fallbackClient;
    for(let i=0;i<100&&!window.supabase;i++)await new Promise(r=>setTimeout(r,50));
    if(!window.supabase?.createClient)throw new Error('Authentication service did not initialize.');
    fallbackClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    return fallbackClient;
  }

  async function save(){
    const password=document.getElementById('ptRecoveryPassword')?.value||'';
    const confirm=document.getElementById('ptRecoveryConfirm')?.value||'';
    if(password.length<12)return msg('Password must be at least 12 characters.');
    if(password!==confirm)return msg('Passwords do not match.');
    button.disabled=true;msg('Updating password…');
    try{
      const client=await getClient();
      let {data:{session}}=await client.auth.getSession();
      if(!session){
        await new Promise(r=>setTimeout(r,250));
        ({data:{session}}=await client.auth.getSession());
      }
      if(!session)throw new Error('This recovery link is invalid or has expired. Request a new password-reset email.');
      const {error}=await client.auth.updateUser({password});
      if(error)throw error;
      msg('Password updated successfully. Signing you out…');
      try{await client.auth.signOut({scope:'global'});}catch(_e){try{await client.auth.signOut();}catch(_e2){}}
      history.replaceState(null,'',location.pathname+location.search);
      setTimeout(()=>location.replace('https://propertythesis.com/index.html'),700);
    }catch(e){msg(e?.message||'Unable to update password.');button.disabled=false;}
  }

  button?.addEventListener('click',save);
  document.getElementById('ptRecoveryConfirm')?.addEventListener('keydown',e=>{if(e.key==='Enter')save();});
})();
