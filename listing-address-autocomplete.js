(function(root){
 'use strict';
 if(root.PropertyThesisListingAddresses)return;
 const bound=new WeakSet(),config=root.PT_GOOGLE_SUGGESTIONS_REVIEW||{};
 const suggest=root.PTWebsiteGoogleSuggestions.create({enabled:config.enabled===true,projectUrl:config.projectUrl,publicKey:config.publicKey,getClient:()=>typeof cloudClient==='undefined'?null:cloudClient,getGuestToken:root.PTWebsiteGoogleSuggestions.guestVerifier({siteKey:config.guestSiteKey,loadTurnstile:root.PTWebsiteGoogleSuggestions.loadTurnstile})});
 function attachAll(){
  document.querySelectorAll('[data-pt-listing-address]').forEach(input=>{
   if(bound.has(input))return;bound.add(input);
   root.PTAddressAutocomplete.attach(input,(_route,_method,body)=>suggest(body.input,input),{onSelect:()=>{
    input.dataset.ptListingAutocomplete='ready';
    // Selecting a suggestion fills the address; explicit search buttons start listing lookup.
   }});
  });
 }
 function start(){attachAll();new MutationObserver(attachAll).observe(document.body,{childList:true,subtree:true});}
 root.PropertyThesisListingAddresses={attachAll,preserveUnit:root.PTAddressAutocomplete.preserveUnit};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
