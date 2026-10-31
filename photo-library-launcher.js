'use strict';
(()=>{
  let allowed=false,account=null;
  function render(){const toolbar=document.querySelector('#appNavShell .app-nav-toolbar');let link=document.getElementById('ptPhotoLibrary');if(!allowed){link?.remove();return;}if(!toolbar)return;if(!link){link=document.createElement('a');link.id='ptPhotoLibrary';link.href='photos.html';link.textContent='Photo Uploads';link.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 12px;border:1px solid #d7e0e8;border-radius:8px;background:white;color:#344054;font-size:11px;font-weight:800;text-decoration:none';toolbar.append(link);}}
  async function update(session){const id=session?.user?.id;if(id===account)return;account=id;allowed=false;render();if(id){const {data,error}=await window.__ptSharedSupabaseClient.rpc('photo_library_enabled');if(account!==id)return;allowed=!error&&data===true;render();}}
  function init(){const client=window.__ptSharedSupabaseClient;if(!client)return;client.auth.getSession().then(({data})=>update(data.session));client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>update(session),0));new MutationObserver(render).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
