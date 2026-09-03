'use strict';
(()=>{
  try{if('scrollRestoration' in history)history.scrollRestoration='auto'}catch(_e){}
  const top=()=>window.scrollTo(0,0);
  const params=new URLSearchParams(location.search);
  const RETURN_KEY='pt-scroll-return-v1';
  let returnPosition=null;
  try{
    const candidate=JSON.parse(sessionStorage.getItem(RETURN_KEY)||'null');
    if(candidate?.path===location.pathname&&Date.now()-Number(candidate.at)<30*60*1000)returnPosition=Number(candidate.y);
    if(candidate?.path===location.pathname)sessionStorage.removeItem(RETURN_KEY);
  }catch(_e){}
  const savedY=Number.isFinite(returnPosition)?returnPosition:Number(history.state?.ptScrollY);
  let scrollFrame=0;
  const remember=()=>{
    scrollFrame=0;
    try{history.replaceState({...history.state,ptScrollY:Math.max(0,Math.round(scrollY))},'');}catch(_e){}
  };
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(remember);},{passive:true});
  addEventListener('pagehide',remember);
  document.addEventListener('click',event=>{
    const link=event.target?.closest?.('a[href]');
    if(!link||link.matches('.pt-site-brand')||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    try{const target=new URL(link.href,location.href);if(target.origin===location.origin&&target.pathname!==location.pathname)sessionStorage.setItem(RETURN_KEY,JSON.stringify({path:location.pathname,y:scrollY,at:Date.now()}));}catch(_e){}
  },true);
  document.addEventListener('click',event=>{
    const home=event.target?.closest?.('.pt-site-brand');
    if(!home||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();event.stopImmediatePropagation();location.href=location.origin+'/index.html?home=1&cb='+Date.now();
  },true);
  if(params.get('home')==='1'){
    history.replaceState({ptScrollY:0},'','/');
    top();
    requestAnimationFrame(top);
    return;
  }
  if(Number.isFinite(savedY)&&savedY>0){
    addEventListener('DOMContentLoaded',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:savedY,behavior:'instant'}))),{once:true});
  }
})();
