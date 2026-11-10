window.addEventListener('message',async e=>{
 if(e.source!==window||e.origin!==location.origin||e.data?.kind!=='pt-photos'||!['find','begin','file','finish'].includes(e.data.op))return;
 let response;try{response=await chrome.runtime.sendMessage(e.data)}catch(error){response={ok:false,error:error.message}}
 window.postMessage({kind:'pt-photo-result',id:e.data.id,response},location.origin);
});
