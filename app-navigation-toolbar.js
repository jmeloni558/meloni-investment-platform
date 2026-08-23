'use strict';
(()=>{
  const VERSION=8;
  if((window.__appNavigationToolbarV||0)>=VERSION)return;
  window.__appNavigationToolbarV=VERSION;

  const advanced=['debt','amort','buydown','scenarios'];
  const retired=new Set(['cashflow','taxes','support','cloud']);
  const primary=['assumptions','dashboard','report'];

  function activeSection(){return document.querySelector('.section.active')?.id||'';}

  function go(id){
    if(retired.has(id))id='dashboard';
    try{if(window.WorkflowNavigationController?.go){window.WorkflowNavigationController.go(id);return;}}catch(e){}
    try{if(typeof switchTab==='function')switchTab(id);}catch(e){}
  }

  function newAnalysis(){try{window.WorkflowNavigationController?.newAnalysis?.();}catch(e){}setTimeout(refresh,0);}
  async function openExisting(){
    try{
      if(typeof cloudUser!=='undefined'&&!cloudUser){if(typeof showAuth==='function')showAuth();return;}
      if(typeof refreshCloud==='function')await refreshCloud();
      if(typeof switchTab==='function')switchTab('propertyhub');else go('propertyhub');
      try{window.Stage6Dashboard?.render?.();}catch(_e){}
    }catch(e){
      try{if(typeof switchTab==='function')switchTab('propertyhub');else go('propertyhub');}catch(_e){}
      try{window.Stage6Dashboard?.render?.();}catch(_e){}
    }
    setTimeout(refresh,0);
  }

  function toggleAdvanced(){
    const panel=document.getElementById('appNavAdvancedPanel'),btn=document.getElementById('appNavAdvanced');
    if(!panel||!btn)return;
    const open=panel.hidden;panel.hidden=!open;btn.setAttribute('aria-expanded',String(open));refresh();
  }

  function ensureStyles(){
    let st=document.getElementById('appNavigationToolbarStyles');if(!st){st=document.createElement('style');st.id='appNavigationToolbarStyles';document.head.appendChild(st)}
    st.textContent=`
      .app-nav-shell{margin:14px 0 12px;border:1px solid #d8e1e9;border-radius:13px;background:#fff;box-shadow:0 7px 24px rgba(16,24,40,.055);overflow:hidden}
      .app-nav-toolbar{display:flex;align-items:center;gap:7px;padding:10px}
      .app-nav-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.app-nav-action{appearance:none;border:1px solid #d7e0e8;border-radius:8px;background:#fff;padding:9px 12px;font-size:9.5px;font-weight:800;color:#344054;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,color .15s,box-shadow .15s}.app-nav-action:hover{background:#f5f8fa}.app-nav-action.active{background:#175c92!important;border-color:#175c92!important;color:#fff!important;box-shadow:0 4px 12px rgba(23,92,146,.18)}
      .app-nav-advanced{display:flex;gap:6px;flex-wrap:wrap;padding:9px 10px;border-top:1px solid #e5eaf0;background:#f8fafc}.app-nav-advanced[hidden]{display:none}.app-nav-advanced button{appearance:none;border:1px solid #d7e0e8;border-radius:7px;background:#fff;padding:7px 9px;font-size:8.5px;color:#344054;cursor:pointer}.app-nav-advanced button:hover{background:#eef5fb;border-color:#b9cddd}.app-nav-advanced button.active{background:#eef6fb;border-color:#9dc0db;color:#175c92;font-weight:800}
      .tab[data-tab="cashflow"],.tab[data-tab="taxes"],.tab[data-tab="support"],.tab[data-tab="cloud"],[data-app-advanced="cashflow"],[data-app-advanced="taxes"],[data-app-advanced="support"],[data-app-advanced="cloud"],[data-s8-advanced="cashflow"],[data-s8-advanced="taxes"],[data-s8-advanced="support"],[data-s8-advanced="cloud"]{display:none!important}
      #cashflow,#taxes,#support,#cloud{display:none!important}
      #stage8Workflow.app-toolbar-clean .s8-context{display:none!important}#stage8Workflow.app-toolbar-clean #s10Utilities{display:none!important}#stage8Workflow.app-toolbar-clean .s10-workflow-row{border-top:1px solid var(--line);border-radius:10px}#stage8Workflow.app-toolbar-clean{margin-top:0}
      #report .s8-help{display:none!important}
      @media(max-width:700px){.app-nav-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}.app-nav-action{width:100%}}
      @media(max-width:480px){.app-nav-actions{grid-template-columns:1fr}}
    `;
  }

  function ensureToolbar(){
    const workflow=document.getElementById('stage8Workflow');if(!workflow)return false;
    ensureStyles();
    let shell=document.getElementById('appNavShell');
    if(!shell){
      shell=document.createElement('div');shell.id='appNavShell';shell.className='app-nav-shell screen-only';
      shell.innerHTML=`
        <nav class="app-nav-toolbar" aria-label="Application tools">
          <div class="app-nav-actions">
            <button class="app-nav-action" id="appNavNew">New Analysis</button>
            <button class="app-nav-action" id="appNavExisting">Existing Properties</button>
            <button class="app-nav-action" id="appNavAdvanced" aria-expanded="false">Advanced Tools</button>
          </div>
        </nav>
        <div class="app-nav-advanced" id="appNavAdvancedPanel" hidden>
          <button data-app-advanced="debt">Debt Service</button><button data-app-advanced="amort">Amortization</button><button data-app-advanced="buydown">Rate Buydown</button><button data-app-advanced="scenarios">Scenario Lab</button>
        </div>`;
      workflow.insertAdjacentElement('beforebegin',shell);
      shell.querySelectorAll('[data-app-advanced]').forEach(btn=>btn.addEventListener('click',()=>{go(btn.dataset.appAdvanced);document.getElementById('appNavAdvancedPanel').hidden=true;document.getElementById('appNavAdvanced')?.setAttribute('aria-expanded','false');setTimeout(refresh,0)}));
      document.getElementById('appNavNew').addEventListener('click',newAnalysis);
      document.getElementById('appNavExisting').addEventListener('click',openExisting);
      document.getElementById('appNavAdvanced').addEventListener('click',toggleAdvanced);
    }else{
      shell.querySelectorAll('[data-app-advanced]').forEach(btn=>{if(retired.has(btn.dataset.appAdvanced))btn.remove();});
    }
    return true;
  }

  function cleanWorkflow(){const workflow=document.getElementById('stage8Workflow');if(!workflow)return false;workflow.classList.add('app-toolbar-clean');return true;}

  function retireLegacyNavigation(){
    document.querySelectorAll('.tab[data-tab],[data-app-advanced],[data-s8-advanced]').forEach(el=>{const id=el.dataset.tab||el.dataset.appAdvanced||el.dataset.s8Advanced;if(retired.has(id))el.hidden=true;});
    const active=activeSection();
    if(retired.has(active))go('dashboard');
  }

  function refresh(){
    if(!ensureToolbar())return false;cleanWorkflow();retireLegacyNavigation();
    const active=activeSection();
    const panel=document.getElementById('appNavAdvancedPanel');
    const panelOpen=!!panel&&!panel.hidden;
    const newBtn=document.getElementById('appNavNew');if(newBtn)newBtn.classList.toggle('active',primary.includes(active)&&!panelOpen);
    const existing=document.getElementById('appNavExisting');if(existing)existing.classList.toggle('active',active==='propertyhub'&&!panelOpen);
    const adv=document.getElementById('appNavAdvanced');if(adv)adv.classList.toggle('active',panelOpen||advanced.includes(active));
    document.querySelectorAll('[data-app-advanced]').forEach(b=>b.classList.toggle('active',b.dataset.appAdvanced===active));
    return true;
  }

  function start(){let tries=0;const timer=setInterval(()=>{if(refresh())clearInterval(timer);if(++tries>80)clearInterval(timer)},120);document.addEventListener('click',()=>setTimeout(refresh,0));}
  window.AppNavigationToolbar={refresh,go,openExisting};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
