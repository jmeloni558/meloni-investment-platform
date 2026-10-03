'use strict';
(()=>{
 const nonce=location.hash.slice(1),status=document.getElementById('status');
 if(location.origin!=='https://propertythesis.com'||window.parent===window||! /^[a-f0-9-]{36}$/.test(nonce)){
  status.textContent='Open verification from the PropertyThesis Android app.';return;
 }
 // Only a short-lived challenge token crosses the frame boundary, never login data.
 const script=document.createElement('script');
 script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
 script.onload=()=>{
  try{window.turnstile.render('#verification',{
   sitekey:'0x4AAAAAAEZOKm51JtNNvBzG',action:'android-auth',
   callback:token=>{status.textContent='Verified.';window.parent.postMessage({type:'pt-auth-verification',nonce,token},'https://localhost');},
   'error-callback':()=>{status.textContent='Verification unavailable. Cancel and try again.';},
   'expired-callback':()=>{status.textContent='Verification expired. Cancel and try again.';}
  });status.textContent='Complete the security check to continue.';}
  catch{status.textContent='Verification unavailable. Cancel and try again.';}
 };
 script.onerror=()=>{status.textContent='Cannot load verification. Check your connection.';};
 document.head.append(script);
})();
