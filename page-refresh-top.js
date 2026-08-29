'use strict';
(()=>{
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_e){}
  const top=()=>window.scrollTo(0,0);
  top();
  const params=new URLSearchParams(location.search);
  if(params.get('free-analysis')==='1')return;
  addEventListener('DOMContentLoaded',top,{once:true});
  addEventListener('load',top,{once:true});
  addEventListener('pageshow',top,{once:true});
})();
