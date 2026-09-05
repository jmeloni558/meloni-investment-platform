'use strict';
(()=>{
  const navSelector='.pt-guest-nav,.pricing-nav,.glossary-nav,.guide-nav,.pt-site-nav,.sample-toolbar';
  const isStart=node=>/^start\s+(?:(?:my|your)\s+)?free\s+analysis\b/i.test(node.textContent.trim());
  const route=href=>{try{return new URL(href,location.href).pathname.split('/').pop()||'index.html';}catch{return '';}};
  function refresh(){
    document.querySelectorAll('a,button').forEach(node=>{
      if(isStart(node)&&!node.classList.contains('pt-free-analysis-cta'))node.classList.add('pt-free-analysis-cta');
    });
    document.querySelectorAll(navSelector).forEach(nav=>{
      if(nav.dataset.accountToolbar)return;
      if(!nav.querySelector('a[href="guides.html"]')){
        const link=document.createElement('a');link.href='guides.html';link.textContent='Guides';
        const signIn=[...nav.querySelectorAll('a,button')].find(node=>/sign in/i.test(node.textContent));
        signIn?nav.insertBefore(link,signIn):nav.appendChild(link);
      }
      if(!nav.classList.contains('pt-public-navigation'))nav.classList.add('pt-public-navigation');
      const page=route(location.href),guide=!!document.querySelector('.guide-shell');
      const listings=document.body.classList.contains('pt-guest-listings')||document.querySelector('#ptListingsPanel.is-open');
      nav.querySelectorAll('a,button').forEach(node=>{
        const target=route(node.getAttribute('href')||'');
        const current=!isStart(node)&&((listings&&/search listings/i.test(node.textContent))||(!listings&&node.hasAttribute('href')&&target!=='index.html'&&(target===page||(guide&&target==='guides.html'))));
        if(node.classList.contains('active')!==!!current)node.classList.toggle('active',!!current);
        if(current&&node.getAttribute('aria-current')!=='page')node.setAttribute('aria-current','page');
        else if(!current&&node.hasAttribute('aria-current'))node.removeAttribute('aria-current');
      });
    });
  }
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});};
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','data-account-toolbar']});
  addEventListener('popstate',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();
