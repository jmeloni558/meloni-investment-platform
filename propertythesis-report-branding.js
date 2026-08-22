'use strict';
(()=>{
  const VERSION=2;
  if((window.__propertyThesisReportBrandingV||0)>=VERSION)return;
  window.__propertyThesisReportBrandingV=VERSION;
  const PRODUCT='PropertyThesis';
  const TAGLINE='Know the Numbers. Build the Case.';
  const TYPE='Investment Property Analysis';
  let applying=false,observer=null;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const safeColor=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'#14b8a6';
  const profile=()=>{try{return window.UserBranding?.getProfile?.()||{};}catch(_e){return {};}};

  function styles(){
    if(document.getElementById('propertyThesisReportBrandingStyles'))return;
    const s=document.createElement('style');s.id='propertyThesisReportBrandingStyles';s.textContent=`
      #clientReport .rb-cover{background:linear-gradient(125deg,#1d4ed8 0%,#2563eb 58%,#0f766e 135%)!important}
      #clientReport .rb-brand{font-size:13px!important;letter-spacing:.10em!important;font-weight:900!important;text-transform:none!important;color:#fff!important}
      #clientReport .pt-report-tagline{margin-top:4px;font-size:10px;font-weight:700;color:#dceaf6;letter-spacing:.02em}
      #clientReport .pt-user-brand{display:flex;align-items:center;gap:12px;margin-top:16px;padding:10px 12px;border:1px solid rgba(255,255,255,.25);border-left:4px solid var(--pt-user-accent,#14b8a6);border-radius:9px;background:rgba(255,255,255,.10);max-width:720px}
      #clientReport .pt-user-brand img{width:auto;max-width:112px;height:40px;max-height:40px;object-fit:contain;background:#fff;border-radius:6px;padding:4px;flex:0 0 auto}
      #clientReport .pt-user-copy{min-width:0}.pt-user-label{display:block;font-size:7.5px;font-weight:850;letter-spacing:.11em;text-transform:uppercase;color:#dceaf6;margin-bottom:2px}.pt-user-company{display:block;font-size:12px;font-weight:850;color:#fff}.pt-user-person,.pt-user-contact{display:block;font-size:8.5px;line-height:1.4;color:#e8f0f7;margin-top:2px}
      #clientReport .rb-footer .pt-report-product{font-weight:850;color:#fff;white-space:nowrap}
      #clientReport .rb-footer .rb-footer-brand{font-weight:750}
      @media(max-width:700px){#clientReport .pt-user-brand{align-items:flex-start;flex-direction:column}}
      @media print{#clientReport .rb-cover{background:#1d4ed8!important}#clientReport .pt-report-tagline{font-size:7.2pt!important;color:#e5eef6!important}#clientReport .pt-user-brand{margin-top:9pt!important;padding:6pt 7pt!important;border-color:rgba(255,255,255,.30)!important}.pt-user-company{font-size:8.5pt!important}.pt-user-person,.pt-user-contact{font-size:6.4pt!important}}
    `;document.head.appendChild(s);
  }

  function apply(){
    if(applying)return false;
    applying=true;
    try{
      const report=document.querySelector('#clientReport .rb-report');
      if(!report)return false;
      const cover=report.querySelector('.rb-cover');
      const p=profile();
      if(cover){
        cover.style.background='linear-gradient(125deg,#1d4ed8 0%,#2563eb 58%,#0f766e 135%)';
        const brand=cover.querySelector('.rb-brand');
        if(brand&&brand.textContent!==PRODUCT)brand.textContent=PRODUCT;
        let tag=cover.querySelector('.pt-report-tagline');
        if(!tag){tag=document.createElement('div');tag.className='pt-report-tagline';brand?.insertAdjacentElement('afterend',tag);}
        if(tag&&tag.textContent!==TAGLINE)tag.textContent=TAGLINE;
        const h1=cover.querySelector('h1');if(h1&&h1.textContent!==TYPE)h1.textContent=TYPE;

        cover.querySelectorAll(':scope > .rb-brand-logo').forEach(el=>el.remove());
        let secondary=cover.querySelector('.pt-user-brand');
        const company=(p.company_name||'').trim();
        const person=[p.full_name,p.professional_title].filter(Boolean).join(' • ');
        const contact=[p.email,p.phone,p.website].filter(Boolean).join(' • ');
        const hasSecondary=!!(company||person||contact||p.logo_url);
        if(hasSecondary){
          if(!secondary){secondary=document.createElement('div');secondary.className='pt-user-brand';const meta=cover.querySelector('.rb-meta');if(meta)meta.insertAdjacentElement('beforebegin',secondary);else cover.appendChild(secondary);}
          secondary.style.setProperty('--pt-user-accent',safeColor(p.brand_color));
          secondary.innerHTML=`${p.logo_url?`<img src="${esc(p.logo_url)}" alt="${esc(company||'Company')} logo">`:''}<div class="pt-user-copy"><span class="pt-user-label">Presented by</span>${company?`<strong class="pt-user-company">${esc(company)}</strong>`:''}${person?`<span class="pt-user-person">${esc(person)}</span>`:''}${contact?`<span class="pt-user-contact">${esc(contact)}</span>`:''}</div>`;
        }else secondary?.remove();
      }
      const footer=report.querySelector('.rb-footer');
      if(footer){
        const company=(p.company_name||'').trim();
        const brandEl=footer.querySelector('.rb-footer-brand');if(brandEl&&company)brandEl.textContent=company;
        let prod=footer.querySelector('.pt-report-product');
        if(!prod){prod=document.createElement('div');prod.className='pt-report-product';footer.appendChild(prod);}
        const text=`${PRODUCT} • ${TAGLINE}`;if(prod.textContent!==text)prod.textContent=text;
      }
      return true;
    }finally{applying=false;}
  }

  function observe(){
    const host=document.getElementById('clientReport');
    if(!host||observer)return;
    observer=new MutationObserver(()=>{if(!applying)queueMicrotask(apply);});
    observer.observe(host,{subtree:true,childList:true,characterData:true});
  }
  function schedule(){styles();observe();setTimeout(apply,0);setTimeout(apply,80);setTimeout(apply,220);}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll,#rbDownloadPdf,#profileBrandBtn,#psSave'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.PropertyThesisReportBranding={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();