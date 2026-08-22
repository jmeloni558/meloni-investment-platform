'use strict';
(()=>{
  const VERSION=1;
  if((window.__guidedInitialBlankStateV||0)>=VERSION)return;
  window.__guidedInitialBlankStateV=VERSION;

  const BLANK_IDS=['f_address','f_price','f_land','f_units','f_rent','f_hold','quickPrice','quickRent'];

  function hasExistingSelection(){
    try{
      return !!((typeof selectedAnalysisId!=='undefined'&&selectedAnalysisId)||(typeof selectedPropertyId!=='undefined'&&selectedPropertyId));
    }catch(e){return false;}
  }

  function clearFields(){
    if(hasExistingSelection())return false;
    BLANK_IDS.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    try{
      if(typeof state==='object'&&state){
        state={...state,name:'',address:'',price:0,land:0,units:0,rent:0,hold:0};
      }
    }catch(e){}
    try{window.GuidedAnalysisSetup?.reset?.();}catch(e){}
    try{window.GuidedAssumptionGuidance?.apply?.();}catch(e){}
    return true;
  }

  function start(){
    [0,80,220].forEach(ms=>setTimeout(clearFields,ms));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
