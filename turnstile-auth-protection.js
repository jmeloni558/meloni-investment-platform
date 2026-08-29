'use strict';
(()=>{
  const VERSION=10;
  const SITE_KEY='0x4AAAAAAEZOKm51JtNNvBzG';
  const APP_URL=location.origin+'/index.html';
  const ALLOWED_HOSTS=new Set(['propertythesis.com','www.propertythesis.com']);
  if((window.__propertyThesisTurnstileAuthVersion||0)>=VERSION)return;
  window.__propertyThesisTurnstileAuthVersion=VERSION;

  let token='';
  let widgetId=null;
  let scriptPromise=null;
  let busy=false;
  let pendingAction='';

  const el=id=>document.getElementById(id);
  const message=(text,kind='')=>{if(window.PropertyThesisAuth?.message)return window.PropertyThesisAuth.message(text,kind);const m=el('authMessage');if(m)m.textContent=text;};

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
    s.src='password-recovery-flow.js?v=5';
    s.async=false;
    s.dataset.ptRecoveryFlow='1';
    document.body.appendChild(s);
  }

  function loadRecoveryFlow(){
    const params=new URLSearchParams(location.hash.replace(/^#/,''));
    if(params.get('type')==='recovery')return injectRecoveryFlow();
    try{
      if(typeof cloudClient==='undefined'||!cloudClient)return;
      cloudClient.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')injectRecoveryFlow();});
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
        callback:v=>{token=v||'';const action=pendingAction;pendingAction='';message(action?'Security check complete. Continuing automatically…':'Security check complete.');if(action)setTimeout(()=>runProtectedAction(action),0);},
        'expired-callback':()=>{token='';message('Security check expired. Please complete it again.');},
        'error-callback':()=>{token='';pendingAction='';message('Security check could not load. Please retry.');}
      });
    }catch(e){message(e?.message||'Unable to load security check.');}
  }

  function resetChallenge(){
    token='';
    try{if(window.turnstile&&widgetId!==null)window.turnstile.reset(widgetId);}catch(_e){}
  }

  function requireToken(action){
    if(!ALLOWED_HOSTS.has(location.hostname)){
      message('For secure sign-in, open PropertyThesis at propertythesis.com.');
      return false;
    }
    if(!token){pendingAction=action||'';message(action==='signup'?'Completing the security check. Your account will be created automatically…':'Completing the security check. We will continue automatically…');renderChallenge();return false;}
    return true;
  }

  async function protectedSignIn(){
    if(busy)return;
    const email=el('authEmail')?.value.trim()||'',password=el('authPassword')?.value||'';
    if(!email||!password)return message('Enter an email and password.');
    if(!requireToken('signin'))return;
    busy=true;message('Signing in…');
    try{
      const {error}=await cloudClient.auth.signInWithPassword({email,password,options:{captchaToken:token}});
      if(error){const raw=String(error.message||'');if(/invalid login credentials|email not confirmed/i.test(raw))message('Unable to sign in. Check that the email is verified and the password is correct. If you just created this account, open the verification email before signing in.','error');else message(raw,'error');}else message('Signed in.','success');
    }catch(e){message(e?.message||'Sign in failed. Please try again.');}
    finally{busy=false;resetChallenge();}
  }

  async function protectedSignUp(){
    if(busy)return;
    const email=el('authEmail')?.value.trim()||'',password=el('authPassword')?.value||'';
    const confirmation=el('authPasswordConfirm')?.value||'';
    if(!email||password.length<12)return message('Enter an email and a password of at least 12 characters.','error');
    if(confirmation!==password)return message('The password confirmation does not match.','error');
    if(!requireToken('signup'))return;
    busy=true;message('Creating account…');
    try{
      const {data,error}=await cloudClient.auth.signUp({email,password,options:{emailRedirectTo:APP_URL,captchaToken:token}});
      if(error)return message(error.message,'error');
      if(!data?.user?.id)return message('The account was not created. Please retry the security check and submit the form again.','error');
      if(Array.isArray(data.user.identities)&&data.user.identities.length===0)return message('An account already exists for this email. Choose Sign In or use Forgot Password.','error');
      if(data.session)message('Account created and signed in.','success');
      else if(window.PropertyThesisAuth?.showVerification)window.PropertyThesisAuth.showVerification(email);
      else message('Account created. Check your email and click the verification link before signing in.','success');
    }catch(e){message(e?.message||'Account creation failed. Please try again.','error');}
    finally{busy=false;resetChallenge();}
  }

  async function protectedResend(){
    if(busy)return;
    const email=window.PropertyThesisAuth?.getVerificationEmail?.()||el('authEmail')?.value.trim()||'';
    if(!email)return message('Enter the email address used to create the account.','error');
    if(!requireToken('resend'))return;
    busy=true;message('Resending verification email…');
    try{const {error}=await cloudClient.auth.resend({type:'signup',email,options:{emailRedirectTo:APP_URL,captchaToken:token}});message(error?error.message:'Verification email resent. Check your inbox and spam folder.',error?'error':'success');}
    catch(e){message(e?.message||'Verification email could not be resent. Please try again.','error');}
    finally{busy=false;resetChallenge();}
  }

  async function protectedReset(){
    if(busy)return;
    const email=el('authEmail')?.value.trim()||'';
    if(!email)return message('Enter your email address first.');
    if(!requireToken('reset'))return;
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
    if(id==='ptauthalternativeaction'||id.startsWith('ptauthmode'))return null;
    if(id.includes('resend')||text.includes('resend verification'))return 'resend';
    if(id.includes('forgot')||text.includes('forgot')||text.includes('reset'))return 'reset';
    if(id.includes('signup')||id.includes('create')||text.includes('create account')||text.includes('sign up'))return 'signup';
    if(id.includes('signin')||id.includes('login')||text==='sign in'||text==='login')return 'signin';
    return null;
  }

  function runProtectedAction(action){
    if(action==='signin')protectedSignIn();
    else if(action==='signup')protectedSignUp();
    else if(action==='resend')protectedResend();
    else if(action==='reset')protectedReset();
  }

  function bind(){
    loadRecoveryFlow();
    const auth=el('authBtn');
    if(auth)auth.onclick=()=>{try{showAuth();}catch(_e){el('authModal')?.classList.remove('hidden');}renderChallenge();};

    const modal=el('authModal');
    if(modal&&!modal.dataset.ptTurnstileDelegated){
      modal.dataset.ptTurnstileDelegated='1';
      ['signInAction','signUpAction','forgotPasswordAction','resendConfirmationAction'].forEach(id=>{const button=el(id);if(button)button.onclick=null;});
      el('propertyThesisLoginForm')?.addEventListener('submit',e=>{
        e.preventDefault();
        if(window.PropertyThesisAuth?.getMode?.()==='signup')protectedSignUp();else protectedSignIn();
      });
      el('signUpAction')?.addEventListener('click',protectedSignUp);
      el('forgotPasswordAction')?.addEventListener('click',protectedReset);
      el('resendConfirmationAction')?.addEventListener('click',protectedResend);
    }

    window.signInCloud=protectedSignIn;
    window.signUpCloud=protectedSignUp;
    window.forgotPasswordCloud=protectedReset;
    window.resendConfirmationCloud=protectedResend;
    window.clearPendingAuthAction=()=>{pendingAction='';};
    if(modal&&!modal.classList.contains('hidden'))renderChallenge();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
