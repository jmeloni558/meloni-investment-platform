'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisKeyboardInputTabV||0)>=VERSION)return;
  window.__propertyThesisKeyboardInputTabV=VERSION;

  function visible(el){
    if(!el||el.disabled||el.type==='hidden')return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden')return false;
    const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0;
  }

  function inActiveContext(el){
    const modal=el.closest('[role="dialog"],.modal,.auth-modal,.profile-modal');
    if(modal)return visible(modal);
    const section=el.closest('.section');
    if(section)return section.classList.contains('active');
    return true;
  }

  function inputs(){
    return [...document.querySelectorAll('input,select,textarea')]
      .filter(el=>visible(el)&&inActiveContext(el)&&!el.readOnly&&el.tabIndex!==-1);
  }

  function move(e){
    if(e.key!=='Tab'||e.altKey||e.ctrlKey||e.metaKey)return;
    const list=inputs();
    if(!list.length){e.preventDefault();return;}
    const current=document.activeElement;
    let idx=list.indexOf(current);
    if(idx<0)idx=e.shiftKey?0:-1;
    let next=e.shiftKey?idx-1:idx+1;
    if(next<0)next=list.length-1;
    if(next>=list.length)next=0;
    e.preventDefault();
    const target=list[next];
    try{target.focus({preventScroll:true});}catch(_e){target.focus();}
    try{target.scrollIntoView({block:'nearest',inline:'nearest'});}catch(_e){}
    if(target instanceof HTMLInputElement&&/^(text|number|email|tel|url|search|password)$/i.test(target.type)){
      try{target.select();}catch(_e){}
    }
  }

  document.addEventListener('keydown',move,true);
  window.PropertyThesisKeyboardInputTab={version:VERSION,inputs};
})();
