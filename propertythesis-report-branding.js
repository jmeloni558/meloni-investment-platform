'use strict';
(()=>{
  const VERSION=7;
  if((window.__propertyThesisReportBrandingV||0)>=VERSION)return;
  window.__propertyThesisReportBrandingV=VERSION;
  const PRODUCT='PropertyThesis';
  const TAGLINE='Know the Numbers. Prove the Case.';
  const TYPE='Investment Property Analysis';
  // Keep an empty customer profile neutral. The owner account receives its
  // Meloni Realty identity from its saved profile; those details must never be
  // used as defaults for a newly registered customer.
  const FALLBACK={company_name:'Your Company',full_name:'Report Author',professional_title:'',license_number:'',website:'PropertyThesis.com'};
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const safeColor=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'#14b8a6';
  const profile=()=>{try{return window.UserBranding?.getProfile?.()||{};}catch(_e){return {};}};
  const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'';

  function extractMeta(meta,label){
    const text=(meta?.innerText||meta?.textContent||'').replace(/\s+/g,' ').trim();
    if(!text)return'';
    const labels=['Acquisition Price','Holding Period','Prepared by','Prepared for','Contact'];
    const next=labels.filter(x=>x!==label).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
    const re=new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:\\s*(.*?)(?=\\s*(?:'+next+')\\s*:|$)','i');
    return (text.match(re)?.[1]||'').trim();
  }

  function styles(){
    let s=document.getElementById('propertyThesisReportBrandingStyles');
    if(!s){s=document.createElement('style');s.id='propertyThesisReportBrandingStyles';document.head.appendChild(s);}
    s.textContent=`
      #clientReport .rb-cover{padding:0!important;background:#102b4e!important;color:#fff!important;overflow:hidden!important}
      #clientReport .pt-split-head{display:grid;grid-template-columns:1fr 1fr;min-height:138px;border-bottom:1px solid rgba(255,255,255,.12);background:linear-gradient(100deg,#0f2948 0%,#173e67 32%,#1d4ed8 50%,#2563eb 72%,#0f766e 100%)}
      #clientReport .pt-user-side{padding:25px 30px 22px;background:linear-gradient(100deg,rgba(15,41,72,.98) 0%,rgba(23,62,103,.84) 62%,rgba(29,78,216,.12) 100%);display:flex;align-items:center;gap:14px}
      #clientReport .pt-user-side img{width:auto;max-width:128px;height:50px;max-height:50px;object-fit:contain;background:#fff;border-radius:7px;padding:5px;flex:0 0 auto}
      #clientReport .pt-user-label{display:block;font-size:7.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#9fc6e8;margin-bottom:4px}
      #clientReport .pt-user-company{display:block;font-size:16px;font-weight:900;line-height:1.15;color:#fff}
      #clientReport .pt-user-person,#clientReport .pt-user-contact{display:block;font-size:8.5px;line-height:1.45;color:#d9e8f4;margin-top:3px}
      #clientReport .pt-product-side{padding:25px 30px 22px;background:linear-gradient(100deg,rgba(29,78,216,.10) 0%,rgba(37,99,235,.82) 36%,rgba(15,118,110,.98) 100%);text-align:right;display:flex;flex-direction:column;justify-content:center;align-items:flex-end}
      #clientReport .pt-product-name{font-size:24px;font-weight:950;letter-spacing:-.025em;color:#fff;line-height:1}
      #clientReport .pt-product-tag{font-size:9.5px;font-weight:750;color:#dbeafe;margin-top:7px;letter-spacing:.035em}
      #clientReport .pt-product-mark{width:64px;height:4px;border-radius:9px;background:#f6c453;margin-top:14px}
      #clientReport .pt-title-band{padding:24px 30px 22px;background:#fff;color:#172033;border-bottom:4px solid var(--pt-user-accent,#14b8a6)}
      #clientReport .pt-title-band h1{font-size:30px!important;line-height:1.03!important;margin:0 0 9px!important;color:#12263f!important;letter-spacing:-.035em!important}
      #clientReport .pt-title-band .address{font-size:16px!important;font-weight:800!important;line-height:1.3!important;color:#314963!important;margin:0!important}
      #clientReport .pt-header-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px;margin-top:14px!important;color:#405269!important;font-size:11.5px!important;line-height:1.45!important}
      #clientReport .pt-header-meta .pt-meta-item{font-weight:700!important;white-space:nowrap}
      #clientReport .pt-header-meta .pt-meta-item b{color:#173f66!important;font-weight:900!important;margin-right:4px}
      #clientReport .pt-header-meta .pt-meta-contact{flex-basis:100%;white-space:normal!important;font-weight:700!important;color:#405269!important}
      #clientReport .rb-cover>.rb-brand,#clientReport .rb-cover>.pt-report-tagline,#clientReport .rb-cover>.rb-brand-logo,#clientReport .rb-cover>.pt-user-brand{display:none!important}
      #clientReport .rb-footer .pt-report-product{font-weight:850;color:#fff;white-space:nowrap}
      @media(max-width:700px){#clientReport .pt-split-head{grid-template-columns:1fr}#clientReport .pt-product-side{text-align:left;align-items:flex-start}}
      @media print{#clientReport .pt-split-head{grid-template-columns:1fr 1fr!important;min-height:92pt!important}#clientReport .pt-user-side,#clientReport .pt-product-side{padding:15pt 18pt!important}#clientReport .pt-product-name{font-size:17pt!important}#clientReport .pt-user-company{font-size:11pt!important}#clientReport .pt-title-band{padding:15pt 18pt 14pt!important}#clientReport .pt-title-band h1{font-size:21pt!important}#clientReport .pt-title-band .address{font-size:12pt!important}#clientReport .pt-header-meta{font-size:8.5pt!important}}
    `;
  }

  function apply(){
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)return false;
    const cover=report.querySelector('.rb-cover');
    if(!cover)return false;
    const raw=profile(),p={...FALLBACK,...Object.fromEntries(Object.entries(raw).filter(([,v])=>String(v||'').trim()))},company=p.company_name.trim();
    const person=[p.full_name,p.professional_title,p.license_number].filter(Boolean).join(' • ');
    const contact=[p.email,p.phone,p.website].filter(Boolean).join(' • ');
    const address=cover.querySelector('.address')?.textContent||state?.address||state?.name||'Income-Producing Property';
    const sourceMeta=cover.querySelector('.rb-meta');
    const preparedBy=extractMeta(sourceMeta,'Prepared by')||person||p.full_name||company;
    const preparedFor=extractMeta(sourceMeta,'Prepared for');
    const acquisition=money(state?.price)||extractMeta(sourceMeta,'Acquisition Price');
    const contactText=extractMeta(sourceMeta,'Contact')||contact;
    const metaItems=[
      acquisition?`<span class="pt-meta-item"><b>Acquisition Price:</b>${esc(acquisition)}</span>`:'',
      preparedBy?`<span class="pt-meta-item"><b>Prepared by:</b>${esc(preparedBy)}</span>`:'',
      preparedFor?`<span class="pt-meta-item"><b>Prepared for:</b>${esc(preparedFor)}</span>`:'',
      contactText?`<span class="pt-meta-item pt-meta-contact"><b>Contact:</b>${esc(contactText)}</span>`:''
    ].filter(Boolean).join('');
    let head=cover.querySelector('.pt-master-header');
    if(!head){head=document.createElement('div');head.className='pt-master-header';cover.prepend(head);}
    head.style.setProperty('--pt-user-accent',safeColor(p.brand_color));
    head.innerHTML=`<div class="pt-split-head"><div class="pt-user-side" style="border-bottom:4px solid ${safeColor(p.brand_color)}">${p.logo_url?`<img src="${esc(p.logo_url)}" alt="${esc(company)} logo">`:''}<div><span class="pt-user-label">Presented by</span><strong class="pt-user-company">${esc(company)}</strong>${person?`<span class="pt-user-person">${esc(person)}</span>`:''}${contact?`<span class="pt-user-contact">${esc(contact)}</span>`:''}</div></div><div class="pt-product-side"><div class="pt-product-name">${PRODUCT}</div><div class="pt-product-tag">${TAGLINE}</div><div class="pt-product-mark"></div></div></div><div class="pt-title-band"><h1>${TYPE}</h1><p class="address">${esc(address)}</p>${metaItems?`<div class="pt-header-meta">${metaItems}</div>`:''}</div>`;
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
