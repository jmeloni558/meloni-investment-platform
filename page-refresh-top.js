'use strict';
(()=>{
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_e){}
  const top=()=>window.scrollTo(0,0);
  top();
  const params=new URLSearchParams(location.search);
  if(params.get('free-analysis')==='1')return;
  let locked=true;
  const holdTop=()=>{if(locked&&window.scrollY!==0)window.scrollTo(0,0)};
  addEventListener('scroll',holdTop,{passive:true});
  const release=()=>{
    if(!locked)return;
    locked=false;
    removeEventListener('scroll',holdTop);
  };
  addEventListener('DOMContentLoaded',top,{once:true});
  addEventListener('load',()=>{top();setTimeout(release,100)},{once:true});
  addEventListener('pageshow',top,{once:true});
  setTimeout(release,1200);
})();
