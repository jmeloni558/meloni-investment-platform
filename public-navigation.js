'use strict';
(()=>{
  const navSelector='.pt-guest-nav,.pricing-nav,.glossary-nav,.guide-nav,.pt-site-nav,.sample-toolbar';
  const isStart=node=>/^start\s+(?:(?:my|your)\s+)?free\s+analysis\b/i.test(node.textContent.trim());
  const route=href=>{try{return new URL(href,location.href).pathname.split('/').pop()||'index.html';}catch{return '';}};
  function signedInAppLink(){
    const signOut=document.getElementById('signOutBtn');
    const toolbar=document.querySelector('#appNavShell .app-nav-toolbar,[data-account-toolbar]');
    let link=document.getElementById('ptSignedInPlayApp');
    const visible=signOut&&!signOut.hidden&&!signOut.classList.contains('hidden')&&getComputedStyle(signOut).display!=='none';
    if(!visible){if(link)link.remove();return;}
    if(!toolbar)return;
    let actions=toolbar.querySelector('.pt-account-menu-actions');
    if(!actions){actions=document.createElement('div');actions.className='pt-account-menu-actions';actions.style.cssText='display:contents';toolbar.append(actions);}
    if(signOut.parentElement!==actions)actions.append(signOut);
    if(!link){link=document.createElement('a');link.id='ptSignedInPlayApp';link.href='https://play.google.com/store/apps/details?id=com.propertythesis.app';link.textContent='Google Play App';link.target='_blank';link.rel='noopener noreferrer';}
    const before=document.getElementById('ptPhotoLibrary')?.parentElement===actions?document.getElementById('ptPhotoLibrary'):signOut;
    if(link.nextElementSibling!==before)before.before(link);
    for(const item of [link,signOut]){
      const css='align-items:center;justify-content:center;min-height:40px;padding:9px 12px;border:1px solid #d7e0e8;border-radius:8px;background:#fff;color:#344054;font-size:11px;font-weight:800;line-height:18px;text-decoration:none;white-space:nowrap;cursor:pointer';
      if(item.style.cssText!==css+';')item.style.cssText=css;
    }
    if(toolbar.style.flexWrap!=='wrap')toolbar.style.flexWrap='wrap';
    if(toolbar.style.justifyContent!=='center')toolbar.style.justifyContent='center';
    const primary=toolbar.querySelector('.app-nav-actions');if(primary&&primary.style.display!=='contents')primary.style.display='contents';
  }
  function refresh(){
    signedInAppLink();
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
      const signIn=[...nav.querySelectorAll('a,button')].find(node=>/^sign in$/i.test(node.textContent.trim()));
      if(signIn){
        let appLink=nav.querySelector('[data-pt-play-app]');
        if(!appLink){appLink=document.createElement('a');appLink.dataset.ptPlayApp='1';appLink.href='https://play.google.com/store/apps/details?id=com.propertythesis.app';appLink.textContent='Google Play App';appLink.target='_blank';appLink.rel='noopener noreferrer';}
        if(appLink.nextElementSibling!==signIn)nav.insertBefore(appLink,signIn);
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

