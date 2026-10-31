'use strict';
(()=>{
 let allowed=false,account=null;
 function render(){
  document.getElementById('ptPhotoLibrary')?.remove();
  if(!allowed){document.querySelectorAll('[data-saved-photos]').forEach(el=>el.remove());return;}
  document.querySelectorAll('[data-delete-bpo],[data-hub-delete]').forEach(del=>{
   const card=del.closest('article,.hub-card');if(!card)return;
   const address=(card.querySelector('.pt-bpo-card-address,.hub-title p')?.textContent||'').trim();if(!address||address==='No address entered')return;
   let link=card.querySelector('[data-saved-photos]');
   if(!link){link=document.createElement('a');link.dataset.savedPhotos='1';link.className='btn secondary';link.textContent='Photos';link.target='_blank';link.rel='noopener';link.title='Optional property photos';}
   const href='photos.html?address='+encodeURIComponent(address);if(link.getAttribute('href')!==href)link.setAttribute('href',href);if(link.nextElementSibling!==del)del.before(link);
  });
 }
 async function update(session){const id=session?.user?.id;if(id===account)return;account=id;allowed=false;render();if(id){const {data,error}=await window.__ptSharedSupabaseClient.rpc('photo_library_enabled');if(account!==id)return;allowed=!error&&data===true;render();}}
 function init(){render();const client=window.__ptSharedSupabaseClient;if(!client)return;client.auth.getSession().then(({data})=>update(data.session));client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>update(session),0));new MutationObserver(render).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
