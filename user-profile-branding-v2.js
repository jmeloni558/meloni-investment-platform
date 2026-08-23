'use strict';
(() => {
  const VERSION=2;
  if((window.__userProfileBrandStudioVersion||0)>=VERSION)return;
  window.__userProfileBrandStudioVersion=VERSION;
  const BUCKET='report-brand-assets';
  const DEFAULT_PROFILE={full_name:'',professional_title:'',company_name:'',email:'',phone:'',website:'',license_number:'',logo_url:'',brand_color:'#174f83',report_footer:'',report_disclaimer:''};
  let working={...DEFAULT_PROFILE};
  const $=id=>document.getElementById(id);
  function user(){try{return typeof cloudUser!=='undefined'?cloudUser:null}catch(e){return null}}
  function client(){try{return typeof cloudClient!=='undefined'?cloudClient:null}catch(e){return null}}
  function safeColor(v){return /^#[0-9a-f]{6}$/i.test(v||'')?v:'#174f83'}
  function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
  function contrast(hex){const n=parseInt(safeColor(hex).slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return (.299*r+.587*g+.114*b)>165?'#172033':'#fff'}

  function styles(){if($('brandStudioStyles'))return;const s=document.createElement('style');s.id='brandStudioStyles';s.textContent=`
    #profileBrandModal{padding:24px!important;background:rgba(15,23,42,.62)!important;backdrop-filter:blur(5px)}
    #profileBrandModal .pb-dialog{width:min(1180px,97vw)!important;max-height:94vh!important;border-radius:18px!important;overflow:auto!important}
    #profileBrandModal .pbs-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(330px,.85fr);min-height:620px}
    #profileBrandModal .pbs-editor{padding:22px;background:#fff}
    #profileBrandModal .pbs-preview-pane{padding:22px;background:#f2f5f8;border-left:1px solid #dfe6ed;position:sticky;top:0;align-self:start;min-height:620px}
    #profileBrandModal .pbs-section{margin-bottom:22px}
    #profileBrandModal .pbs-section h3{margin:0 0 4px;color:#172033;font-size:13px}
    #profileBrandModal .pbs-section>p{margin:0 0 12px;color:#667085;font-size:9.5px;line-height:1.45}
    #profileBrandModal .pbs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
    #profileBrandModal .pbs-wide{grid-column:1/-1}
    #profileBrandModal .pbs-logo-row{display:grid;grid-template-columns:130px 1fr;gap:14px;align-items:center}
    #profileBrandModal .pbs-logo-box{height:90px;border:1px dashed #bcc9d6;border-radius:12px;background:#fafbfd;display:grid;place-items:center;overflow:hidden;color:#8492a6;font-size:9px;text-align:center;padding:8px}
    #profileBrandModal .pbs-logo-box img{max-width:100%;max-height:72px;object-fit:contain}
    #profileBrandModal .pbs-upload-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    #profileBrandModal #pbsLogoFile{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
    #profileBrandModal .pbs-help{font-size:8.5px;color:#7b8797;line-height:1.4;margin-top:6px}
    #profileBrandModal .pbs-color{display:grid;grid-template-columns:64px 1fr;gap:8px;align-items:center}
    #profileBrandModal .pbs-color input[type=color]{height:40px;padding:3px}
    #profileBrandModal .pbs-preview-label{text-transform:uppercase;letter-spacing:.12em;font-size:8px;font-weight:850;color:#667085;margin-bottom:8px}
    #profileBrandModal .pbs-report{border-radius:13px;overflow:hidden;background:#fff;border:1px solid #d9e2ea;box-shadow:0 12px 32px rgba(25,49,78,.10)}
    #profileBrandModal .pbs-cover{padding:24px 22px 20px;min-height:185px;position:relative;background:var(--pbs-color,#174f83);color:var(--pbs-text,#fff)}
    #profileBrandModal .pbs-cover:after{content:'';position:absolute;left:22px;bottom:0;width:62px;height:4px;border-radius:3px;background:#d7b66f}
    #profileBrandModal .pbs-cover-logo{height:44px;max-width:150px;object-fit:contain;background:#fff;border-radius:6px;padding:4px;margin-bottom:15px;display:none}
    #profileBrandModal .pbs-company{font-size:9px;letter-spacing:.14em;font-weight:800;opacity:.88;text-transform:uppercase}
    #profileBrandModal .pbs-report-title{font-size:25px;line-height:1.08;font-weight:850;letter-spacing:-.035em;margin:10px 0 7px}
    #profileBrandModal .pbs-address{font-size:10px;opacity:.84}
    #profileBrandModal .pbs-byline{margin-top:18px;font-size:8.5px;line-height:1.5;opacity:.9}
    #profileBrandModal .pbs-report-body{padding:15px 17px}
    #profileBrandModal .pbs-report-body h4{font-size:11px;margin:0 0 7px;color:#26384d}
    #profileBrandModal .pbs-report-body p{font-size:8.5px;color:#667085;line-height:1.55;margin:0}
    #profileBrandModal .pbs-brand-strip{margin-top:12px;border-radius:9px;padding:10px 12px;background:#fff;border:1px solid #dce4eb;font-size:8.5px;color:#667085;line-height:1.55}
    #profileBrandModal .pbs-brand-strip b{color:#344054}
    #profileBrandModal .pb-actions{position:sticky;bottom:0;z-index:5}
    @media(max-width:900px){#profileBrandModal .pbs-layout{grid-template-columns:1fr}#profileBrandModal .pbs-preview-pane{border-left:0;border-top:1px solid #dfe6ed;position:static;min-height:0}}
    @media(max-width:620px){#profileBrandModal .pbs-grid,#profileBrandModal .pbs-logo-row{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}

  function modal(){
    $('profileBrandModal')?.remove();
    const m=document.createElement('div');m.id='profileBrandModal';m.className='hidden';m.innerHTML=`<div class="pb-dialog" role="dialog" aria-modal="true" aria-labelledby="pbsTitle">
      <div class="pb-head"><div><h2 id="pbsTitle">Profile & Report Branding</h2><p>Create the professional identity that appears on your client-facing investment reports.</p></div><button class="btn ghost" id="pbsClose" type="button">Close</button></div>
      <div class="pbs-layout"><div class="pbs-editor">
        <section class="pbs-section"><h3>Brand Identity</h3><p>Upload your company logo and choose the primary color used on report covers and accents.</p>
          <div class="pbs-logo-row"><div class="pbs-logo-box" id="pbsLogoBox"><span>No logo uploaded</span></div><div><div class="pbs-upload-actions"><label class="btn secondary" for="pbsLogoFile">Upload Logo</label><input id="pbsLogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><button class="btn ghost" id="pbsRemoveLogo" type="button">Remove Logo</button></div><div class="pbs-help" id="pbsLogoStatus">PNG, JPG, WEBP or GIF. Maximum 2 MB.</div></div></div>
          <div class="pbs-grid" style="margin-top:12px"><div><label>Company / Brand Name</label><input id="pbsCompany"></div><div><label>Primary Brand Color</label><div class="pbs-color"><input id="pbsColor" type="color"><input id="pbsColorText" placeholder="#174f83"></div></div></div>
        </section>
        <section class="pbs-section"><h3>Professional Identity</h3><p>These details identify the person preparing the analysis.</p><div class="pbs-grid"><div><label>Full Name</label><input id="pbsFullName"></div><div><label>Professional Title</label><input id="pbsTitleField" placeholder="Broker, Realtor, Analyst, Investor…"></div><div class="pbs-wide"><label>License / Credential Number</label><input id="pbsLicense" placeholder="Optional"></div></div></section>
        <section class="pbs-section"><h3>Contact Information</h3><p>Contact details appear beneath the report author information.</p><div class="pbs-grid"><div><label>Email</label><input id="pbsEmail" type="email"></div><div><label>Phone</label><input id="pbsPhone"></div><div class="pbs-wide"><label>Website</label><input id="pbsWebsite"></div></div></section>
        <section class="pbs-section"><h3>Report Branding</h3><p>Add optional footer and disclosure language to every generated report.</p><div class="pbs-grid"><div class="pbs-wide"><label>Report Footer</label><input id="pbsFooter" placeholder="Company address, website, license disclosure, etc."></div><div class="pbs-wide"><label>Custom Report Disclaimer</label><textarea id="pbsDisclaimer" style="min-height:86px" placeholder="Optional additional disclaimer language"></textarea></div></div></section>
      </div><aside class="pbs-preview-pane"><div class="pbs-preview-label">Live report preview</div><div class="pbs-report"><div class="pbs-cover" id="pbsCover"><img class="pbs-cover-logo" id="pbsCoverLogo" alt="Logo"><div class="pbs-company" id="pbsPreviewCompany">YOUR COMPANY</div><div class="pbs-report-title">Investment Property Analysis</div><div class="pbs-address">123 Sample Property Address</div><div class="pbs-byline" id="pbsPreviewByline">Prepared by Your Name • Professional Title</div></div><div class="pbs-report-body"><h4>Executive Investment Conclusion</h4><p>This preview shows how your saved profile will brand Page 3 and the downloadable client PDF.</p></div></div><div class="pbs-brand-strip" id="pbsPreviewContact"><b>Contact</b><br>Email • Phone • Website</div></aside></div>
      <div class="pb-actions"><span class="pb-status" id="pbsStatus"></span><button class="btn secondary" id="pbsCancel" type="button">Cancel</button><button class="btn primary" id="pbsSave" type="button">Save Profile</button></div>
    </div>`;document.body.appendChild(m);
    $('pbsClose').onclick=hide;$('pbsCancel').onclick=hide;$('pbsSave').onclick=save;$('pbsLogoFile').onchange=uploadLogo;$('pbsRemoveLogo').onclick=removeLogo;
    ['pbsCompany','pbsColor','pbsColorText','pbsFullName','pbsTitleField','pbsLicense','pbsEmail','pbsPhone','pbsWebsite','pbsFooter','pbsDisclaimer'].forEach(id=>$(id)?.addEventListener('input',()=>{if(id==='pbsColor')$('pbsColorText').value=$('pbsColor').value;if(id==='pbsColorText'&&/^#[0-9a-f]{6}$/i.test($('pbsColorText').value))$('pbsColor').value=$('pbsColorText').value;readIntoWorking();preview()}));
  }

  function fill(p){working={...DEFAULT_PROFILE,...p};$('pbsCompany').value=working.company_name||'';$('pbsColor').value=safeColor(working.brand_color);$('pbsColorText').value=safeColor(working.brand_color);$('pbsFullName').value=working.full_name||'';$('pbsTitleField').value=working.professional_title||'';$('pbsLicense').value=working.license_number||'';$('pbsEmail').value=working.email||user()?.email||'';$('pbsPhone').value=working.phone||'';$('pbsWebsite').value=working.website||'';$('pbsFooter').value=working.report_footer||'';$('pbsDisclaimer').value=working.report_disclaimer||'';preview()}
  function readIntoWorking(){working={...working,company_name:$('pbsCompany').value.trim(),brand_color:safeColor($('pbsColorText').value.trim()||$('pbsColor').value),full_name:$('pbsFullName').value.trim(),professional_title:$('pbsTitleField').value.trim(),license_number:$('pbsLicense').value.trim(),email:$('pbsEmail').value.trim(),phone:$('pbsPhone').value.trim(),website:$('pbsWebsite').value.trim(),report_footer:$('pbsFooter').value.trim(),report_disclaimer:$('pbsDisclaimer').value.trim()}}
  function preview(){const color=safeColor(working.brand_color),cover=$('pbsCover');cover.style.setProperty('--pbs-color',color);cover.style.setProperty('--pbs-text',contrast(color));$('pbsPreviewCompany').textContent=(working.company_name||'YOUR COMPANY').toUpperCase();$('pbsPreviewByline').textContent='Prepared by '+([working.full_name||'Your Name',working.professional_title].filter(Boolean).join(' • '));$('pbsPreviewContact').innerHTML=`<b>Contact</b><br>${esc([working.email,working.phone,working.website].filter(Boolean).join(' • ')||'Email • Phone • Website')}`;const logo=$('pbsCoverLogo'),box=$('pbsLogoBox');if(working.logo_url){logo.src=working.logo_url;logo.style.display='block';box.innerHTML=`<img src="${esc(working.logo_url)}" alt="Logo preview">`;}else{logo.style.display='none';logo.removeAttribute('src');box.innerHTML='<span>No logo uploaded</span>';}}
  function status(t){if($('pbsStatus'))$('pbsStatus').textContent=t}
  function logoStatus(t){if($('pbsLogoStatus'))$('pbsLogoStatus').textContent=t}
  async function load(){const u=user(),c=client();if(!u||!c){fill(DEFAULT_PROFILE);return}const {data,error}=await c.from('profiles').select('*').eq('user_id',u.id).maybeSingle();if(error){status(error.message);return}fill({...DEFAULT_PROFILE,...(data||{}),email:data?.email||u.email||''})}
  async function uploadLogo(e){const u=user(),c=client(),file=e.target.files?.[0];if(!u||!c)return logoStatus('Sign in before uploading a logo.');if(!file)return;if(!/^image\/(png|jpeg|webp|gif)$/i.test(file.type))return logoStatus('Choose a PNG, JPG, WEBP or GIF image.');if(file.size>2*1024*1024)return logoStatus('Logo must be 2 MB or smaller.');const ext=(file.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${u.id}/logo-${Date.now()}.${ext}`;logoStatus('Uploading logo…');const {data,error}=await c.storage.from(BUCKET).upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false});if(error)return logoStatus(error.message);const pub=c.storage.from(BUCKET).getPublicUrl(data.path);working.logo_url=pub.data?.publicUrl||'';logoStatus('Logo uploaded. Save the profile to use it on reports.');preview();e.target.value=''}
  function removeLogo(){working.logo_url='';logoStatus('Logo removed from this profile. Save to apply the change.');preview()}
  async function save(){const u=user(),c=client();if(!u||!c)return status('Sign in to save your profile.');readIntoWorking();status('Saving profile…');const payload={user_id:u.id,...working,updated_at:new Date().toISOString()};const {data,error}=await c.from('profiles').upsert(payload,{onConflict:'user_id'}).select().single();if(error)return status(error.message);working={...DEFAULT_PROFILE,...data};status('Profile saved.');try{await window.UserBranding?.loadProfile?.();window.UserBranding?.applyReportBranding?.();}catch(e){}setTimeout(hide,500)}
  function show(){if(!user()){try{showAuth()}catch(e){}return}load();$('profileBrandModal').classList.remove('hidden')}
  function hide(){$('profileBrandModal')?.classList.add('hidden')}
  function wire(){const b=$('profileBrandBtn');if(b)b.onclick=show}
  function start(){styles();modal();wire();setInterval(wire,900)}
  window.UserBrandStudio={open:show,load,save,uploadLogo};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
