'use strict';
(()=>{
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_e){}
  const top=()=>window.scrollTo(0,0);
  top();
  addEventListener('DOMContentLoaded',top,{once:true});
  addEventListener('load',()=>{top();setTimeout(top,50);setTimeout(top,250);setTimeout(top,800)},{once:true});
  addEventListener('pageshow',top,{once:true});
})();
