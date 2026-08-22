'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV9ControlsVersion||0)>=VERSION)return;
  window.__reportBuilderV9ControlsVersion=VERSION;

  function ensureStyles(){
    let st=document.getElementById('rbV9ControlStyles');
    if(!st){st=document.createElement('style');st.id='rbV9ControlStyles';document.head.appendChild(st);}
    st.textContent=`
      #rbControls .rb-control-grid{grid-template-columns:minmax(220px,.72fr) minmax(0,2.28fr)!important;gap:18px!important}
      #rbControls .rb-sections-panel{min-width:0}
      #rbControls .rb-section-presets{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;padding:0}
      #rbControls .rb-section-presets-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#667085}
      #rbControls .rb-section-preset-actions{display:flex;gap:7px;flex-wrap:wrap}
      #rbControls .rb-section-preset-actions .btn{padding:7px 10px;font-size:9px}
      #rbControls .rb-actions{margin-top:10px!important}
      #rbControls .rb-actions #rbRefresh,#rbControls .rb-actions #rbDownloadPdf{min-width:118px}
      #rbControls .rb-pass2-actions,#rbControls .rb-export-note,#rbControls .rb-pass3-note{display:none!important}
      @media(max-width:900px){#rbControls .rb-section-presets{align-items:flex-start;flex-direction:column}}
    `;
  }

  function apply(){
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    ensureStyles();

    const badge=controls.querySelector('.badge');
    if(badge)badge.textContent='Client Report';

    const grid=controls.querySelector('.rb-control-grid');
    const toggles=controls.querySelector('.rb-toggle-grid');
    const core=document.getElementById('rbSelectCore');
    const all=document.getElementById('rbSelectAll');
    const refresh=document.getElementById('rbRefresh');
    const download=document.getElementById('rbDownloadPdf');
    if(refresh)refresh.textContent='Refresh Preview';

    if(grid&&toggles){
      let panel=controls.querySelector('.rb-sections-panel');
      if(!panel){
        panel=document.createElement('div');
        panel.className='rb-sections-panel';
        toggles.insertAdjacentElement('beforebegin',panel);
        panel.appendChild(toggles);
      }
      let presets=panel.querySelector('.rb-section-presets');
      if(!presets){
        presets=document.createElement('div');
        presets.className='rb-section-presets';
        presets.innerHTML='<span class="rb-section-presets-label">Report detail</span><div class="rb-section-preset-actions"></div>';
        panel.insertBefore(presets,panel.firstChild);
      }
      const presetActions=presets.querySelector('.rb-section-preset-actions');
      if(core&&core.parentElement!==presetActions){core.className='btn secondary';presetActions.appendChild(core);}
      if(all&&all.parentElement!==presetActions){all.className='btn ghost';presetActions.appendChild(all);}
    }

    const mainActions=controls.querySelector('.rb-actions');
    if(mainActions&&download&&download.parentElement!==mainActions){
      download.className='btn primary';
      mainActions.appendChild(download);
    }

    document.getElementById('rbPrintReport')?.remove();
    document.getElementById('rbRefreshExport')?.remove();
    controls.querySelector('.rb-export-note')?.remove();
    controls.querySelector('.rb-pass3-note')?.remove();
    const emptyPass2=controls.querySelector('.rb-pass2-actions');
    if(emptyPass2&&!emptyPass2.children.length)emptyPass2.remove();
    return true;
  }

  function schedule(){setTimeout(apply,0);setTimeout(apply,80);setTimeout(apply,220);}
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll,#rbDownloadPdf'))schedule();
  },true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);

  window.ReportBuilderV9Controls={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
