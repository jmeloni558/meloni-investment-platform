// The only source is PT Photos. Bind each transfer to a case URL, not the active tab.
const casePattern='https://www.protk.com/ProTeck.Fulfillment.Case.Forms/CaseFormPortal/DataEntry/*';
function addressKey(s){const words={street:'st',court:'ct',road:'rd',avenue:'ave',lane:'ln',drive:'dr',circle:'cir',boulevard:'blvd',place:'pl',terrace:'ter',florida:'fl',apartment:'unit',apt:'unit',suite:'unit'};return s.toLowerCase().replace(/#/g,' unit ').replace(/[.,]/g,' ').split(/\s+/).filter(Boolean).map(w=>words[w]||w).join(' ')}
function sameAddress(a,b){return !!a&&!!b&&/^\d/.test(a.trim())&&addressKey(a)===addressKey(b)}
async function photoCommand(m,sender){
 const exec=async(id,func,args=[])=> (await chrome.scripting.executeScript({target:{tabId:id},func,args}))[0].result;
 const inspect=()=>({address:document.querySelector('h1')?.textContent.split(/\(\s*Case\s*#/i)[0].trim(),url:location.href});
 if(m.op==='find'){
   const matches=[];for(const t of await chrome.tabs.query({url:casePattern})){const v=await exec(t.id,inspect);if(sameAddress(m.address,v.address))matches.push({id:t.id,url:v.url,address:v.address});}
   if(matches.length!==1)throw Error(matches.length?'More than one open Stewart order matches. Close the duplicate order tabs and retry.':'Open the Stewart order in this Edge profile. Its full address, including unit and ZIP, must match the completed photo set.');
   return matches[0];
 }
 const t=await chrome.tabs.get(m.target.id);
 if(!t.url?.startsWith(casePattern.slice(0,-1))||t.url!==m.target.url)throw Error('The Stewart tab changed. Reopen the matching order.');
 const v=await exec(t.id,inspect);if(!sameAddress(m.address,v.address))throw Error('Stewart order address changed.');
 await chrome.scripting.executeScript({target:{tabId:t.id},files:['photo-gallery.js']});
 const result=await chrome.tabs.sendMessage(t.id,{...m,kind:'pt-gallery'});if(!result?.ok)throw Error(result?.error||'Stewart did not acknowledge the upload.');return result.value;
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.kind!=='pt-photos'||!sender.tab?.url?.startsWith('https://propertythesis.com/')||!sender.url||new URL(sender.url).origin!=='https://propertythesis.com'||new URL(sender.url).pathname!=='/photos.html')return;
 photoCommand(m,sender).then(value=>reply({ok:true,value}),e=>reply({ok:false,error:e.message}));return true;
});
