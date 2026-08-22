'use strict';
(()=>{
  const VERSION=4;
  if((window.__propertyThesisReportBrandingV||0)>=VERSION)return;
  window.__propertyThesisReportBrandingV=VERSION;
  const PRODUCT='PropertyThesis';
  const TAGLINE='Know the Numbers. Build the Case.';
  const TYPE='Investment Property Analysis';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const safeColor=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'#14b8a6';
  const profile=()=>{try{return window.UserBranding?.getProfile?.()||{};}catch(_e){return {};}};

  function styles(){
    let s=document.getElementById('propertyThesisReportBrandingStyles');
    if(!s){s=document.createElement('style');s.id='propertyThesisReportBrandingStyles';document.head.appendChild(s);}
    s.textContent=`
      #clientReport .rb-cover{padding:0!important;background:#102b4e!important;color:#fff!important;overflow:hidden!important}
      #clientReport .pt-split-head{display:grid;grid-template-columns:1fr 1fr;min-height:138px;border-bottom:1px solid rgba(255,255,255,.16)}
      #clientReport .pt-user-side{position:relative;padding:25px 30px 22px;background:linear-gradient(135deg,#0f2948,#173e67);display:flex;align-items:center;gap:14px}
      #clientReport .pt-user-side:after{content:'';position:absolute;right:0;top:22px;bottom:22px;width:1px;background:rgba(255,255,255,.18)}
      #clientReport .pt-user-side img{width:auto;max-width:128px;height:50px;max-height:50px;object-fit:contain;background:#fff;border-radius:7px;padding:5px;flex:0 0 auto}
      #clientReport .pt-user-label{display:block;font-size:7.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#9fc6e8;margin-bottom:4px}
      #clientReport .pt-user-company{display:block;font-size:16px;font-weight:900;line-height:1.15;color:#fff}
      #clientReport .pt-user-person,#clientReport .pt-user-contact{display:block;font-size:8.5px;line-height:1.45;color:#d9e8f4;margin-top:3px}
      #clientReport .pt-product-side{padding:25px 30px 22px;background:linear-gradient(135deg,#1d4ed8,#2563eb 60%,#0f766e);text-align:right;display:flex;flex-direction:column;justify-content:center;align-items:flex-end}
      #clientReport .pt-product-name{font-size:24px;font-weight:950;letter-spacing:-.025em;color:#fff;line-height:1}
      #clientReport .pt-product-tag{font-size:9.5px;font-weight:750;color:#dbeafe;margin-top:7px;letter-spacing:.035em}
      #clientReport .pt-product-mark{width:64px;height:4px;border-radius:9px;background:#f6c453;margin-top:14px}
      #clientReport .pt-title-band{padding:24px 30px 21px;background:#fff;color:#172033;border-bottom:4px solid var(--pt-user-accent,#14b8a6)}
      #clientReport .pt-title-kicker{font-size:8px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#64748b;margin-bottom:5px}
      #clientReport .pt-title-band h1{font-size:30px!important;line-height:1.03!important;margin:0 0 7px!important;color:#12263f!important;letter-spacing:-.035em!important}
      #clientReport .pt-title-band .address{font-size:13px!important;color:#52657a!important;margin:0!important}
      #clientReport .pt-title-band .rb-meta{margin-top:14px!important;color:#64748b!important}
      #clientReport .pt-title-band .rb-meta b{color:#334155!important}
      #clientReport .rb-cover>.rb-brand,#clientReport .rb-cover>.pt-report-tagline,#clientReport .rb-cover>.rb-brand-logo,#clientReport .rb-cover>.pt-user-brand{display:none!important}
      #clientReport .rb-footer .pt-report-product{font-weight:850;color:#fff;white-space:nowrap}
      @media(max-width:700px){#clientReport .pt-split-head{grid-template-columns:1fr}.pt-user-side:after{display:none!important}#clientReport .pt-product-side{text-align:left;align-items:flex-start}}
      @media print{#clientReport .pt-split-head{grid-template-columns:1fr 1fr!important;min-height:92pt!important}#clientReport .pt-user-side,#clientReport .pt-product-side{padding:15pt 18pt!important}#clientReport .pt-product-name{font-size:17pt!important}#clientReport .pt-user-company{font-size:11pt!important}#clientReport .pt-title-band{padding:15pt 18pt 13pt!important}#clientReport .pt-title-band h1{font-size:21pt!important}}
    `;
  }

  function apply(){
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)return false;
    const cover=report.querySelector('.rb-cover');
    if(!cover)return false;
    const p=profile(),company=(p.company_name||'Your Company').trim();
    const person=[p.full_name,p.professional_title].filter(Boolean).join(' • ');
    const contact=[p.email,p.phone,p.website].filter(Boolean).join(' • ');
    const address=cover.querySelector('.address')?.textContent||state?.address||state?.name||'Income-Producing Property';
    const meta=cover.querySelector('.rb-meta');
    const metaHtml=meta?meta.innerHTML:'';
    let head=cover.querySelector('.pt-master-header');
    if(!head){
      head=document.createElement('div');head.className='pt-master-header';cover.prepend(head);
    }
    head.style.setProperty('--pt-user-accent',safeColor(p.brand_color));
    head.innerHTML=`<div class="pt-split-head"><div class="pt-user-side" style="border-bottom:4px solid ${safeColor(p.brand_color)}">${p.logo_url?`<img src="${esc(p.logo_url)}" alt="${esc(company)} logo">`:''}<div><span class="pt-user-label">Presented by</span><strong class="pt-user-company">${esc(company)}</strong>${person?`<span class="pt-user-person">${esc(person)}</span>`:''}${contact?`<span class="pt-user-contact">${esc(contact)}</span>`:''}</div></div><div class="pt-product-side"><div class="pt-product-name">${PRODUCT}</div><div class="pt-product-tag">${TAGLINE}</div><div class="pt-product-mark"></div></div></div><div class="pt-title-band"><div class="pt-title-kicker">Client Investment Report</div><h1>${TYPE}</h1><p class="address">${esc(address)}</p>${metaHtml?`<div class="rb-meta">${metaHtml}</div>`:''}</div>`;
    [...cover.children].forEach(el=>{if(el!==head)el.style.display='none';});
    const footer=report.querySelector('.rb-footer');
    if(footer){let prod=footer.querySelector('.pt-report-product');if(!prod){prod=document.createElement('div');prod.className='pt-report-product';footer.appendChild(prod);}prod.textContent=`${PRODUCT} • ${TAGLINE}`;}
    return true;
  }

  function schedule(){styles();setTimeout(apply,0);setTimeout(apply,120);}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll,#rbDownloadPdf,#psSave'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.PropertyThesisReportBranding={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();