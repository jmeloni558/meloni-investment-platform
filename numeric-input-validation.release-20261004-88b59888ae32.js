'use strict';
(()=>{
  const VERSION=4;
  if((window.__numericInputValidationV||0)>=VERSION)return;
  window.__numericInputValidationV=VERSION;

  const NON_NEGATIVE_IDS=new Set([
    'f_price','f_initialRepairs','f_land','f_vacancy','f_opEx','f_mortgage','f_mortRate','f_loanYears','f_points','f_origFee','f_sellCost','f_depLife','f_requiredReturn','f_desiredCap','f_desiredGrm','f_ordinaryTax','f_depTax','f_capGainsTax','quickPrice','quickRent'
  ]);
  const POSITIVE_IDS=new Set(['f_units','f_hold','f_rent']);
  const NEGATIVE_ALLOWED_IDS=new Set(['f_rentGrowth','f_appreciation']);
  const INTEGER_IDS=new Set(['f_units','f_hold','f_loanYears']);
  const MONEY_IDS=new Set(['f_price','f_initialRepairs','f_land','f_rent','f_mortgage','f_origFee','quickPrice','quickRent']);
  const PERCENT_IDS=new Set(['f_vacancy','f_rentGrowth','f_opEx','f_mortRate','f_appreciation','f_sellCost','f_requiredReturn','f_desiredCap','f_ordinaryTax','f_depTax','f_capGainsTax']);
  const HUNDREDTH_IDS=new Set(['f_points','f_desiredGrm']);

  function sourceId(el){return el?.dataset?.src||el?.id||'';}
  function governed(el){
    if(!el||el.tagName!=='INPUT'||el.type!=='number')return false;
    const id=sourceId(el);
    return NON_NEGATIVE_IDS.has(id)||POSITIVE_IDS.has(id)||NEGATIVE_ALLOWED_IDS.has(id)||el.hasAttribute('data-exp');
  }
  function negativeAllowed(el){return NEGATIVE_ALLOWED_IDS.has(sourceId(el));}
  function positiveRequired(el){return POSITIVE_IDS.has(sourceId(el));}
  function wholeOnly(el){return INTEGER_IDS.has(sourceId(el));}

  function configure(root=document){
    root.querySelectorAll?.('input[type="number"]').forEach(el=>{
      if(!governed(el))return;
      const id=sourceId(el);
      if(!negativeAllowed(el))el.min=positiveRequired(el)?(wholeOnly(el)?'1':'0.01'):'0';
      if(wholeOnly(el))el.step='1';
      else if(MONEY_IDS.has(id)||PERCENT_IDS.has(id)||HUNDREDTH_IDS.has(id)||el.hasAttribute('data-exp'))el.step='0.01';
      else if(id==='f_depLife')el.step='0.1';
      else el.step='any';
    });
  }

  function syncSource(el){
    const id=el?.dataset?.src;if(!id)return;
    const src=document.getElementById(id);if(!src||src===el)return;
    src.value=el.value;
    src.dispatchEvent(new Event('input',{bubbles:true}));
    src.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function message(text){try{if(typeof setStatus==='function')setStatus(text);}catch(e){}}

  function rejectInvalid(el){
    if(!governed(el))return false;
    el.setCustomValidity?.('');
    const field=el.closest('.gw-field');
    field?.querySelector('[data-numeric-error]')?.remove();
    const raw=String(el.value??'').trim();
    if(raw===''||raw==='-'||raw==='.')return false;
    const value=Number(raw);
    if(!Number.isFinite(value))return false;
    if(!negativeAllowed(el)&&value<0){
      el.value='';syncSource(el);message('Negative values are not allowed for this field.');return true;
    }
    if(wholeOnly(el)&&!Number.isInteger(value)){
      const label={f_hold:'Expected Holding Period',f_units:'Number of Units',f_loanYears:'Mortgage Time Horizon'}[sourceId(el)]||'This field';
      el.setCustomValidity?.(label+' must be entered as a whole number.');
      if(field){const note=document.createElement('div');note.setAttribute('data-numeric-error','');note.setAttribute('role','alert');note.style.cssText='color:#a12d2d;margin-top:6px;font-size:13px';note.textContent=label+' must be entered as a whole number.';field.appendChild(note);}
      message(label+' must be entered as a whole number.');
      return true;
    }
    return false;
  }

  function keydown(e){
    const el=e.target;if(!governed(el))return;
    if(!negativeAllowed(el)&&(e.key==='-'||e.key==='Subtract')){
      e.preventDefault();message('Negative values are not allowed for this field.');return;
    }
    // Preserve decimals so 1.5 is rejected explicitly, never silently changed to 15.
  }

  function onInput(e){rejectInvalid(e.target);}
  function onChange(e){rejectInvalid(e.target);}
  function onPaste(e){
    const el=e.target;if(!governed(el)||!wholeOnly(el)||!e.clipboardData)return;
    const raw=e.clipboardData.getData('text/plain').trim();
    // Handle fractional clipboard text before a number input can discard it.
    // Preserve the attempted value and use the same validation as typed input.
    if(!/^[+]?(?:\d+\.\d*|\.\d+)$/.test(raw)||Number.isInteger(Number(raw)))return;
    e.preventDefault();el.value=raw;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    rejectInvalid(el);
  }

  function start(){
    configure();
    document.addEventListener('keydown',keydown,true);
    document.addEventListener('input',onInput,true);
    document.addEventListener('change',onChange,true);
    document.addEventListener('paste',onPaste,true);
    const body=document.getElementById('gwBody');
    if(body){new MutationObserver(()=>configure(body)).observe(body,{childList:true,subtree:true});}
    [60,180,400].forEach(ms=>setTimeout(()=>configure(),ms));
  }

  window.NumericInputValidation={configure};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
