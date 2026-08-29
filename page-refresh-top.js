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
  };
  const lockTop=()=>{locked=true;top();setTimeout(release,2500)};
  const releaseForIntent=()=>release();
  addEventListener('wheel',releaseForIntent,{passive:true});
  addEventListener('touchstart',releaseForIntent,{passive:true});
  addEventListener('pointerdown',releaseForIntent,{passive:true});
  addEventListener('keydown',releaseForIntent,{passive:true});
  addEventListener('DOMContentLoaded',top,{once:true});
  addEventListener('load',lockTop,{once:true});
  addEventListener('pageshow',event=>{if(event.persisted)lockTop()});
  setTimeout(release,3000);
})();
