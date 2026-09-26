'use strict';
// Candidate lifecycle; loaded only by the isolated website review builder.
(function(root){
 function create({projectUrl,getProjectUrl,activate,reload,report}){
  let owner=null,locked=false;
  return {accept(user){
   if(locked)return false;
   const next=user?.id||null;
   if(owner&&next!==owner){
    locked=true;report('Your account changed. Reloading before continuing.');reload();return false;
   }
   if(!next)return true;
   if(owner===next)return true;
   try{
    if(getProjectUrl()!==projectUrl)throw Error('Account services do not match this website build.');
    activate();owner=next;return true;
   }catch(error){
    locked=true;report(error.message||'Account initialization failed. Reload before continuing.');return false;
   }
  }};
 }
 if(typeof module!=='undefined')module.exports={create};
 else root.PropertyThesisAuthLifecycle={create};
})(typeof window==='undefined'?{}:window);
