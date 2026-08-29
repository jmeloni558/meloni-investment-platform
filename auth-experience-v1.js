'use strict';
(()=>{
  const VERSION=5;
  if((window.__propertyThesisAuthExperienceV||0)>=VERSION)return;
  window.__propertyThesisAuthExperienceV=VERSION;

  const el=id=>document.getElementById(id);
  let mode='signin';
  let verificationEmail='';
  let baseShow=null;

  function ensureStyles(){
    if(el('ptAuthExperienceStyles'))return;
    const s=document.createElement('style');s.id='ptAuthExperienceStyles';s.textContent=`
      #authModal .modal{max-width:520px}#ptAuthModes{display:none!important}#ptAuthAlternative{margin:13px 0 4px;padding-top:12px;border-top:1px solid #dce6eb;color:#617682;font-size:10.5px}#ptAuthAlternative button{border:0;padding:2px 4px;background:transparent;color:#175f8d;font:inherit;font-weight:850;text-decoration:underline;cursor:pointer}#ptAuthPasswordHint{margin:-2px 0 12px;color:#667085;font-size:9.5px;line-height:1.45}#ptAuthVerification{padding:20px;border:1px solid #b9d5d2;border-radius:11px;background:#edf7f5;color:#425f67}#ptAuthVerification[hidden]{display:none!important}#ptAuthVerification h3{margin:0 0 7px;color:#102d46;font-size:20px}#ptAuthVerification p{margin:0 0 10px;font-size:11px;line-height:1.55}#ptAuthVerification ol{margin:14px 0 18px;padding-left:20px;color:#294c58;font-size:11px;line-height:1.7}#ptAuthVerification .pt-auth-email{font-weight:850;color:#105c55;overflow-wrap:anywhere}#ptAuthVerification .actions{margin-top:13px}.pt-auth-mode-hidden{display:none!important}#authMessage.pt-auth-error{border-left:4px solid #c43d3d;background:#fff5f5;color:#842828}#authMessage.pt-auth-success{border-left:4px solid #17877d;background:#edf7f5;color:#105c55}
    `;document.head.appendChild(s);
  }

  function ensureUi(){
    const modal=el('authModal'),box=modal?.querySelector('.modal');if(!box)return false;ensureStyles();
    const title=modal.querySelector('.sectionhead h2');if(title)title.textContent='Welcome to PropertyThesis';
    let modes=el('ptAuthModes');
    if(!modes){modes=document.createElement('div');modes.id='ptAuthModes';modes.setAttribute('role','tablist');modes.innerHTML='<button type="button" id="ptAuthModeSignIn" role="tab">Sign In</button><button type="button" id="ptAuthModeSignUp" role="tab">Create Free Account</button>';box.querySelector('.sectionhead')?.insertAdjacentElement('afterend',modes);el('ptAuthModeSignIn').onclick=()=>setMode('signin');el('ptAuthModeSignUp').onclick=()=>setMode('signup');}
    const password=el('authPassword');const passwordField=password?.closest('.field');
    if(passwordField&&!el('ptAuthConfirmWrap')){const confirm=document.createElement('div');confirm.id='ptAuthConfirmWrap';confirm.className='field';confirm.innerHTML='<label for="authPasswordConfirm">Confirm Password</label><input id="authPasswordConfirm" name="password-confirmation" type="password" autocomplete="new-password" disabled>';passwordField.insertAdjacentElement('afterend',confirm);const hint=document.createElement('div');hint.id='ptAuthPasswordHint';hint.textContent='Use at least 12 characters. You will verify your email before the account can be used.';confirm.insertAdjacentElement('afterend',hint);}
    if(!el('ptAuthAlternative')){const alternative=document.createElement('div');alternative.id='ptAuthAlternative';alternative.innerHTML='<span id="ptAuthAlternativeText"></span><button type="button" id="ptAuthAlternativeAction"></button>';el('signInAction')?.closest('.actions')?.insertAdjacentElement('afterend',alternative);el('ptAuthAlternativeAction').onclick=()=>setMode(mode==='signup'?'signin':'signup');}
    if(!el('ptAuthVerification')){const verification=document.createElement('div');verification.id='ptAuthVerification';verification.hidden=true;verification.innerHTML='<h3>One last step: confirm your email</h3><p>We sent <strong>Confirm your email address</strong> to <span class="pt-auth-email" id="ptAuthVerificationEmail"></span>.</p><ol><li>Keep this PropertyThesis tab open.</li><li>Open the email on this computer or your phone and click <strong>Confirm your email address</strong>.</li><li>The confirmation may open in a separate tab. Return to this original tab to continue your restored analysis.</li><li>If you confirmed on another device, use the button below.</li></ol><p><strong>Do not reset your password. Your analysis remains saved in this browser.</strong></p><div class="actions"><button class="btn primary" id="confirmedElsewhereAction" type="button">I Confirmed on Another Device</button><button class="btn ghost" id="closeForEmailAction" type="button">Close and Check Email</button><button class="btn ghost" id="resendConfirmationAction" type="button">Resend Email</button></div>';modes.insertAdjacentElement('afterend',verification);el('confirmedElsewhereAction').onclick=()=>{setMode('signin','Your email is confirmed. Complete the security check and sign in on this computer to restore your analysis.');setTimeout(()=>el('authPassword')?.focus(),0);};el('closeForEmailAction').onclick=()=>{if(typeof hideAuth==='function')hideAuth();else modal.classList.add('hidden');};}
    return true;
  }

  function message(text,kind=''){
    const m=el('authMessage');if(!m)return;m.textContent=text;m.classList.toggle('pt-auth-error',kind==='error');m.classList.toggle('pt-auth-success',kind==='success');
  }
  function setMode(next,customMessage=''){
    ensureUi();restoreForm();window.clearPendingAuthAction?.();mode=next==='signup'?'signup':'signin';const verification=el('ptAuthVerification');if(verification)verification.hidden=true;
    const signup=mode==='signup';
    el('ptAuthConfirmWrap')?.classList.toggle('pt-auth-mode-hidden',!signup);el('ptAuthPasswordHint')?.classList.toggle('pt-auth-mode-hidden',!signup);el('signInAction')?.classList.toggle('pt-auth-mode-hidden',signup);el('signUpAction')?.classList.toggle('pt-auth-mode-hidden',!signup);el('forgotPasswordAction')?.classList.toggle('pt-auth-mode-hidden',signup);
    const title=el('authModal')?.querySelector('.sectionhead h2');if(title)title.textContent=signup?'Create your free account':'Sign in to PropertyThesis';const p=el('authPassword');if(p)p.autocomplete=signup?'new-password':'current-password';const confirmation=el('authPasswordConfirm');if(confirmation)confirmation.disabled=!signup;const intro=el('authModal')?.querySelector('.sectionhead p');if(intro)intro.textContent=signup?'Verify your email once, then continue with the analysis you already entered.':'Access your saved analyses and continue your PropertyThesis work.';const altText=el('ptAuthAlternativeText'),altAction=el('ptAuthAlternativeAction');if(altText)altText.textContent=signup?'Already have an account? ':'New to PropertyThesis? ';if(altAction)altAction.textContent=signup?'Sign in':'Create a free account';
    message(customMessage||(signup?'Enter your email and create a password of at least 12 characters.':'Enter the email and password for your verified account.'));
  }
  function showVerification(email){
    ensureUi();verificationEmail=email||el('authEmail')?.value.trim()||'';el('ptAuthVerificationEmail').textContent=verificationEmail;el('ptAuthModes').classList.add('pt-auth-mode-hidden');el('ptAuthVerification').hidden=false;
    ['authEmail','authPassword'].forEach(id=>el(id)?.closest('.field')?.classList.add('pt-auth-mode-hidden'));el('ptAuthConfirmWrap')?.classList.add('pt-auth-mode-hidden');el('ptAuthPasswordHint')?.classList.add('pt-auth-mode-hidden');el('signInAction')?.closest('.actions')?.classList.add('pt-auth-mode-hidden');el('ptAuthAlternative')?.classList.add('pt-auth-mode-hidden');el('ptTurnstileAuth')?.classList.add('pt-auth-mode-hidden');el('authMessage')?.classList.add('pt-auth-mode-hidden');
  }
  function restoreForm(){['authEmail','authPassword'].forEach(id=>el(id)?.closest('.field')?.classList.remove('pt-auth-mode-hidden'));el('signInAction')?.closest('.actions')?.classList.remove('pt-auth-mode-hidden');el('ptAuthAlternative')?.classList.remove('pt-auth-mode-hidden');el('ptTurnstileAuth')?.classList.remove('pt-auth-mode-hidden');el('authMessage')?.classList.remove('pt-auth-mode-hidden');}
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
