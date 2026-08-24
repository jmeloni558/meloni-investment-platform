'use strict';
(() => {
  const VERSION=4;
  if((window.__headerCleanupVersion||0)>=VERSION)return;
  window.__headerCleanupVersion=VERSION;

  function signedIn(){try{return typeof cloudUser!=='undefined'&&!!cloudUser}catch(e){return false}}
  function openAuth(){try{if(typeof showAuth==='function')showAuth()}catch(e){}}

  function ensureGuestPromo(){
    const guest=!signedIn();
    let promo=document.getElementById('ptGuestPromo');
    if(!guest){if(promo)promo.remove();return;}
    if(promo)return;
    const anchor=document.getElementById('appNavShell')||document.getElementById('stage8Workflow');
    if(!anchor)return;
    promo=document.createElement('section');
    promo.id='ptGuestPromo';
    promo.className='screen-only';
    promo.style.cssText='margin:14px 0 16px;border:1px solid #dbe7f5;border-radius:18px;background:linear-gradient(135deg,#f8fbff 0%,#eef6ff 55%,#f8fbff 100%);box-shadow:0 10px 28px rgba(30,64,175,.08);overflow:hidden';
    promo.innerHTML=`<div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:24px;padding:26px"><div><div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#2563eb;margin-bottom:8px">REAL ESTATE INVESTMENT UNDERWRITING</div><h2 style="margin:0 0 10px;font-size:28px;line-height:1.12;color:#17365d">Know the Numbers. Build the Case.</h2><p style="margin:0 0 8px;font-size:16px;line-height:1.55;color:#344054">PropertyThesis brings income, financing, valuation, returns, market evidence and acquisition strategy into one connected investment analysis.</p><p style="margin:0;font-size:13px;line-height:1.5;color:#667085">Go beyond a basic calculator. Understand what drives the deal, what the property supports, and how to present the investment case clearly.</p><div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px"><button type="button" id="ptGuestExplorePromo" style="border:1px solid #2563eb;border-radius:9px;background:#2563eb;color:#fff;padding:10px 15px;font-weight:800;cursor:pointer">Start Exploring</button><button type="button" id="ptGuestSignInPromo" style="border:1px solid #bfd3ee;border-radius:9px;background:#fff;color:#1d4ed8;padding:10px 15px;font-weight:800;cursor:pointer">Sign In / Create Account</button></div><div style="margin-top:12px;font-size:11px;color:#667085">Calculations, professional reports, rental comparables and sales comparables are available after sign-in.</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;align-content:center"><div style="background:#fff;border:1px solid #dbe7f5;border-radius:12px;padding:13px"><strong style="display:block;color:#17365d;margin-bottom:4px">Underwrite</strong><span style="font-size:11px;line-height:1.35;color:#667085">Income, expenses, financing & cash flow</span></div><div style="background:#fff;border:1px solid #dbe7f5;border-radius:12px;padding:13px"><strong style="display:block;color:#17365d;margin-bottom:4px">Value</strong><span style="font-size:11px;line-height:1.35;color:#667085">Cap rate, GRM & income-supported pricing</span></div><div style="background:#fff;border:1px solid #dbe7f5;border-radius:12px;padding:13px"><strong style="display:block;color:#17365d;margin-bottom:4px">Decide</strong><span style="font-size:11px;line-height:1.35;color:#667085">Returns, sensitivity & offer analysis</span></div><div style="background:#fff;border:1px solid #dbe7f5;border-radius:12px;padding:13px"><strong style="display:block;color:#17365d;margin-bottom:4px">Support</strong><span style="font-size:11px;line-height:1.35;color:#667085">Market rent, sales comps & investment thesis</span></div></div></div>`;
    anchor.insertAdjacentElement('beforebegin',promo);
    document.getElementById('ptGuestSignInPromo')?.addEventListener('click',openAuth);
    document.getElementById('ptGuestExplorePromo')?.addEventListener('click',()=>{const t=document.getElementById('appNavShell')||document.getElementById('stage8Workflow');t?.scrollIntoView({behavior:'smooth',block:'start'});});
  }

  function clean(){
    const actions=document.querySelector('.top .topactions');
    if(actions){
      [...actions.querySelectorAll('.pill')].forEach(el=>{
        const t=(el.textContent||'').trim().toLowerCase();
        if(t==='workbook fidelity model'||t==='guided workflow')el.remove();
      });
    }
    document.getElementById('saveStatus')?.remove();
    applyRentCompGuidance();
    ensureGuestPromo();
    return true;
  }

  function applyRentCompGuidance(){
    const guest=!signedIn();
    document.querySelectorAll('button').forEach(btn=>{
      const text=(btn.textContent||'').trim().toLowerCase();
      if(text!=='research market rent')return;
      const host=btn.closest('.ptr-actions')||btn.parentElement;
      if(!host)return;
      let note=host.parentElement?.querySelector(':scope > .pt-rent-login-guidance');
      if(!note){
        note=document.createElement('div');
        note.className='pt-rent-login-guidance';
        note.style.cssText='margin:10px 0 0;padding:9px 11px;border:1px solid #d7e5f1;border-radius:9px;background:#f7fbff;color:#475467;font-size:10px;line-height:1.45';
        note.innerHTML='<strong style="color:#175c92">Rental comparables require sign-in.</strong> Sign in to search current rent data, review rental comps, and save market-rent support.';
        host.insertAdjacentElement('afterend',note);
      }
      note.hidden=!guest;
      btn.dataset.ptRentGuestGate=guest?'1':'0';
    });
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn)return;
    const text=(btn.textContent||'').trim().toLowerCase();
    if(text==='research market rent'&&!signedIn()){
      e.preventDefault();e.stopImmediatePropagation();
      openAuth();
    }
  },true);

  function start(){
    clean();
    let tries=0;
    const timer=setInterval(()=>{
      clean();
      if(++tries>80)clearInterval(timer);
    },250);
    document.addEventListener('click',()=>setTimeout(clean,0));
  }

  window.HeaderCleanup={clean};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
