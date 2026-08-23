'use strict';
(()=>{
  const VERSION=1;
  const SITE_KEY='0x4AAAAAAEZOKm51JtNNvBzG';
  const ALLOWED_HOSTS=new Set(['propertythesis.com','www.propertythesis.com']);
  if((window.__propertyThesisTurnstileAuthVersion||0)>=VERSION)return;
  window.__propertyThesisTurnstileAuthVersion=VERSION;

  let token='';
  let widgetId=null;
  let scriptPromise=null;

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
    const email=el('authEmail')?.value.trim()||'',password=el('authPassword')?.value||'';
    if(!email||!password)return message('Enter an email and password.');
    if(!requireToken())return;
    message('Signing in…');
    try{
      const {error}=await cloudClient.auth.signInWithPassword({email,password,options:{captchaToken:token}});
      message(error?error.message:'Signed in.');
    }finally{resetChallenge();}
  }

  async function protectedSignUp(){
    const email=el('authEmail')?.value.trim()||'',password=el('authPassword')?.value||'';
    if(!email||password.length<12)return message('Enter an email and a password of at least 12 characters.');
    if(!requireToken())return;
    message('Creating account…');
    try{
      const {data,error}=await cloudClient.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname,captchaToken:token}});
      if(error)return message(error.message);
      message(data.session?'Account created and signed in.':'Account created. Check your email to verify it, then return here and sign in.');
    }finally{resetChallenge();}
  }

  async function protectedReset(){
    const email=el('authEmail')?.value.trim()||'';
    if(!email)return message('Enter your email address first.');
    if(!requireToken())return;
    message('Sending password reset email…');
    try{
      const {error}=await cloudClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname,captchaToken:token});
      message(error?error.message:'Password reset email sent. Check your inbox.');
    }finally{resetChallenge();}
  }

  function bind(){
    const auth=el('authBtn');
    if(auth)auth.onclick=()=>{try{showAuth();}catch(_e){el('authModal')?.classList.remove('hidden');}renderChallenge();};
    const signIn=el('signInAction');if(signIn)signIn.onclick=protectedSignIn;
    const signUp=el('signUpAction');if(signUp)signUp.onclick=protectedSignUp;
    const forgot=el('forgotPasswordAction')||el('forgotPasswordBtn');if(forgot)forgot.onclick=protectedReset;
    window.signInCloud=protectedSignIn;
    window.signUpCloud=protectedSignUp;
    window.forgotPasswordCloud=protectedReset;
    if(el('authModal')&&!el('authModal').classList.contains('hidden'))renderChallenge();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
