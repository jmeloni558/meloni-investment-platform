'use strict';
(()=>{
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_e){}
  const top=()=>window.scrollTo(0,0);
  top();
  const params=new URLSearchParams(location.search);
  if(params.get('free-analysis')==='1')return;
  const nativeScrollTo=window.scrollTo.bind(window);
  const nativeScrollBy=window.scrollBy.bind(window);
  const nativeScrollIntoView=Element.prototype.scrollIntoView;
  let locked=true;
  const holdTop=()=>{if(locked&&window.scrollY!==0)nativeScrollTo(0,0)};
  window.scrollTo=(...args)=>locked?nativeScrollTo(0,0):nativeScrollTo(...args);
  window.scrollBy=(...args)=>locked?nativeScrollTo(0,0):nativeScrollBy(...args);
  Element.prototype.scrollIntoView=function(...args){return locked?nativeScrollTo(0,0):nativeScrollIntoView.apply(this,args)};
  addEventListener('scroll',holdTop,{passive:true});
  const release=()=>{
    if(!locked)return;
    locked=false;
    removeEventListener('scroll',holdTop);
    window.scrollTo=nativeScrollTo;
    window.scrollBy=nativeScrollBy;
    Element.prototype.scrollIntoView=nativeScrollIntoView;
  };
  addEventListener('DOMContentLoaded',top,{once:true});
  addEventListener('load',()=>{top();setTimeout(release,600)},{once:true});
  addEventListener('pageshow',top,{once:true});
  setTimeout(release,3500);
})();
