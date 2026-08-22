'use strict';
(()=>{
  const VERSION=1;
  if((window.__appNavigationToolbarV||0)>=VERSION)return;
  window.__appNavigationToolbarV=VERSION;

  const primary=['assumptions','dashboard','report'];
  const advanced=['cashflow','debt','taxes','amort','buydown','scenarios','support','cloud'];

  function activeSection(){return document.querySelector('.section.active')?.id||'';}

  function go(id){
    const active=activeSection();
    if(id==='dashboard'&&active==='assumptions'){
      try{window.WorkflowNavigationController?.reviewResults?.();return;}catch(e){}
    }
    try{if(window.WorkflowNavigationController?.go){window.WorkflowNavigationController.go(id);return;}}catch(e){}
    try{if(typeof switchTab==='function')switchTab(id);}catch(e){}
  }

  function ensureStyles(){
    if(document.getElementById('appNavigationToolbarStyles'))return;
    const st=document.createElement('style');st.id='appNavigationToolbarStyles';st.textContent=`
      .app-nav-toolbar{display:flex;align-items:stretch;justify-content:space-between;gap:14px;margin:14px 0 10px;padding:10px;border:1px solid #d8e1e9;border-radius:13px;background:#fff;box-shadow:0 7px 24px rgba(16,24,40,.055)}
      .app-nav-brand{min-width:185px;padding:5px 8px;display:flex;flex-direction:column;justify-content:center}.app-nav-brand span{font-size:8px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#175c92}.app-nav-brand b{font-size:13px;color:#172033;margin-top:2px}.app-nav-brand small{font-size:8.5px;color:#667085;margin-top:2px;line-height:1.35}
      .app-nav-pages{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:7px;flex:1;max-width:710px}.app-nav-page{appearance:none;border:1px solid #d7e0e8;border-radius:9px;background:#f9fbfc;padding:9px 11px;display:flex;gap:9px;align-items:center;text-align:left;cursor:pointer}.app-nav-page:hover{background:#f2f7fb;border-color:#b9cddd}.app-nav-page.active{background:#eef6fb;border-color:#9dc0db;box-shadow:inset 0 -2px #175c92}.app-nav-num{width:25px;height:25px;flex:0 0 25px;border-radius:7px;background:#e8edf2;display:grid;place-items:center;font-size:9px;font-weight:900;color:#475467}.app-nav-page.active .app-nav-num{background:#175c92;color:#fff}.app-nav-page b{display:block;font-size:10.5px;color:#27364a}.app-nav-page small{display:block;font-size:8px;color:#667085;margin-top:2px;line-height:1.25}
      #stage8Workflow.app-toolbar-organized .s10-utilities{margin:0;border-radius:0;border-left:1px solid var(--line);border-right:1px solid var(--line);border-top:0;border-bottom:0;background:#f8fafc}#stage8Workflow.app-toolbar-organized .s10-workflow-row{border-top:1px solid var(--line);border-radius:0 0 10px 10px}#stage8Workflow.app-toolbar-organized .s8-context{border-radius:10px 10px 0 0}
      @media(max-width:850px){.app-nav-toolbar{display:block}.app-nav-brand{padding-bottom:9px}.app-nav-pages{max-width:none}.app-nav-page{min-width:0}}
      @media(max-width:620px){.app-nav-pages{grid-template-columns:1fr}.app-nav-toolbar{padding:8px}.app-nav-brand{min-width:0}}
    `;document.head.appendChild(st);
  }

  function ensureToolbar(){
    const workflow=document.getElementById('stage8Workflow');if(!workflow)return false;
    ensureStyles();
    let bar=document.getElementById('appNavToolbar');
    if(!bar){
      bar=document.createElement('nav');bar.id='appNavToolbar';bar.className='app-nav-toolbar screen-only';bar.setAttribute('aria-label','Analysis page navigation');
      bar.innerHTML=`<div class="app-nav-brand"><span>Analysis Navigation</span><b id="appNavCurrent">Analysis Setup</b><small id="appNavGuide">Enter the property and investment assumptions.</small></div><div class="app-nav-pages"><button class="app-nav-page" data-app-page="assumptions"><span class="app-nav-num">1</span><span><b>Analysis Setup</b><small>Property, income & financing</small></span></button><button class="app-nav-page" data-app-page="dashboard"><span class="app-nav-num">2</span><span><b>Review Results</b><small>Returns, value & cash flow</small></span></button><button class="app-nav-page" data-app-page="report"><span class="app-nav-num">3</span><span><b>Client Report</b><small>Conclusion & branded PDF</small></span></button></div>`;
      workflow.insertAdjacentElement('beforebegin',bar);
      bar.querySelectorAll('[data-app-page]').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.appPage)));
    }
    return true;
  }

  function organizeUtilities(){
    const workflow=document.getElementById('stage8Workflow');
    const utilities=document.getElementById('s10Utilities');
    const steps=workflow?.querySelector('.s8-steps');
    if(!workflow||!utilities||!steps)return false;
    if(utilities.nextElementSibling!==steps)workflow.insertBefore(utilities,steps);
    workflow.classList.add('app-toolbar-organized');
    return true;
  }

  function refresh(){
    if(!ensureToolbar())return false;
    organizeUtilities();
    const active=activeSection();
    document.querySelectorAll('#appNavToolbar [data-app-page]').forEach(btn=>btn.classList.toggle('active',btn.dataset.appPage===active));
    const title=document.getElementById('appNavCurrent'),guide=document.getElementById('appNavGuide');
    const map={
      assumptions:['Analysis Setup','Enter the property and investment assumptions, then continue through the guided setup.'],
      dashboard:['Review Results','Review value, returns, coverage and cash flow before preparing the client report.'],
      report:['Client Report','Finalize the conclusion and generate the client-facing report.'],
      propertyhub:['Existing Properties','Open a saved property or start a new analysis, then return to Analysis Setup.'],
      propertyfile:['Existing Property','Review the saved property and return to Analysis Setup when ready.']
    };
    const text=map[active]||(advanced.includes(active)?['Advanced Tools','You are in a detailed analysis tool. Use the toolbar above to return to the primary workflow.']:['Investment Property Analyzer','Use the three primary pages to move through the analysis.']);
    if(title)title.textContent=text[0];if(guide)guide.textContent=text[1];
    return true;
  }

  function start(){
    let tries=0;const timer=setInterval(()=>{if(refresh()&&document.getElementById('s10Utilities')){clearInterval(timer);}if(++tries>80)clearInterval(timer);},120);
    document.addEventListener('click',()=>setTimeout(refresh,0));
    window.addEventListener('resize',()=>setTimeout(refresh,0));
  }

  window.AppNavigationToolbar={refresh,go};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
