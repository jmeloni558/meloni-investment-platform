'use strict';
(()=>{
  const VERSION=15;
  if((window.__appNavigationToolbarV||0)>=VERSION)return;
  window.__appNavigationToolbarV=VERSION;

  const retired=new Set(['cashflow','debt','taxes','amort','support','cloud','buydown']);
  const contextualOnly=new Set(['scenarios']);
  const primary=['assumptions','dashboard','report'];
  let mortgageMode=false;

  function activeSection(){return document.querySelector('.section.active')?.id||'';}

  function ensureMortgagePanel(){
    let panel=document.getElementById('appMortgageToolsPanel');
    if(panel)return panel;
    const workflow=document.getElementById('stage8Workflow');
    if(!workflow)return null;
    panel=document.createElement('section');
    panel.id='appMortgageToolsPanel';
    panel.className='screen-only';
    panel.style.display='none';
    panel.innerHTML=`<iframe id="appMortgageToolsFrame" title="PropertyThesis Mortgage Tools" src="mortgage-tools.html?embedded=1&v=20260823-1619" style="width:100%;min-height:1500px;border:0;background:transparent;display:block"></iframe>`;
    workflow.insertAdjacentElement('beforebegin',panel);
    const frame=panel.querySelector('iframe');
    const fit=()=>{try{const d=frame.contentDocument;if(!d)return;const h=Math.max(d.documentElement.scrollHeight,d.body.scrollHeight);frame.style.height=(h+20)+'px';}catch(e){}};
    frame.addEventListener('load',()=>{fit();setTimeout(fit,150);setTimeout(fit,700);try{new frame.contentWindow.ResizeObserver(fit).observe(frame.contentDocument.body)}catch(e){}});
    return panel;
  }

  function setMortgageMode(on){
    mortgageMode=!!on;
    const panel=ensureMortgagePanel();
    if(panel)panel.style.display=on?'block':'none';
    document.querySelectorAll('.section').forEach(s=>{
      if(on){
        if(s.classList.contains('active'))s.dataset.ptWasActive='1';
        s.style.display='none';
      }else{
        s.style.removeProperty('display');
        if(s.dataset.ptWasActive==='1'){delete s.dataset.ptWasActive;}
      }
    });
    const workflow=document.getElementById('stage8Workflow');
    if(workflow)workflow.style.display=on?'none':'';
    const mortgage=document.getElementById('appNavMortgage');
    if(mortgage)mortgage.classList.toggle('active',on);
    const newBtn=document.getElementById('appNavNew');if(newBtn)newBtn.classList.toggle('active',!on&&primary.includes(activeSection()));
    const existing=document.getElementById('appNavExisting');if(existing)existing.classList.toggle('active',!on&&activeSection()==='propertyhub');
  }

  function go(id){
    setMortgageMode(false);
    if(retired.has(id))id='dashboard';
    try{if(window.WorkflowNavigationController?.go){window.WorkflowNavigationController.go(id);return;}}catch(e){}
    try{if(typeof switchTab==='function')switchTab(id);}catch(e){}
  }

  function newAnalysis(){setMortgageMode(false);try{window.WorkflowNavigationController?.newAnalysis?.();}catch(e){}setTimeout(refresh,0);}
  async function openExisting(){
    setMortgageMode(false);
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

  function openMortgageTools(){
    ensureMortgagePanel();
    setMortgageMode(true);
    window.scrollTo({top:document.getElementById('appNavShell')?.offsetTop||0,behavior:'smooth'});
  }

  function ensureStyles(){
    let st=document.getElementById('appNavigationToolbarStyles');if(!st){st=document.createElement('style');st.id='appNavigationToolbarStyles';document.head.appendChild(st)}
    st.textContent=`
      .app-nav-shell{margin:14px 0 12px;border:1px solid #d8e1e9;border-radius:13px;background:#fff;box-shadow:0 7px 24px rgba(16,24,40,.055);overflow:hidden}
      .app-nav-toolbar{display:flex;align-items:center;gap:7px;padding:10px}
      .app-nav-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.app-nav-action{appearance:none;border:1px solid #d7e0e8;border-radius:8px;background:#fff;padding:9px 12px;font-size:9.5px;font-weight:800;color:#344054;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,color .15s,box-shadow .15s}.app-nav-action:hover{background:#f5f8fa}.app-nav-action.active{background:#175c92!important;border-color:#175c92!important;color:#fff!important;box-shadow:0 4px 12px rgba(23,92,146,.18)}
      #appMortgageToolsPanel{margin:0 0 24px;background:transparent}
      .tab[data-tab="cashflow"],.tab[data-tab="debt"],.tab[data-tab="taxes"],.tab[data-tab="amort"],.tab[data-tab="support"],.tab[data-tab="cloud"],.tab[data-tab="scenarios"],.tab[data-tab="buydown"],[data-app-advanced="cashflow"],[data-app-advanced="debt"],[data-app-advanced="taxes"],[data-app-advanced="amort"],[data-app-advanced="support"],[data-app-advanced="cloud"],[data-app-advanced="scenarios"],[data-app-advanced="buydown"],[data-s8-advanced="cashflow"],[data-s8-advanced="debt"],[data-s8-advanced="taxes"],[data-s8-advanced="amort"],[data-s8-advanced="support"],[data-s8-advanced="cloud"],[data-s8-advanced="scenarios"],[data-s8-advanced="buydown"]{display:none!important}
      #cashflow,#debt,#taxes,#amort,#support,#cloud,#buydown{display:none!important}
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
            <button class="app-nav-action" id="appNavMortgage">Mortgage Tools</button>
          </div>
        </nav>`;
      workflow.insertAdjacentElement('beforebegin',shell);
      document.getElementById('appNavNew').addEventListener('click',newAnalysis);
      document.getElementById('appNavExisting').addEventListener('click',openExisting);
      document.getElementById('appNavMortgage').addEventListener('click',openMortgageTools);
    }
    ensureMortgagePanel();
    return true;
  }

  function cleanWorkflow(){const workflow=document.getElementById('stage8Workflow');if(!workflow)return false;workflow.classList.add('app-toolbar-clean');return true;}

  function retireLegacyNavigation(){
    document.querySelectorAll('.tab[data-tab],[data-app-advanced],[data-s8-advanced]').forEach(el=>{const id=el.dataset.tab||el.dataset.appAdvanced||el.dataset.s8Advanced;if(retired.has(id)||contextualOnly.has(id))el.hidden=true;});
    const active=activeSection();
    if(retired.has(active))go('dashboard');
  }

  function refresh(){
    if(!ensureToolbar())return false;cleanWorkflow();retireLegacyNavigation();
    if(mortgageMode){setMortgageMode(true);return true;}
    const active=activeSection();
    const newBtn=document.getElementById('appNavNew');if(newBtn)newBtn.classList.toggle('active',primary.includes(active));
    const existing=document.getElementById('appNavExisting');if(existing)existing.classList.toggle('active',active==='propertyhub');
    const mortgage=document.getElementById('appNavMortgage');if(mortgage)mortgage.classList.remove('active');
    return true;
  }

  function start(){let tries=0;const timer=setInterval(()=>{if(refresh())clearInterval(timer);if(++tries>80)clearInterval(timer)},120);document.addEventListener('click',()=>setTimeout(refresh,0));}
  window.AppNavigationToolbar={refresh,go,openExisting,openMortgageTools,setMortgageMode};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
