(function(){
  'use strict';

  function signedOut(){
    var authUser=document.getElementById('authUser');
    var authBtn=document.getElementById('authBtn');
    var signOutBtn=document.getElementById('signOutBtn');
    var byText=!!authUser && /not signed in/i.test((authUser.textContent||'').trim());
    var signInVisible=!!authBtn && !authBtn.classList.contains('hidden') && authBtn.offsetParent!==null;
    var signOutHidden=!signOutBtn || signOutBtn.classList.contains('hidden') || signOutBtn.offsetParent===null;
    return byText || (signInVisible && signOutHidden);
  }

  function openSignIn(){
    var btn=document.getElementById('authBtn');
    if(btn) btn.click();
  }

  function addPromo(){
    if(!signedOut() || document.getElementById('ptGuestPromo')) return;
    var shell=document.querySelector('main.shell');
    if(!shell) return;

    var wrap=document.createElement('section');
    wrap.id='ptGuestPromo';
    wrap.className='screen-only';
    wrap.innerHTML=`
      <div class="pt-guest-promo">
        <div class="pt-guest-copy">
          <div class="pt-guest-eyebrow">REAL ESTATE INVESTMENT UNDERWRITING</div>
          <h2>Know the Numbers. Build the Case.</h2>
          <p class="pt-guest-lead">PropertyThesis brings income, financing, valuation, returns, market evidence and acquisition strategy into one connected investment analysis.</p>
          <p class="pt-guest-sub">Go beyond a basic calculator. Understand what drives the deal, what the property supports, and how to present the investment case clearly.</p>
          <div class="pt-guest-actions">
            <button type="button" class="pt-guest-primary" id="ptGuestExplore">Start Exploring</button>
            <button type="button" class="pt-guest-secondary" id="ptGuestSignIn">Sign In / Create Account</button>
          </div>
          <div class="pt-guest-note">Calculations, professional reports, rental comparables and sales comparables are available after sign-in.</div>
        </div>
        <div class="pt-guest-features" aria-label="PropertyThesis capabilities">
          <div><strong>Underwrite</strong><span>Income, expenses, financing & cash flow</span></div>
          <div><strong>Value</strong><span>Cap rate, GRM & income-supported pricing</span></div>
          <div><strong>Decide</strong><span>Returns, sensitivity & offer analysis</span></div>
          <div><strong>Support</strong><span>Market rent, sales comps & investment thesis</span></div>
        </div>
      </div>`;

    shell.insertBefore(wrap,shell.firstChild);
    var explore=document.getElementById('ptGuestExplore');
    var signIn=document.getElementById('ptGuestSignIn');
    if(explore) explore.addEventListener('click',function(){
      var target=document.getElementById('appNavShell') || document.querySelector('[data-guided-step="1"], #dashboard, .guided-analysis-setup, .section.active');
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
    if(signIn) signIn.addEventListener('click',openSignIn);
  }

  function sync(){
    var promo=document.getElementById('ptGuestPromo');
    if(signedOut()) addPromo();
    else if(promo) promo.remove();
  }

  var style=document.createElement('style');
  style.id='ptGuestPromoStyles';
  style.textContent=`
    #ptGuestPromo{margin:0 0 18px;display:block!important}
    .pt-guest-promo{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:28px;padding:30px;border:1px solid #dbe7f5;border-radius:20px;background:linear-gradient(135deg,#f8fbff 0%,#eef6ff 55%,#f8fbff 100%);box-shadow:0 12px 32px rgba(30,64,175,.08);overflow:hidden}
    .pt-guest-copy{max-width:780px}.pt-guest-eyebrow{font-size:12px;font-weight:800;letter-spacing:.12em;color:#2563eb;margin-bottom:8px}
    .pt-guest-copy h2{font-size:30px;line-height:1.12;margin:0 0 12px;color:#17365d}.pt-guest-lead{font-size:17px;line-height:1.6;margin:0 0 8px;color:#344054}.pt-guest-sub{font-size:14px;line-height:1.55;margin:0;color:#667085}
    .pt-guest-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.pt-guest-actions button{border-radius:10px;padding:11px 17px;font-weight:700;cursor:pointer;font:inherit}.pt-guest-primary{background:#2563eb;color:#fff;border:1px solid #2563eb}.pt-guest-secondary{background:#fff;color:#1d4ed8;border:1px solid #bfd3ee}
    .pt-guest-note{margin-top:14px;font-size:12px;color:#667085}.pt-guest-features{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:center}.pt-guest-features div{background:rgba(255,255,255,.88);border:1px solid #dbe7f5;border-radius:13px;padding:15px;min-height:84px}.pt-guest-features strong{display:block;color:#17365d;margin-bottom:5px;font-size:14px}.pt-guest-features span{display:block;color:#667085;font-size:12px;line-height:1.4}
    @media(max-width:850px){.pt-guest-promo{grid-template-columns:1fr;padding:22px}.pt-guest-copy h2{font-size:26px}}
    @media(max-width:520px){.pt-guest-features{grid-template-columns:1fr}.pt-guest-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();

  var attempts=0;
  var timer=setInterval(function(){
    sync();
    attempts++;
    if(attempts>=40) clearInterval(timer);
  },250);
})();