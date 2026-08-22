'use strict';
(()=>{
  const VERSION=1;
  if((window.__numericInputValidationV||0)>=VERSION)return;
  window.__numericInputValidationV=VERSION;

  const NON_NEGATIVE_IDS=new Set([
    'f_price','f_initialRepairs','f_land','f_vacancy','f_opEx','f_mortgage','f_mortRate','f_loanYears','f_points','f_origFee','f_sellCost','f_depLife','f_requiredReturn','f_desiredCap','f_desiredGrm','f_ordinaryTax','f_depTax','f_capGainsTax','quickPrice','quickRent'
  ]);
  const POSITIVE_IDS=new Set(['f_units','f_hold','f_rent']);
  const NEGATIVE_ALLOWED_IDS=new Set(['f_rentGrowth','f_appreciation']);

  function sourceId(el){return el?.dataset?.src||el?.id||'';}
  function governed(el){
    if(!el||el.tagName!=='INPUT'||el.type!=='number')return false;
    const id=sourceId(el);
    return NON_NEGATIVE_IDS.has(id)||POSITIVE_IDS.has(id)||NEGATIVE_ALLOWED_IDS.has(id)||el.hasAttribute('data-exp');
  }
  function negativeAllowed(el){return NEGATIVE_ALLOWED_IDS.has(sourceId(el));}
  function positiveRequired(el){return POSITIVE_IDS.has(sourceId(el));}

  function configure(root=document){
    root.querySelectorAll?.('input[type="number"]').forEach(el=>{
      if(!governed(el)||negativeAllowed(el))return;
      el.min=positiveRequired(el)?'0.000001':'0';
      if(sourceId(el)==='f_units')el.step='1';
    });
  }

  function syncSource(el){
    const id=el?.dataset?.src;if(!id)return;
    const src=document.getElementById(id);if(!src||src===el)return;
    src.value=el.value;
    src.dispatchEvent(new Event('input',{bubbles:true}));
    src.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function rejectNegative(el){
    if(!governed(el)||negativeAllowed(el))return false;
    const raw=String(el.value??'').trim();
    if(raw===''||raw==='-')return false;
    const n=Number(raw);
    if(Number.isFinite(n)&&n<0){
      el.value='';
      syncSource(el);
      try{if(typeof setStatus==='function')setStatus('Negative values are not allowed for this field.');}catch(e){}
      return true;
    }
    return false;
  }

  function keydown(e){
    const el=e.target;
    if(!governed(el)||negativeAllowed(el))return;
    if(e.key==='-'||e.key==='Subtract'){
      e.preventDefault();
      try{if(typeof setStatus==='function')setStatus('Negative values are not allowed for this field.');}catch(_e){}
    }
  }
  function onInput(e){rejectNegative(e.target);}
  function onChange(e){rejectNegative(e.target);}

  function start(){
    configure();
    document.addEventListener('keydown',keydown,true);
    document.addEventListener('input',onInput,true);
    document.addEventListener('change',onChange,true);
    const body=document.getElementById('gwBody');
    if(body){new MutationObserver(()=>configure(body)).observe(body,{childList:true,subtree:true});}
    [60,180,400].forEach(ms=>setTimeout(()=>configure(),ms));
  }

  window.NumericInputValidation={configure};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
