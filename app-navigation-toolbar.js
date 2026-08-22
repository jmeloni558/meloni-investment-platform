'use strict';
(()=>{
  const VERSION=5;
  if((window.__appNavigationToolbarV||0)>=VERSION)return;
  window.__appNavigationToolbarV=VERSION;

  const advanced=['cashflow','debt','taxes','amort','buydown','scenarios','support','cloud'];

  function activeSection(){return document.querySelector('.section.active')?.id||'';}

  function go(id){
    try{if(window.WorkflowNavigationController?.go){window.WorkflowNavigationController.go(id);return;}}catch(e){}
    try{if(typeof switchTab==='function')switchTab(id);}catch(e){}
  }

  function newAnalysis(){try{window.WorkflowNavigationController?.newAnalysis?.();}catch(e){}}
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
  }

  function toggleAdvanced(){
    const panel=document.getElementById('appNavAdvancedPanel'),btn=document.getElementById('appNavAdvanced');
    if(!panel||!btn)return;
    const open=panel.hidden;panel.hidden=!open;btn.setAttribute('aria-expanded',String(open));
  }

  function ensureStyles(){
    let st=document.getElementById('appNavigationToolbarStyles');if(!st){st=document.createElement('style');st.id='appNavigationToolbarStyles';document.head.appendChild(st)}
    st.textContent=`
      .app-nav-shell{margin:14px 0 12px;border:1px solid #d8e1e9;border-radius:13px;background:#fff;box-shadow:0 7px 24px rgba(16,24,40,.055);overflow:hidden}
      .app-nav-toolbar{display:flex;align-items:center;gap:7px;padding:10px}
      .app-nav-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.app-nav-action{appearance:none;border:1px solid #d7e0e8;border-radius:8px;background:#fff;padding:9px 12px;font-size:9.5px;font-weight:800;color:#344054;cursor:pointer;white-space:nowrap}.app-nav-action:hover{background:#f5f8fa}.app-nav-action.primary{background:#175c92;border-color:#175c92;color:#fff}.app-nav-action.active{background:#eef6fb;border-color:#9dc0db;color:#175c92}
      .app-nav-advanced{display:flex;gap:6px;flex-wrap:wrap;padding:9px 10px;border-top:1px solid #e5eaf0;background:#f8fafc}.app-nav-advanced[hidden]{display:none}.app-nav-advanced button{appearance:none;border:1px solid #d7e0e8;border-radius:7px;background:#fff;padding:7px 9px;font-size:8.5px;color:#344054;cursor:pointer}.app-nav-advanced button:hover{background:#eef5fb;border-color:#b9cddd}
      #stage8Workflow.app-toolbar-clean .s8-context{display:none!important}#stage8Workflow.app-toolbar-clean #s10Utilities{display:none!important}#stage8Workflow.app-toolbar-clean .s10-workflow-row{border-top:1px solid var(--line);border-radius:10px}#stage8Workflow.app-toolbar-clean{margin-top:0}
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
            <button class="app-nav-action primary" id="appNavNew">New Analysis</button>
            <button class="app-nav-action" id="appNavExisting">Existing Properties</button>
            <button class="app-nav-action" id="appNavAdvanced" aria-expanded="false">Advanced Tools</button>
          </div>
        </nav>
        <div class="app-nav-advanced" id="appNavAdvancedPanel" hidden>
          <button data-app-advanced="cashflow">Cash Flow</button><button data-app-advanced="debt">Debt Service</button><button data-app-advanced="taxes">Taxes</button><button data-app-advanced="amort">Amortization</button><button data-app-advanced="buydown">Rate Buydown</button><button data-app-advanced="scenarios">Scenario Lab</button><button data-app-advanced="support">Price & Rent Support</button><button data-app-advanced="cloud">Cloud Workspace</button>
        </div>`;
      workflow.insertAdjacentElement('beforebegin',shell);
      shell.querySelectorAll('[data-app-advanced]').forEach(btn=>btn.addEventListener('click',()=>{go(btn.dataset.appAdvanced);document.getElementById('appNavAdvancedPanel').hidden=true;document.getElementById('appNavAdvanced')?.setAttribute('aria-expanded','false')}));
      document.getElementById('appNavNew').addEventListener('click',newAnalysis);
      document.getElementById('appNavExisting').addEventListener('click',openExisting);
      document.getElementById('appNavAdvanced').addEventListener('click',toggleAdvanced);
    }
    return true;
  }

  function cleanWorkflow(){const workflow=document.getElementById('stage8Workflow');if(!workflow)return false;workflow.classList.add('app-toolbar-clean');return true;}

  function refresh(){
    if(!ensureToolbar())return false;cleanWorkflow();
    const active=activeSection();
    const existing=document.getElementById('appNavExisting');if(existing)existing.classList.toggle('active',active==='propertyhub'||active==='propertyfile');
    const adv=document.getElementById('appNavAdvanced');if(adv)adv.classList.toggle('active',advanced.includes(active));
    return true;
  }

  function start(){let tries=0;const timer=setInterval(()=>{if(refresh())clearInterval(timer);if(++tries>80)clearInterval(timer)},120);document.addEventListener('click',()=>setTimeout(refresh,0));}
  window.AppNavigationToolbar={refresh,go,openExisting};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
