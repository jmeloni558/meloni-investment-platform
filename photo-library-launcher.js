'use strict';
(()=>{
 let allowed=false,account=null,requested=false;
 const desktop=()=>matchMedia('(min-width: 761px)').matches&&!matchMedia('(display-mode: standalone)').matches;
 function close(){document.body.classList.remove('pt-photos-open');const q=new URL(location.href);q.searchParams.delete('photos');history.replaceState(history.state,'',q);window.AppNavigationToolbar?.refresh?.();}
 function open(address=''){
  if(!allowed||!desktop())return false;
  let panel=document.getElementById('ptDesktopPhotos'),frame=panel?.querySelector('iframe');
  if(frame&&address&&frame.dataset.address!==address&&frame.contentWindow.PropertyThesisPhotos?.canNavigate?.()===false)return true;
  if(!panel){panel=document.createElement('section');panel.id='ptDesktopPhotos';panel.setAttribute('aria-label','Property photos');frame=document.createElement('iframe');frame.title='PropertyThesis Photos';panel.append(frame);const shell=document.querySelector('main.shell')||document.querySelector('main');if(!shell)return false;shell.insertBefore(panel,shell.querySelector(':scope > .footer'));}
  if(!frame.getAttribute('src')||(address&&frame.dataset.address!==address)){frame.dataset.address=address;frame.src='photos.html?embedded=1'+(address?'&address='+encodeURIComponent(address):'');}
  document.body.classList.add('pt-photos-open');const q=new URL(location.href);q.searchParams.set('photos','1');q.searchParams.delete('address');history.replaceState(history.state,'',q);window.AppNavigationToolbar?.refresh?.();panel.scrollIntoView({block:'start'});return true;
 }
 window.PropertyThesisDesktopPhotos={open,close};

 function render(){
  let menu=document.getElementById('ptPhotoLibrary');
  const signOut=document.getElementById('signOutBtn'),toolbar=document.querySelector('#appNavShell .app-nav-toolbar');
  if(allowed&&desktop()&&signOut&&toolbar?.contains(signOut)){
   if(!menu){menu=document.createElement('a');menu.id='ptPhotoLibrary';menu.className='app-nav-action';menu.href='/photos';menu.textContent='Photos';}
   if(menu.nextElementSibling!==signOut)signOut.before(menu);
  }else menu?.remove();

  if(!allowed){document.querySelectorAll('[data-saved-photos]').forEach(el=>el.remove());return;}
  document.querySelectorAll('[data-delete-bpo],[data-hub-delete]').forEach(del=>{
   const card=del.closest('article,.hub-card');if(!card)return;
   const address=(card.querySelector('.pt-bpo-card-address,.hub-title p')?.textContent||'').trim();if(!address||address==='No address entered')return;
   let link=card.querySelector('[data-saved-photos]');
   if(!link){link=document.createElement('a');link.dataset.savedPhotos='1';link.className='btn secondary';link.textContent='Photos';link.title='Optional property photos';}
   const href='/photos?address='+encodeURIComponent(address);if(link.getAttribute('href')!==href)link.setAttribute('href',href);if(link.nextElementSibling!==del)del.before(link);
  });
 }
 function requestedPage(){if(requested||!allowed)return;const q=new URL(location.href);if(q.searchParams.get('photos')==='1'&&open(q.searchParams.get('address')||''))requested=true;}
 async function update(session){const id=session?.user?.id;if(id===account)return;const previous=account;account=id;allowed=false;if(!id&&previous){close();document.getElementById('ptDesktopPhotos')?.remove();}render();if(!id&&new URL(location.href).searchParams.get('photos')==='1')setTimeout(()=>window.PropertyThesisAuth?.open?.('signin','Sign in to open your property photos.'),0);if(id){const {data,error}=await window.__ptSharedSupabaseClient.rpc('photo_library_enabled');if(account!==id)return;allowed=!error&&data===true;render();requestedPage();}}
 function init(){
 window.addEventListener('click',e=>{if(e.target.closest('#appNavExisting[aria-haspopup],#appNavNew[aria-haspopup]'))return;if(!e.target.closest('#ptPhotoLibrary,[data-saved-photos]')&&e.target.closest('#appNavShell a,#appNavShell button,#ptBpoMenu button'))close();},true);
 document.addEventListener('click',e=>{
  if(e.defaultPrevented)return;
  const link=e.target.closest('#ptPhotoLibrary,[data-saved-photos]');
  if(link&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){const address=new URL(link.href).searchParams.get('address')||'';if(open(address)){e.preventDefault();return;}}
  if(!link&&!e.target.closest('#appNavExisting[aria-haspopup],#appNavNew[aria-haspopup]')&&e.target.closest('#appNavShell a,#appNavShell button'))close();
 });
 addEventListener('resize',()=>{render();if(!desktop())close();});
 render();const client=window.__ptSharedSupabaseClient;if(!client)return;client.auth.getSession().then(({data})=>update(data.session));client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>update(session),0));new MutationObserver(()=>{render();requestedPage();}).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
