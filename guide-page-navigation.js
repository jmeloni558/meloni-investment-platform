'use strict';
(()=>{
  if(!document.querySelector('.guide-shell'))return;
  try{history.scrollRestoration='manual'}catch(_e){}
  const top=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
  const navigationType=performance.getEntriesByType?.('navigation')?.[0]?.type||'navigate';
  top();
  window.addEventListener('pageshow',event=>{if(event.persisted||navigationType==='reload'||navigationType==='back_forward')top()});
})();
