'use strict';
(()=>{
  const VERSION=3;
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
      #clientReport .rb-cover{background:linear-gradient(125deg,#1d4ed8 0%,#2563eb 58%,#0f766e 135%)!important}
      #clientReport .rb-brand{font-size:0!important;letter-spacing:0!important;color:transparent!important;line-height:1!important}
      #clientReport .rb-brand::after{content:'PropertyThesis';display:block;font-size:13px;line-height:1.2;letter-spacing:.10em;font-weight:900;color:#fff;text-transform:none}
      #clientReport .pt-report-tagline{margin-top:4px;font-size:10px;font-weight:700;color:#dceaf6;letter-spacing:.02em}
      #clientReport .pt-user-brand{display:flex;align-items:center;gap:12px;margin-top:16px;padding:10px 12px;border:1px solid rgba(255,255,255,.24);border-left:4px solid var(--pt-user-accent,#14b8a6);border-radius:9px;background:rgba(255,255,255,.10);max-width:720px}
      #clientReport .pt-user-brand img{width:auto;max-width:112px;height:40px;max-height:40px;object-fit:contain;background:#fff;border-radius:6px;padding:4px;flex:0 0 auto}
      #clientReport .pt-user-copy{min-width:0}.pt-user-label{display:block;font-size:7.5px;font-weight:850;letter-spacing:.11em;text-transform:uppercase;color:#dceaf6;margin-bottom:2px}.pt-user-company{display:block;font-size:12px;font-weight:850;color:#fff}.pt-user-person,.pt-user-contact{display:block;font-size:8.5px;line-height:1.4;color:#e8f0f7;margin-top:2px}
      #clientReport .rb-footer .pt-report-product{font-weight:850;color:#fff;white-space:nowrap}
      @media(max-width:700px){#clientReport .pt-user-brand{align-items:flex-start;flex-direction:column}}
      @media print{#clientReport .rb-cover{background:#1d4ed8!important}#clientReport .rb-brand::after{font-size:9pt!important}#clientReport .pt-report-tagline{font-size:7.2pt!important;color:#e5eef6!important}#clientReport .pt-user-brand{margin-top:9pt!important;padding:6pt 7pt!important}.pt-user-company{font-size:8.5pt!important}.pt-user-person,.pt-user-contact{font-size:6.4pt!important}}
    `;
  }

  function apply(){
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)return false;
    const cover=report.querySelector('.rb-cover');
    const p=profile();
    if(cover){
      const brand=cover.querySelector('.rb-brand');
      let tag=cover.querySelector('.pt-report-tagline');
      if(!tag){tag=document.createElement('div');tag.className='pt-report-tagline';brand?.insertAdjacentElement('afterend',tag);}
      if(tag)tag.textContent=TAGLINE;
      const h1=cover.querySelector('h1');if(h1)h1.textContent=TYPE;

      let secondary=cover.querySelector('.pt-user-brand');
      const company=(p.company_name||'').trim();
      const person=[p.full_name,p.professional_title].filter(Boolean).join(' • ');
      const contact=[p.email,p.phone,p.website].filter(Boolean).join(' • ');
      const hasSecondary=!!(company||person||contact||p.logo_url);
      if(hasSecondary){
        if(!secondary){secondary=document.createElement('div');secondary.className='pt-user-brand';const meta=cover.querySelector('.rb-meta');if(meta)meta.insertAdjacentElement('beforebegin',secondary);else cover.appendChild(secondary);}
        secondary.style.setProperty('--pt-user-accent',safeColor(p.brand_color));
        secondary.innerHTML=`${p.logo_url?`<img src="${esc(p.logo_url)}" alt="${esc(company||'Company')} logo">`:''}<div class="pt-user-copy"><span class="pt-user-label">Presented by</span>${company?`<strong class="pt-user-company">${esc(company)}</strong>`:''}${person?`<span class="pt-user-person">${esc(person)}</span>`:''}${contact?`<span class="pt-user-contact">${esc(contact)}</span>`:''}</div>`;
      }else if(secondary){secondary.remove();}
    }
    const footer=report.querySelector('.rb-footer');
    if(footer){
      let prod=footer.querySelector('.pt-report-product');
      if(!prod){prod=document.createElement('div');prod.className='pt-report-product';footer.appendChild(prod);}
      prod.textContent=`${PRODUCT} • ${TAGLINE}`;
    }
    return true;
  }

  function schedule(){styles();setTimeout(apply,0);setTimeout(apply,120);}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll,#rbDownloadPdf,#psSave'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.PropertyThesisReportBranding={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();