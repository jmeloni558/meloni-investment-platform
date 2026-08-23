'use strict';
(()=>{
  const VERSION=4;
  const SITE_KEY='0x4AAAAAAEZOKm51JtNNvBzG';
  const APP_URL='https://propertythesis.com/latest.html';
  const ALLOWED_HOSTS=new Set(['propertythesis.com','www.propertythesis.com']);
  if((window.__propertyThesisTurnstileAuthVersion||0)>=VERSION)return;
  window.__propertyThesisTurnstileAuthVersion=VERSION;

  let token='';
  let widgetId=null;
  let scriptPromise=null;
  let busy=false;

  const el=id=>document.getElementById(id);
  const message=text=>{const m=el('authMessage');if(m)m.textContent=text;};

  function ensureUi(){
    const modal=el('authModal');
    if(!modal)return null;
    let host=el('ptTurnstileAuth');
    if(host)return host;
    host=document.createElement('div');
    host.id='ptTurnstileAuth';
    host.style.cssText='margin:12px 0 4px;min-height:65px;display:flex;justify-content:center;align-items:center';
    const msg=el('authMessage');
    if(msg?.parentNode)msg.parentNode.insertBefore(host,msg);
    else modal.querySelector('.modal')?.appendChild(host);
    return host;
  }

  function loadTurnstile(){
    if(window.turnstile)return Promise.resolve(window.turnstile);
    if(scriptPromise)return scriptPromise;
    scriptPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-pt-turnstile]');
      if(existing){
        const wait=()=>window.turnstile?resolve(window.turnstile):setTimeout(wait,50);
        wait();return;
      }
      const s=document.createElement('script');
      s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async=true;s.defer=true;s.dataset.ptTurnstile='1';
      s.onload=()=>resolve(window.turnstile);
      s.onerror=()=>reject(new Error('Unable to load security check'));
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  function injectRecoveryFlow(){
    if(document.querySelector('script[data-pt-recovery-flow]')||document.getElementById('ptRecoveryOverlay'))return;
    const s=document.createElement('script');
    s.src='password-recovery-flow.js?v=3';
    s.async=false;
    s.dataset.ptRecoveryFlow='1';
    document.body.appendChild(s);
  }

  function decodeJwtPayload(jwt){
    try{
      const part=String(jwt||'').split('.')[1];
      if(!part)return null;
      let b64=part.replace(/-/g,'+').replace(/_/g,'/');
      while(b64.length%4)b64+='=';
      return JSON.parse(atob(b64));
    }catch(_e){return null;}
  }

  async function loadRecoveryFlow(){
    const params=new URLSearchParams(location.hash.replace(/^#/,''));
    if(params.get('type')==='recovery')return injectRecoveryFlow();
    try{
      if(typeof cloudClient==='undefined'||!cloudClient)return;
      const {data:{session}}=await cloudClient.auth.getSession();
      const payload=decodeJwtPayload(session?.access_token);
      const methods=Array.isArray(payload?.amr)?payload.amr.map(x=>String(x?.method||'').toLowerCase()):[];
      if(methods.includes('otp'))injectRecoveryFlow();
    }catch(_e){}
  }

  async function renderChallenge(){
    const host=ensureUi();
    if(!host)return;
    if(!ALLOWED_HOSTS.has(location.hostname)){
      host.innerHTML='<small style="color:#b42318">Secure sign-in is available at propertythesis.com.</small>';
      return;
    }
    try{
      const ts=await loadTurnstile();
      if(widgetId!==null)return;
      widgetId=ts.render(host,{
        sitekey:SITE_KEY,
        theme:'auto',
        callback:v=>{token=v||'';message('Security check complete.');},
        'expired-callback':()=>{token='';message('Security check expired. Please complete it again.');},
        'error-callback':()=>{token='';message('Security check could not load. Please retry.');}
      });
    }catch(e){message(e?.message||'Unable to load security check.');}
  }

  function resetChallenge(){
    token='';
    try{if(window.turnstile&&widgetId!==null)window.turnstile.reset(widgetId);}catch(_e){}
  }

  function requireToken(){
    if(!ALLOWED_HOSTS.has(location.hostname)){
      message('For secure sign-in, open PropertyThesis at propertythesis.com.');
      return false;
    }
    if(!token){message('Complete the security check before continuing.');renderChallenge();return false;}
    return true;
  }

  async function protectedSignIn(){
    if(busy)return;
    const email=el('authEmail')?.value.trim()||'',password=el('authPassword')?.value||'';
    if(!email||!password)return message('Enter an email and password.');
    if(!requireToken())return;
    busy=true;message('Signing in…');
    try{
      const {error}=await cloudClient.auth.signInWithPassword({email,password,options:{captchaToken:token}});
      if(error)message(error.message);else message('Signed in.');
    }catch(e){message(e?.message||'Sign in failed. Please try again.');}
    finally{busy=false;resetChallenge();}
  }

  async function protectedSignUp(){
    if(busy)return;
    const email=el('authEmail')?.value.trim()||'',password=el('authPassword')?.value||'';
    if(!email||password.length<12)return message('Enter an email and a password of at least 12 characters.');
    if(!requireToken())return;
    busy=true;message('Creating account…');
    try{
      const {data,error}=await cloudClient.auth.signUp({email,password,options:{emailRedirectTo:APP_URL,captchaToken:token}});
      if(error)return message(error.message);
      message(data.session?'Account created and signed in.':'Account created. Check your email to verify it, then return here and sign in.');
    }catch(e){message(e?.message||'Account creation failed. Please try again.');}
    finally{busy=false;resetChallenge();}
  }

  async function protectedReset(){
    if(busy)return;
    const email=el('authEmail')?.value.trim()||'';
    if(!email)return message('Enter your email address first.');
    if(!requireToken())return;
    busy=true;message('Sending password reset email…');
    try{
      const {error}=await cloudClient.auth.resetPasswordForEmail(email,{redirectTo:APP_URL,captchaToken:token});
      message(error?error.message:'Password reset email sent. Check your inbox.');
    }catch(e){message(e?.message||'Password reset failed. Please try again.');}
    finally{busy=false;resetChallenge();}
  }

  function classifyButton(target){
    const button=target?.closest?.('button,input[type="button"],input[type="submit"]');
    if(!button||!el('authModal')?.contains(button))return null;
    const text=String(button.textContent||button.value||'').trim().toLowerCase();
    const id=String(button.id||'').toLowerCase();
    if(id.includes('forgot')||text.includes('forgot')||text.includes('reset'))return 'reset';
    if(id.includes('signup')||id.includes('create')||text.includes('create account')||text.includes('sign up'))return 'signup';
    if(id.includes('signin')||id.includes('login')||text==='sign in'||text==='login')return 'signin';
    return null;
  }

  function bind(){
    loadRecoveryFlow();
    const auth=el('authBtn');
    if(auth)auth.onclick=()=>{try{showAuth();}catch(_e){el('authModal')?.classList.remove('hidden');}renderChallenge();};

    const modal=el('authModal');
    if(modal&&!modal.dataset.ptTurnstileDelegated){
      modal.dataset.ptTurnstileDelegated='1';
      modal.addEventListener('click',e=>{
        const action=classifyButton(e.target);
        if(!action)return;
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        if(action==='signin')protectedSignIn();
        else if(action==='signup')protectedSignUp();
        else protectedReset();
      },true);
      modal.addEventListener('keydown',e=>{
        if(e.key!=='Enter'||!el('authPassword')?.contains?.(e.target)&&e.target!==el('authPassword')&&e.target!==el('authEmail'))return;
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        protectedSignIn();
      },true);
    }

    window.signInCloud=protectedSignIn;
    window.signUpCloud=protectedSignUp;
    window.forgotPasswordCloud=protectedReset;
    if(modal&&!modal.classList.contains('hidden'))renderChallenge();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
