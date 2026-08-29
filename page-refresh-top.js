'use strict';
(()=>{
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_e){}
  const entry=performance.getEntriesByType?.('navigation')?.[0];
  const reloaded=entry?entry.type==='reload':performance.navigation?.type===1;
  if(!reloaded)return;
  const top=()=>window.scrollTo(0,0);
  top();
  addEventListener('DOMContentLoaded',top,{once:true});
  addEventListener('load',()=>{top();setTimeout(top,50);setTimeout(top,250);setTimeout(top,800)},{once:true});
  addEventListener('pageshow',top,{once:true});
})();
