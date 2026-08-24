'use strict';
(()=>{
  const VERSION=2;
  if((window.__propertyThesisAddressSpacebarFixV||0)>=VERSION)return;
  window.__propertyThesisAddressSpacebarFixV=VERSION;

  function isAddressInput(el){
    return !!el?.matches?.('#f_address,[data-src="f_address"]');
  }

  function insertSpace(e){
    const input=e.target;
    if(!isAddressInput(input))return;
    if(e.key!==' '&&e.code!=='Space'&&e.key!=='Spacebar')return;
    if(e.altKey||e.ctrlKey||e.metaKey)return;

    // Do not rely on the browser's native default action here because another
    // global keyboard handler can prevent the key from reaching the text field.
    // Insert the literal space ourselves at the caret, then emit a normal input
    // event so the guided form and hidden source field stay synchronized.
    e.preventDefault();
    e.stopImmediatePropagation();

    const start=Number.isInteger(input.selectionStart)?input.selectionStart:input.value.length;
    const end=Number.isInteger(input.selectionEnd)?input.selectionEnd:start;
    if(typeof input.setRangeText==='function')input.setRangeText(' ',start,end,'end');
    else input.value=input.value.slice(0,start)+' '+input.value.slice(end);

    try{
      input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:' '}));
    }catch(_e){
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }

  window.addEventListener('keydown',insertSpace,true);
})();
