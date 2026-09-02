'use strict';
(()=>{
  const VERSION=2;
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

  function keepFocusedControlVisible(e){
    if(e.key!=='Tab'||e.altKey||e.ctrlKey||e.metaKey)return;
    // Let the browser preserve the complete, document-order focus sequence,
    // including links and buttons. Once native Tab navigation has completed,
    // keep the newly focused form control visible for small screens/keyboards.
    setTimeout(()=>{
      const target=document.activeElement;
      if(!target||!target.matches('input,select,textarea')||!visible(target)||!inActiveContext(target))return;
      try{target.scrollIntoView({block:'nearest',inline:'nearest'});}catch(_e){}
    },0);
  }

  document.addEventListener('keydown',keepFocusedControlVisible,true);
  window.PropertyThesisKeyboardInputTab={version:VERSION,inputs};
})();
