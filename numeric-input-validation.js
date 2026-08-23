'use strict';
(()=>{
  const VERSION=2;
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
    const raw=String(el.value??'').trim();
    if(raw===''||raw==='-'||raw==='.')return false;
    const value=Number(raw);
    if(!Number.isFinite(value))return false;
    if(!negativeAllowed(el)&&value<0){
      el.value='';syncSource(el);message('Negative values are not allowed for this field.');return true;
    }
    if(wholeOnly(el)&&!Number.isInteger(value)){
      el.value='';syncSource(el);
      const label=el.closest('.gw-field')?.querySelector('label')?.textContent?.trim()||'This field';
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
    if(wholeOnly(el)&&(e.key==='.'||e.key==='Decimal')){
      e.preventDefault();
      const label=el.closest('.gw-field')?.querySelector('label')?.textContent?.trim()||'This field';
      message(label+' must be entered as a whole number.');
    }
  }

  function onInput(e){rejectInvalid(e.target);}
  function onChange(e){rejectInvalid(e.target);}

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
