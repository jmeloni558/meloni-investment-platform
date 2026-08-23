'use strict';
(() => {
  const VERSION=1;
  if((window.__reviewResultsNavFixVersion||0)>=VERSION)return;
  window.__reviewResultsNavFixVersion=VERSION;

  function activateDashboardFallback(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return false;
    document.querySelectorAll('.section.active').forEach(el=>el.classList.remove('active'));
    dashboard.classList.add('active');
    document.querySelectorAll('.tab.active').forEach(el=>el.classList.remove('active'));
    document.querySelector('.tab[data-tab="dashboard"]')?.classList.add('active');
    document.querySelectorAll('[data-s8-tab].active').forEach(el=>el.classList.remove('active'));
    document.querySelector('[data-s8-tab="dashboard"]')?.classList.add('active');
    try{window.Stage8Workflow?.refresh?.();}catch(e){}
    window.scrollTo({top:document.querySelector('.shell')?.offsetTop||0,behavior:'smooth'});
    return true;
  }

  function openReviewResults(){
    try{
      if(typeof readFields==='function')readFields();
      if(typeof render==='function')render();
    }catch(e){}
    try{
      if(typeof switchTab==='function')switchTab('dashboard');
    }catch(e){}
    setTimeout(()=>{
      if(!document.getElementById('dashboard')?.classList.contains('active'))activateDashboardFallback();
      try{window.Stage8Workflow?.refresh?.();}catch(e){}
    },0);
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('[data-s8-tab="dashboard"]');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation?.();
    openReviewResults();
  },true);

  window.ReviewResultsNavFix={open:openReviewResults};
})();
