'use strict';
(()=>{
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_e){}
  const top=()=>window.scrollTo(0,0);
  top();
  const params=new URLSearchParams(location.search);
  document.addEventListener('click',event=>{
    const home=event.target?.closest?.('a.pt-site-brand');
    if(!home||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();location.href=location.origin+'/index.html?home=1&cb='+Date.now();
  },true);
  if(params.get('home')==='1'){
    history.replaceState(null,'','/');
    [0,40,120,300,700].forEach(ms=>setTimeout(top,ms));
    return;
  }
  if(params.get('free-analysis')==='1')return;
  let locked=true;
  const release=()=>{
    if(!locked)return;
    locked=false;
  };
  const lockTop=()=>{locked=true;top();requestAnimationFrame(top);setTimeout(release,120)};
  const releaseForIntent=()=>release();
  addEventListener('wheel',releaseForIntent,{passive:true});
  addEventListener('touchstart',releaseForIntent,{passive:true});
  addEventListener('pointerdown',releaseForIntent,{passive:true});
  addEventListener('keydown',releaseForIntent,{passive:true});
  addEventListener('DOMContentLoaded',top,{once:true});
  addEventListener('load',lockTop,{once:true});
  addEventListener('pageshow',event=>{if(event.persisted)lockTop()});
  setTimeout(release,180);
})();
