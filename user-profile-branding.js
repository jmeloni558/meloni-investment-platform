'use strict';
(() => {
  const VERSION=1;
  if((window.__userProfileBrandingVersion||0)>=VERSION)return;
  window.__userProfileBrandingVersion=VERSION;

  const DEFAULT_PROFILE={full_name:'',professional_title:'',company_name:'',email:'',phone:'',website:'',license_number:'',logo_url:'',brand_color:'#174f83',report_footer:'',report_disclaimer:''};
  let profile={...DEFAULT_PROFILE};

  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  function textColor(hex){try{const n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return (.299*r+.587*g+.114*b)>170?'#172033':'#fff';}catch(e){return '#fff';}}
  function getUser(){try{return typeof cloudUser!=='undefined'?cloudUser:null;}catch(e){return null;}}
  function getClient(){try{return typeof cloudClient!=='undefined'?cloudClient:null;}catch(e){return null;}}
  function getProfile(){return {...profile};}

  function neutralizeApp(){
    document.title='Investment Property Analyzer';
    const brand=document.querySelector('.top .brand');
    if(brand){
      const h=brand.querySelector('h1'),p=brand.querySelector('p');
      if(h)h.textContent='Investment Property Analyzer';
      if(p)p.textContent='Cash flow, valuation, financing, taxes and investment returns';
    }
    document.querySelectorAll('.print-only .mini').forEach(el=>{if(/Meloni Realty/i.test(el.textContent||''))el.textContent='Prepared with the Investment Property Analyzer';});
  }

  function injectStyles(){
    if(document.getElementById('userBrandingStyles'))return;
    const s=document.createElement('style');s.id='userBrandingStyles';s.textContent=`
      #profileBrandBtn{padding:6px 9px}
      #profileBrandModal{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.52);display:grid;place-items:center;padding:18px}
      #profileBrandModal.hidden{display:none}
      #profileBrandModal .pb-dialog{width:min(920px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 28px 80px rgba(15,23,42,.28);border:1px solid #dfe6ee}
      #profileBrandModal .pb-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px 22px;border-bottom:1px solid #e7ecf1;background:#f8fafc}
      #profileBrandModal .pb-head h2{margin:0;color:#172033;font-size:18px}
      #profileBrandModal .pb-head p{margin:4px 0 0;color:#667085;font-size:10px;line-height:1.45}
      #profileBrandModal .pb-body{padding:20px 22px}
      #profileBrandModal .pb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      #profileBrandModal .pb-wide{grid-column:1/-1}
      #profileBrandModal label{display:block;font-size:9px;font-weight:800;color:#475467;margin-bottom:5px}
      #profileBrandModal input,#profileBrandModal textarea{width:100%;box-sizing:border-box}
      #profileBrandModal textarea{min-height:74px;resize:vertical}
      #profileBrandModal .pb-color-row{display:grid;grid-template-columns:72px 1fr;gap:8px;align-items:center}
      #profileBrandModal input[type=color]{height:42px;padding:3px}
      #profileBrandModal .pb-preview{margin-top:16px;border:1px solid #dce4ec;border-radius:12px;overflow:hidden;background:#fff}
      #profileBrandModal .pb-preview-head{padding:16px 18px;color:var(--pb-text,#fff);background:var(--pb-color,#174f83);display:flex;justify-content:space-between;gap:16px;align-items:center}
      #profileBrandModal .pb-preview-head img{max-width:120px;max-height:46px;object-fit:contain;background:#fff;border-radius:6px;padding:4px}
      #profileBrandModal .pb-preview-body{padding:14px 18px;color:#667085;font-size:10px;line-height:1.5}
      #profileBrandModal .pb-actions{display:flex;justify-content:flex-end;gap:8px;padding:16px 22px;border-top:1px solid #e7ecf1;background:#fafbfc}
      #profileBrandModal .pb-status{margin-right:auto;align-self:center;color:#667085;font-size:9px}
      #clientReport .rb-brand-logo{max-width:150px;max-height:54px;object-fit:contain;background:#fff;border-radius:7px;padding:5px;margin-bottom:9px;display:block}
      @media(max-width:700px){#profileBrandModal .pb-grid{grid-template-columns:1fr}#profileBrandModal .pb-wide{grid-column:1}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById('profileBrandModal'))return;
    const m=document.createElement('div');m.id='profileBrandModal';m.className='hidden';m.innerHTML=`<div class="pb-dialog" role="dialog" aria-modal="true" aria-labelledby="pbTitle">
      <div class="pb-head"><div><h2 id="pbTitle">Profile & Report Branding</h2><p>Your branding is used on client reports and PDFs. The analyzer itself remains neutrally branded.</p></div><button class="btn ghost" id="pbClose" type="button">Close</button></div>
      <div class="pb-body"><div class="pb-grid">
        <div><label>Full Name</label><input id="pbFullName"></div><div><label>Professional Title</label><input id="pbTitleField" placeholder="Realtor, Analyst, Broker, Investor…"></div>
        <div><label>Company / Brand Name</label><input id="pbCompany"></div><div><label>Email</label><input id="pbEmail" type="email"></div>
        <div><label>Phone</label><input id="pbPhone"></div><div><label>Website</label><input id="pbWebsite"></div>
        <div><label>License / Credential Number</label><input id="pbLicense"></div><div><label>Primary Brand Color</label><div class="pb-color-row"><input id="pbColor" type="color"><input id="pbColorText" placeholder="#174f83"></div></div>
        <div class="pb-wide"><label>Logo URL</label><input id="pbLogo" placeholder="https://…  (direct logo upload will be added next)"></div>
        <div class="pb-wide"><label>Report Footer</label><input id="pbFooter" placeholder="Company address, license disclosure, website, etc."></div>
        <div class="pb-wide"><label>Custom Report Disclaimer</label><textarea id="pbDisclaimer" placeholder="Optional additional disclaimer text"></textarea></div>
      </div><div class="pb-preview"><div class="pb-preview-head" id="pbPreviewHead"><div><strong id="pbPreviewCompany">Your Company</strong><div id="pbPreviewPerson" style="font-size:10px;margin-top:3px;opacity:.88">Your Name • Professional Title</div></div><img id="pbPreviewLogo" alt="Logo preview" style="display:none"></div><div class="pb-preview-body">Investment Property Analysis<br><span id="pbPreviewContact">email • phone • website</span></div></div></div>
      <div class="pb-actions"><span class="pb-status" id="pbStatus"></span><button class="btn secondary" id="pbCancel" type="button">Cancel</button><button class="btn primary" id="pbSave" type="button">Save Profile</button></div>
    </div>`;document.body.appendChild(m);
    document.getElementById('pbClose').onclick=hideModal;document.getElementById('pbCancel').onclick=hideModal;document.getElementById('pbSave').onclick=saveProfile;
    ['pbFullName','pbTitleField','pbCompany','pbEmail','pbPhone','pbWebsite','pbLicense','pbLogo','pbFooter','pbDisclaimer','pbColor','pbColorText'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>{if(id==='pbColor')document.getElementById('pbColorText').value=document.getElementById('pbColor').value;if(id==='pbColorText'&&/^#[0-9a-f]{6}$/i.test(document.getElementById('pbColorText').value))document.getElementById('pbColor').value=document.getElementById('pbColorText').value;updatePreview();}));
  }

  function ensureButton(){
    const bar=document.querySelector('.authbar');if(!bar)return false;
    let b=document.getElementById('profileBrandBtn');if(!b){b=document.createElement('button');b.id='profileBrandBtn';b.className='btn ghost';b.type='button';b.textContent='Profile';bar.appendChild(b);b.onclick=openModal;}
    b.classList.toggle('hidden',!getUser());return true;
  }

  function fillForm(){
    const map={pbFullName:'full_name',pbTitleField:'professional_title',pbCompany:'company_name',pbEmail:'email',pbPhone:'phone',pbWebsite:'website',pbLicense:'license_number',pbLogo:'logo_url',pbFooter:'report_footer',pbDisclaimer:'report_disclaimer'};
    Object.entries(map).forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=profile[k]||'';});
    const c=/^#[0-9a-f]{6}$/i.test(profile.brand_color||'')?profile.brand_color:'#174f83';document.getElementById('pbColor').value=c;document.getElementById('pbColorText').value=c;updatePreview();
  }
  function readForm(){return {full_name:document.getElementById('pbFullName').value.trim(),professional_title:document.getElementById('pbTitleField').value.trim(),company_name:document.getElementById('pbCompany').value.trim(),email:document.getElementById('pbEmail').value.trim(),phone:document.getElementById('pbPhone').value.trim(),website:document.getElementById('pbWebsite').value.trim(),license_number:document.getElementById('pbLicense').value.trim(),logo_url:document.getElementById('pbLogo').value.trim(),brand_color:/^#[0-9a-f]{6}$/i.test(document.getElementById('pbColorText').value.trim())?document.getElementById('pbColorText').value.trim():document.getElementById('pbColor').value,report_footer:document.getElementById('pbFooter').value.trim(),report_disclaimer:document.getElementById('pbDisclaimer').value.trim()};}
  function updatePreview(){const p=readForm();const head=document.getElementById('pbPreviewHead');if(head){head.style.setProperty('--pb-color',p.brand_color);head.style.setProperty('--pb-text',textColor(p.brand_color));}document.getElementById('pbPreviewCompany').textContent=p.company_name||'Your Company';document.getElementById('pbPreviewPerson').textContent=[p.full_name||'Your Name',p.professional_title||'Professional Title'].filter(Boolean).join(' • ');document.getElementById('pbPreviewContact').textContent=[p.email,p.phone,p.website].filter(Boolean).join(' • ')||'email • phone • website';const img=document.getElementById('pbPreviewLogo');if(p.logo_url){img.src=p.logo_url;img.style.display='block';}else img.style.display='none';}
  function openModal(){if(!getUser()){try{showAuth();}catch(e){}return;}ensureModal();fillForm();document.getElementById('profileBrandModal').classList.remove('hidden');}
  function hideModal(){document.getElementById('profileBrandModal')?.classList.add('hidden');}
  function status(t){const el=document.getElementById('pbStatus');if(el)el.textContent=t;}

  async function loadProfile(){
    const u=getUser(),c=getClient();ensureButton();if(!u||!c){profile={...DEFAULT_PROFILE};applyReportBranding();return;}
    const {data,error}=await c.from('profiles').select('*').eq('user_id',u.id).maybeSingle();
    if(error){console.warn('Profile load failed',error);return;}
    profile={...DEFAULT_PROFILE,...(data||{}),email:(data?.email||u.email||'')};applyReportBranding();
  }
  async function saveProfile(){
    const u=getUser(),c=getClient();if(!u||!c)return status('Sign in to save your profile.');
    status('Saving…');const p=readForm();const payload={user_id:u.id,...p,updated_at:new Date().toISOString()};
    const {data,error}=await c.from('profiles').upsert(payload,{onConflict:'user_id'}).select().single();
    if(error)return status(error.message);
    profile={...DEFAULT_PROFILE,...data};status('Profile saved.');applyReportBranding();setTimeout(hideModal,450);
  }

  function applyReportBranding(){
    const report=document.querySelector('#clientReport .rb-report');if(!report)return false;
    const color=/^#[0-9a-f]{6}$/i.test(profile.brand_color||'')?profile.brand_color:'#174f83';
    const cover=report.querySelector('.rb-cover');if(cover){cover.style.background=`linear-gradient(125deg,${color} 0%,${color} 62%,#334155 135%)`;}
    const brand=report.querySelector('.rb-brand');if(brand)brand.textContent=(profile.company_name||'INVESTMENT PROPERTY ANALYSIS').toUpperCase();
    if(cover){cover.querySelector('.rb-brand-logo')?.remove();if(profile.logo_url){const img=document.createElement('img');img.className='rb-brand-logo';img.src=profile.logo_url;img.alt=(profile.company_name||'Company')+' logo';brand?.insertAdjacentElement('beforebegin',img);}}
    const meta=cover?.querySelector('.rb-meta');if(meta){const prepared=[profile.full_name,profile.professional_title].filter(Boolean).join(', ');const contact=[profile.email,profile.phone,profile.website].filter(Boolean).join(' • ');const spans=[...meta.querySelectorAll('span')];spans.forEach(s=>{if(/Prepared by:/i.test(s.textContent||''))s.innerHTML=`<b>Prepared by:</b> ${esc(prepared||'Report Author')}`;});if(contact&&!meta.querySelector('.rb-profile-contact'))meta.insertAdjacentHTML('beforeend',`<span class="rb-profile-contact"><b>Contact:</b> ${esc(contact)}</span>`);}
    const footer=report.querySelector('.rb-footer');if(footer){const brandEl=footer.querySelector('.rb-footer-brand');if(brandEl)brandEl.textContent=profile.company_name||'Investment Property Analysis';if(profile.report_footer||profile.report_disclaimer){let custom=footer.querySelector('.rb-profile-footer');if(!custom){custom=document.createElement('div');custom.className='rb-profile-footer';footer.prepend(custom);}custom.textContent=[profile.report_footer,profile.report_disclaimer].filter(Boolean).join(' • ');}}
    return true;
  }

  function wrapAuth(){try{const original=setCloudUser;if(typeof original==='function'&&!original.__profileWrapped){const wrapped=async function(user){const out=await original(user);ensureButton();await loadProfile();return out;};wrapped.__profileWrapped=true;setCloudUser=wrapped;}}catch(e){}}
  function schedule(){neutralizeApp();ensureButton();applyReportBranding();}
  function start(){injectStyles();ensureModal();neutralizeApp();wrapAuth();ensureButton();loadProfile();setInterval(schedule,800);document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll'))setTimeout(applyReportBranding,120);},true);}

  window.UserBranding={getProfile,loadProfile,applyReportBranding,openProfile:openModal};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
