'use strict';
(()=>{
  const VERSION=2;
  if((window.__propertyThesisAuthExperienceV||0)>=VERSION)return;
  window.__propertyThesisAuthExperienceV=VERSION;

  const el=id=>document.getElementById(id);
  let mode='signin';
  let verificationEmail='';
  let baseShow=null;

  function ensureStyles(){
    if(el('ptAuthExperienceStyles'))return;
    const s=document.createElement('style');s.id='ptAuthExperienceStyles';s.textContent=`
      #authModal .modal{max-width:520px}#ptAuthModes{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:4px 0 16px;padding:4px;border-radius:10px;background:#eef3f6}#ptAuthModes button{min-height:40px;border:0;border-radius:8px;background:transparent;color:#536b78;font-size:11px;font-weight:850;cursor:pointer}#ptAuthModes button.active{background:#fff;color:#102d46;box-shadow:0 2px 8px rgba(16,45,70,.1)}#ptAuthPasswordHint{margin:-2px 0 12px;color:#667085;font-size:9.5px;line-height:1.45}#ptAuthVerification{padding:20px;border:1px solid #b9d5d2;border-radius:11px;background:#edf7f5;color:#425f67}#ptAuthVerification[hidden]{display:none!important}#ptAuthVerification h3{margin:0 0 7px;color:#102d46;font-size:20px}#ptAuthVerification p{margin:0 0 10px;font-size:11px;line-height:1.55}#ptAuthVerification ol{margin:14px 0 18px;padding-left:20px;color:#294c58;font-size:11px;line-height:1.7}#ptAuthVerification .pt-auth-email{font-weight:850;color:#105c55;overflow-wrap:anywhere}#ptAuthVerification .actions{margin-top:13px}.pt-auth-mode-hidden{display:none!important}#authMessage.pt-auth-error{border-left:4px solid #c43d3d;background:#fff5f5;color:#842828}#authMessage.pt-auth-success{border-left:4px solid #17877d;background:#edf7f5;color:#105c55}
    `;document.head.appendChild(s);
  }

  function ensureUi(){
    const modal=el('authModal'),box=modal?.querySelector('.modal');if(!box)return false;ensureStyles();
    const title=modal.querySelector('.sectionhead h2');if(title)title.textContent='Welcome to PropertyThesis';
    let modes=el('ptAuthModes');
    if(!modes){modes=document.createElement('div');modes.id='ptAuthModes';modes.setAttribute('role','tablist');modes.innerHTML='<button type="button" id="ptAuthModeSignIn" role="tab">Sign In</button><button type="button" id="ptAuthModeSignUp" role="tab">Create Free Account</button>';box.querySelector('.sectionhead')?.insertAdjacentElement('afterend',modes);el('ptAuthModeSignIn').onclick=()=>setMode('signin');el('ptAuthModeSignUp').onclick=()=>setMode('signup');}
    const password=el('authPassword');const passwordField=password?.closest('.field');
    if(passwordField&&!el('ptAuthConfirmWrap')){const confirm=document.createElement('div');confirm.id='ptAuthConfirmWrap';confirm.className='field';confirm.innerHTML='<label>Confirm Password</label><input id="authPasswordConfirm" type="password" autocomplete="new-password">';passwordField.insertAdjacentElement('afterend',confirm);const hint=document.createElement('div');hint.id='ptAuthPasswordHint';hint.textContent='Use at least 12 characters. You will verify your email before the account can be used.';confirm.insertAdjacentElement('afterend',hint);}
    if(!el('ptAuthVerification')){const verification=document.createElement('div');verification.id='ptAuthVerification';verification.hidden=true;verification.innerHTML='<h3>One last step: confirm your email</h3><p>We sent <strong>Confirm your email address</strong> to <span class="pt-auth-email" id="ptAuthVerificationEmail"></span>.</p><ol><li>Open that email. Check junk or spam if it is not in your inbox.</li><li>Click <strong>Confirm your email address</strong>.</li><li>PropertyThesis will return you here, sign you in, and restore your analysis automatically.</li></ol><p><strong>You do not need to sign in or reset your password.</strong></p><div class="actions"><button class="btn primary" id="closeForEmailAction" type="button">Close and Check Email</button><button class="btn ghost" id="resendConfirmationAction" type="button">Resend Email</button></div>';modes.insertAdjacentElement('afterend',verification);el('closeForEmailAction').onclick=()=>{if(typeof hideAuth==='function')hideAuth();else modal.classList.add('hidden');};}
    return true;
  }

  function message(text,kind=''){
    const m=el('authMessage');if(!m)return;m.textContent=text;m.classList.toggle('pt-auth-error',kind==='error');m.classList.toggle('pt-auth-success',kind==='success');
  }
  function setMode(next,customMessage=''){
    ensureUi();restoreForm();mode=next==='signup'?'signup':'signin';const verification=el('ptAuthVerification');if(verification)verification.hidden=true;
    const signup=mode==='signup';el('ptAuthModeSignIn')?.classList.toggle('active',!signup);el('ptAuthModeSignUp')?.classList.toggle('active',signup);el('ptAuthModeSignIn')?.setAttribute('aria-selected',String(!signup));el('ptAuthModeSignUp')?.setAttribute('aria-selected',String(signup));
    el('ptAuthConfirmWrap')?.classList.toggle('pt-auth-mode-hidden',!signup);el('ptAuthPasswordHint')?.classList.toggle('pt-auth-mode-hidden',!signup);el('signInAction')?.classList.toggle('pt-auth-mode-hidden',signup);el('signUpAction')?.classList.toggle('pt-auth-mode-hidden',!signup);el('forgotPasswordAction')?.classList.toggle('pt-auth-mode-hidden',signup);
    const p=el('authPassword');if(p)p.autocomplete=signup?'new-password':'current-password';const intro=el('authModal')?.querySelector('.sectionhead p');if(intro)intro.textContent=signup?'Create your free account, verify your email, and continue where you left off.':'Sign in to access saved analyses and continue your PropertyThesis work.';
    message(customMessage||(signup?'Enter your email and create a password of at least 12 characters.':'Enter the email and password for your verified account.'));
  }
  function showVerification(email){
    ensureUi();verificationEmail=email||el('authEmail')?.value.trim()||'';el('ptAuthVerificationEmail').textContent=verificationEmail;el('ptAuthModes').classList.add('pt-auth-mode-hidden');el('ptAuthVerification').hidden=false;
    ['authEmail','authPassword'].forEach(id=>el(id)?.closest('.field')?.classList.add('pt-auth-mode-hidden'));el('ptAuthConfirmWrap')?.classList.add('pt-auth-mode-hidden');el('ptAuthPasswordHint')?.classList.add('pt-auth-mode-hidden');el('signInAction')?.closest('.actions')?.classList.add('pt-auth-mode-hidden');el('ptTurnstileAuth')?.classList.add('pt-auth-mode-hidden');el('authMessage')?.classList.add('pt-auth-mode-hidden');
  }
  function restoreForm(){el('ptAuthModes')?.classList.remove('pt-auth-mode-hidden');['authEmail','authPassword'].forEach(id=>el(id)?.closest('.field')?.classList.remove('pt-auth-mode-hidden'));el('signInAction')?.closest('.actions')?.classList.remove('pt-auth-mode-hidden');el('ptTurnstileAuth')?.classList.remove('pt-auth-mode-hidden');el('authMessage')?.classList.remove('pt-auth-mode-hidden');}
  function open(next='signin',customMessage=''){
    ensureUi();restoreForm();if(typeof baseShow==='function')baseShow();else el('authModal')?.classList.remove('hidden');setMode(next,customMessage);setTimeout(()=>el('authEmail')?.focus(),0);
  }
  function confirmMatches(){return (el('authPassword')?.value||'')===(el('authPasswordConfirm')?.value||'');}

  function start(){
    ensureUi();baseShow=typeof window.showAuth==='function'?window.showAuth:null;window.showAuth=()=>open('signin');
    window.PropertyThesisAuth={open,setMode,getMode:()=>mode,message,showVerification,getVerificationEmail:()=>verificationEmail,confirmMatches};
    setMode('signin');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
