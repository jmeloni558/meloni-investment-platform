'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisAddressSpacebarFixV||0)>=VERSION)return;
  window.__propertyThesisAddressSpacebarFixV=VERSION;

  function isAddressInput(el){
    return !!el?.matches?.('#f_address,[data-src="f_address"]');
  }

  function allowAddressSpace(e){
    if(!isAddressInput(e.target))return;
    if(e.key!==' '&&e.code!=='Space'&&e.key!=='Spacebar')return;
    // Address fields are normal text inputs. Stop global keyboard shortcuts from
    // treating Space as an action while preserving the browser's native text entry.
    e.stopImmediatePropagation();
  }

  window.addEventListener('keydown',allowAddressSpace,true);
})();
