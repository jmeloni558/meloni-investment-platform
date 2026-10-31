import {takenDate,stampPhoto,dateParts} from './photo-dates.mjs?v=1';
import {BUCKET,safeName,validateFile,originalName,downloadName,listPhotos,uploadPhoto} from './photo-library.mjs';
const $=id=>document.getElementById(id);
const client=window.supabase?.createClient('https://lmaiqpkogmmsldkziggy.supabase.co','sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7');
let user=null,properties=[],selected=null,photos=[],queue=[],busy=false,epoch=0,installPrompt,listMode='active';
const bucket=client?.storage.from(BUCKET);
const selectedPhotos=new Set();
const captureDates=new Map();let captionQueue=[],captionRunning=0,captionObservers=[];
function clearCaptions(){captionObservers.forEach(o=>o.disconnect());captionObservers=[];captionQueue=[];}
function loadCaption(card,caption,path,version){
 const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();captionQueue.push(async()=>{
  if(version!==epoch||!card.isConnected)return;
  try{let date=captureDates.get(path);if(!captureDates.has(path)){const {data,error}=await bucket.download(path);if(error)throw error;date=await takenDate(data);if(version!==epoch)return;captureDates.set(path,date);}
   if(card.isConnected)caption.textContent='Taken: '+(date||'Not recorded');
  }catch(_){if(version===epoch&&card.isConnected)caption.textContent='Taken: Could not read date — refresh to retry';}
 });drainCaptions();});captionObservers.push(observer);observer.observe(card);
}
function drainCaptions(){while(captionRunning<2&&captionQueue.length){const job=captionQueue.shift();captionRunning++;job().finally(()=>{captionRunning--;drainCaptions();});}}

const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
function check(version){if(version!==epoch || !user)throw Error('Your session changed. Sign in again to continue.');}
function setBusy(value){busy=value;$('updateApp').disabled=value;document.querySelectorAll('#library button,#library input').forEach(el=>el.disabled=value);$('upload').disabled=value||!queue.some(x=>x.state!=='Uploaded'&&!x.invalid);renderPhotoSelection();}
function node(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function renderProperties(){
  const search=$('search').value.trim().toLowerCase();$('properties').replaceChildren();
  for(const p of properties.filter(p=>(listMode==='completed'?!!p.completed_at:!p.completed_at)&&p.address.toLowerCase().includes(search))){const b=node('button',p.address);b.disabled=busy;if(p.id===selected?.id)b.setAttribute('aria-current','true');b.onclick=()=>run(()=>openProperty(p));$('properties').append(b);}
  if(!$('properties').children.length)$('properties').append(node('p',listMode==='completed'?'No completed photo sets.':'No active properties. Enter an address to begin.','hint'));
}
function renderQueue(){
  $('queue').replaceChildren(...queue.map(x=>node('div',x.file.name+' — '+x.state,'queue-row')));
  $('upload').textContent=queue.some(x=>x.state.startsWith('Failed'))?'Retry remaining photos':'Upload photos';
  $('upload').disabled=busy||!queue.some(x=>x.state!=='Uploaded'&&!x.invalid);
}
async function run(action){if(busy)return;setBusy(true);try{await action();}catch(error){status(error.message||'Something went wrong. Please try again.',true);}finally{setBusy(false);}}
async function loadProperties(){
  const version=epoch,rows=[];
  for(let offset=0;;offset+=500){const {data,error}=await client.from('photo_properties').select('id,address,created_at,completed_at,deleting_at').order('address').order('id').range(offset,offset+499);check(version);if(error)throw error;rows.push(...data);if(data.length<500)break;}
  properties=rows;renderProperties();
}
async function openProperty(p){
  if(queue.some(x=>x.state!=='Uploaded')&&!confirm('Leave the selected photos? Photos not uploaded will need to be selected again.'))return;
  selectedPhotos.clear();selected=p;photos=[];queue=[];$('files').value='';renderQueue();$('photos').replaceChildren();$('workspace').hidden=false;$('addressList').hidden=true;$('uploadControls').hidden=!!p.completed_at||!!p.deleting_at;$('complete').hidden=!!p.completed_at||!!p.deleting_at;$('reopen').hidden=!p.completed_at||!!p.deleting_at;$('completedNote').hidden=!p.completed_at;$('propertyTitle').textContent=p.address;renderProperties();await refreshPhotos();$('propertyTitle').focus();
}
async function refreshPhotos(){
  const version=epoch,p=selected;if(!p)return;const prefix=user.id+'/'+p.id;
  status('Loading photos…');const rows=await listPhotos(bucket,user.id+'/'+p.id);check(version);if(p.id!==selected?.id)return;photos=rows;for(const name of selectedPhotos){if(!photos.some(p=>p.name===name))selectedPhotos.delete(name);}
  clearCaptions();$('photos').replaceChildren();$('count').textContent=photos.length+' photo'+(photos.length===1?'':'s');
  for(const photo of photos){
    const card=node('article',null,'photo');card.dataset.photoName=photo.name;
    const label=node('label',null,'photo-select'),checkbox=node('input');checkbox.type='checkbox';checkbox.checked=selectedPhotos.has(photo.name);checkbox.disabled=busy;checkbox.setAttribute('aria-label','Select '+originalName(photo.name));checkbox.onchange=()=>{if(checkbox.checked)selectedPhotos.add(photo.name);else selectedPhotos.delete(photo.name);renderPhotoSelection();};label.append(checkbox,node('span','Select photo'));card.append(label);
    if(/\.(heic|heif)$/i.test(photo.name)){card.append(node('div','HEIC / HEIF photo','placeholder'));}
    else {const img=node('img');img.alt=originalName(photo.name);img.loading='lazy';card.append(img);const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();if(version!==epoch)return;bucket.createSignedUrl(prefix+'/'+photo.name,300).then(({data,error})=>{if(version!==epoch)return;if(error){img.replaceWith(node('div','Preview unavailable','placeholder'));return;}img.src=data.signedUrl;}).catch(()=>{img.replaceWith(node('div','Preview unavailable','placeholder'));});});observer.observe(img);}
    const caption=node('div',null,'photo-caption'),date=node('p','Taken: Reading date…','taken-date');caption.append(node('p',originalName(photo.name)),date);card.append(caption);
    const remove=node('button','Delete photo','delete-photo');
    remove.setAttribute('aria-label','Delete '+originalName(photo.name));
    remove.onclick=()=>run(async()=>{
      if(!confirm('Delete '+originalName(photo.name)+' from '+p.address+'? This permanently removes the uploaded copy from your photo library. The original on your phone is not changed.'))return;
      check(version);status('Deleting photo…');
      const {data,error}=await bucket.remove([prefix+'/'+photo.name]);check(version);
      if(error)throw Error('Photo could not be deleted: '+error.message);
      if(!data?.length)throw Error('Deletion could not be confirmed. Refresh photos and try again.');
      removeConfirmedPhotos([photo.name]);
      status('Photo deleted. You can select and upload a replacement.');
    });
    card.append(remove);
    $('photos').append(card);loadCaption(card,date,prefix+'/'+photo.name,version);
  }
  renderPhotoSelection();
  status(p.deleting_at?'Property deletion is unfinished. Click Delete property again to finish.':photos.length?'Photos are up to date.':'This property is ready. Select photos to upload.');
}

function renderPhotoSelection(){
  $('photoSelectionCount').textContent=selectedPhotos.size+' selected';
  $('deleteSelectedPhotos').textContent=selectedPhotos.size?'Delete selected ('+selectedPhotos.size+')':'Delete selected';
  $('deleteSelectedPhotos').disabled=busy||!selectedPhotos.size;
  $('clearPhotoSelection').disabled=busy||!selectedPhotos.size;
  $('selectAllPhotos').disabled=busy||!photos.length;
  for(const id of ['downloadAll','downloadAllDated'])$(id).disabled=busy||!photos.length;
  for(const id of ['downloadSelected','downloadSelectedDated'])$(id).disabled=busy||!selectedPhotos.size;
  document.querySelectorAll('.photo').forEach(card=>{card.querySelector('input[type=checkbox]').checked=selectedPhotos.has(card.dataset.photoName);});
}
function removeConfirmedPhotos(names){
  const removed=new Set(names);
  photos=photos.filter(photo=>!removed.has(photo.name));
  for(const name of removed)selectedPhotos.delete(name);
  document.querySelectorAll('.photo').forEach(card=>{if(removed.has(card.dataset.photoName))card.remove();});
  if(!queue.some(item=>item.state!=='Uploaded'&&!item.invalid)){queue=[];$('files').value='';renderQueue();}
  $('count').textContent=photos.length+' photo'+(photos.length===1?'':'s');renderPhotoSelection();
}
$('selectAllPhotos').onclick=()=>{if(busy)return;photos.forEach(photo=>selectedPhotos.add(photo.name));renderPhotoSelection();};
$('clearPhotoSelection').onclick=()=>{if(busy)return;selectedPhotos.clear();renderPhotoSelection();};
$('deleteSelectedPhotos').onclick=()=>run(async()=>{
  const names=photos.filter(photo=>selectedPhotos.has(photo.name)).map(photo=>photo.name);
  if(!names.length)return;
  if(!confirm('Permanently delete '+names.length+' selected photo'+(names.length===1?'':'s')+' from '+selected.address+'? Original photos on your phone are not changed.'))return;
  const version=epoch,prefix=user.id+'/'+selected.id+'/';let deleted=0,failed=0;
  // Bounded requests accommodate large selections without imposing a selection limit.
  for(let offset=0;offset<names.length;offset+=100){
    check(version);const batch=names.slice(offset,offset+100);
    status('Deleting selected photos… '+offset+' of '+names.length+' processed.');
    let result;
    try{result=await bucket.remove(batch.map(name=>prefix+name));}catch(error){check(version);failed+=batch.length;continue;}
    check(version);
    if(result.error){failed+=batch.length;continue;}
    const confirmed=new Set((result.data||[]).map(item=>item.name));
    const removed=batch.filter(name=>confirmed.has(prefix+name)||confirmed.has(name));
    deleted+=removed.length;failed+=batch.length-removed.length;removeConfirmedPhotos(removed);
  }
  status(deleted+' photo'+(deleted===1?'':'s')+' deleted.'+(failed?' '+failed+' could not be confirmed and remain selected. Retry or refresh photos.':''),!!failed);
});
$('deleteProperty').onclick=()=>run(async()=>{
 const p=selected;if(!p)return;
 if(!confirm('Permanently delete '+p.address+' and ALL its uploaded photos from the photo app? This cannot be undone. Photos on your phone or PC and your saved BPO are not deleted.'))return;
 const version=epoch,prefix=user.id+'/'+p.id;status('Starting property deletion…');
 const started=await client.rpc('delete_photo_property',{p_id:p.id,p_finish:false});check(version);
 if(started.error||started.data!==true)throw Error(started.error?.message||'Could not start property deletion. No photos were removed.');
 p.deleting_at=new Date().toISOString();queue=[];$('files').value='';renderQueue();$('uploadControls').hidden=true;$('complete').hidden=true;$('reopen').hidden=true;
 try{
  const remaining=await listPhotos(bucket,prefix);check(version);
  for(let offset=0;offset<remaining.length;offset+=100){
   const batch=remaining.slice(offset,offset+100),paths=batch.map(photo=>prefix+'/'+photo.name);
   status('Deleting property photos… '+offset+' of '+remaining.length+' processed.');
   const {data,error}=await bucket.remove(paths);check(version);if(error)throw error;
   const confirmed=new Set((data||[]).map(item=>item.name));
   const removed=batch.filter(photo=>confirmed.has(prefix+'/'+photo.name)||confirmed.has(photo.name)).map(photo=>photo.name);removeConfirmedPhotos(removed);
   if(removed.length!==batch.length)throw Error('Some photo removals could not be confirmed.');
  }
  const finished=await client.rpc('delete_photo_property',{p_id:p.id,p_finish:true});check(version);
  if(finished.error||finished.data!==true)throw Error(finished.error?.message||'Property removal could not be confirmed.');
 }catch(error){
  check(version);await refreshPhotos().catch(()=>{});
  throw Error('Deletion is unfinished. '+error.message+' Click Delete property again to retry.');
 }
 await loadProperties();showList();status('Property and all uploaded photos deleted.');
});
async function getPhoto(photo,version){check(version);const {data,error}=await bucket.download(user.id+'/'+selected.id+'/'+photo.name);check(version);if(error)throw error;return data;}
function save(blob,name){const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('newProperty').onsubmit=e=>{e.preventDefault();run(async()=>{
  const address=$('address').value.trim().replace(/\s+/g,' ');if(!address)throw Error('Enter a property address.');
  const existing=properties.find(p=>p.address.toLowerCase()===address.toLowerCase());if(existing){status('This address already exists'+(existing.completed_at?' in Completed photos':' in Active properties')+'.');$('address').value='';return;}
  const version=epoch;const {data,error}=await client.from('photo_properties').insert({user_id:user.id,address}).select('id,address,created_at,completed_at,deleting_at').single();check(version);
  if(error){if(error.code==='23505'){await loadProperties();const p=properties.find(p=>p.address.toLowerCase()===address.toLowerCase());if(p){status('This address already exists'+(p.completed_at?' in Completed photos':' in Active properties')+'.');$('address').value='';return;}}throw error;}
  await loadProperties();$('address').value='';$('search').value='';renderProperties();status('Property created. Enter another address or choose one from the list.');
}).finally(()=>$('address').focus());};

function showList(mode=listMode){
  if(queue.some(x=>x.state!=='Uploaded'&&!x.invalid)&&!confirm('Return to addresses without uploading the selected photos?'))return;
  clearCaptions();selectedPhotos.clear();listMode=mode;selected=null;photos=[];queue=[];$('files').value='';renderQueue();$('photos').replaceChildren();
  $('workspace').hidden=true;$('addressList').hidden=false;$('newProperty').hidden=mode==='completed';
  $('listTitle').textContent=mode==='completed'?'Completed photos':'Active properties';
  $('activeTab').setAttribute('aria-pressed',String(mode==='active'));$('completedTab').setAttribute('aria-pressed',String(mode==='completed'));
  renderProperties();$('listTitle').focus();status(mode==='completed'?'Completed photo sets are saved here.':'Choose a property or enter an address.');
}
$('backToList').onclick=()=>showList();
$('activeTab').onclick=()=>showList('active');
$('completedTab').onclick=()=>showList('completed');
async function changeCompletion(completed){
  if(queue.some(x=>x.state!=='Uploaded'&&!x.invalid))throw Error('Upload or clear the selected photos before marking this set completed.');
  if(completed&&!photos.length)throw Error('Upload at least one photo before marking this set completed.');
  const version=epoch;
  const {data,error}=await client.from('photo_properties').update({completed_at:completed?new Date().toISOString():null}).eq('id',selected.id).select('id,address,created_at,completed_at,deleting_at').single();
  check(version);if(error)throw error;
  selected=data;await loadProperties();
  if(completed){showList('active');status('Upload set completed. Find it in Completed photos.');}
  else{listMode='active';await openProperty(data);}
}
$('complete').onclick=()=>run(()=>changeCompletion(true));
$('reopen').onclick=()=>run(()=>changeCompletion(false));
$('search').oninput=renderProperties;
$('files').onchange=()=>{queue=Array.from($('files').files).map(file=>{try{validateFile(file);return {file,state:'Ready'};}catch(e){return {file,state:e.message,invalid:true};}});renderQueue();};
$('upload').onclick=()=>run(async()=>{
  if(selected.completed_at)throw Error('Reopen this completed set before uploading.');
  const version=epoch,prefix=user.id+'/'+selected.id;let failures=0,uploaded=0;
  for(const item of queue){if(item.invalid||item.state==='Uploaded')continue;check(version);item.state='Uploading…';renderQueue();status('Uploading '+item.file.name+'…');
    try{await uploadPhoto(bucket,prefix,item.file);check(version);item.state='Uploaded';uploaded++;}catch(e){check(version);item.state='Failed: '+(e.message||'Connection lost');failures++;}renderQueue();
  }
  await refreshPhotos();status(uploaded+' uploaded. '+(failures?failures+' failed. Tap Retry remaining photos.':'Uploads complete.'),!!failures);renderQueue();
});
$('refresh').onclick=()=>run(refreshPhotos);
let datedRequest=null;
function askDownloadDate(onlySelected){
 const items=photos.filter(photo=>!onlySelected||selectedPhotos.has(photo.name));if(busy||!items.length)return;
 datedRequest={items,version:epoch,property:selected.id};$('stampDate').value='';$('dateDownloadCount').textContent=items.length+' photo'+(items.length===1?'':'s')+' selected. Enter the date you want; no date is preselected.';$('dateDownloadDialog').showModal();$('stampDate').focus();
}
$('cancelDateDownload').onclick=()=>{datedRequest=null;$('dateDownloadDialog').close();};
$('dateDownloadDialog').addEventListener('cancel',()=>datedRequest=null);
$('dateDownloadForm').onsubmit=e=>{e.preventDefault();const request=datedRequest,date=$('stampDate').value;if(!request)return;try{dateParts(date);check(request.version);if(selected?.id!==request.property)throw Error('Reopen the property and try again.');}catch(error){status(error.message,true);return;}$('dateDownloadDialog').close();datedRequest=null;run(()=>downloadPhotos(request.items,date));};
async function downloadPhotos(items,date=''){
 if(!items.length)throw Error('Select photos to download.');
 if(!window.JSZip)throw Error('The ZIP tool did not load. Refresh the page and try again.');
 const version=epoch,name=safeName(selected.address),limit=128*1024*1024;let zip=new window.JSZip(),bytes=0,part=1,done=0;
 const flush=async(final)=>{const blob=await zip.generateAsync({type:'blob',compression:'STORE'});check(version);save(blob,name+(date?'-dated-'+date:'')+(part>1||!final?'-part-'+part:'')+'.zip');part++;zip=new window.JSZip();bytes=0;};
 for(const photo of items){
  check(version);status('Preparing '+(date?'dated ':'')+'photo '+(done+1)+' of '+items.length+'…');
  let blob=await getPhoto(photo,version),filename=downloadName(photo.name);
  if(date){blob=await stampPhoto(blob,date,originalName(photo.name));check(version);filename=filename+'-dated-'+date+'.jpg';}
  if(bytes&&bytes+blob.size>limit)await flush(false);
  const options={};if(date){const d=dateParts(date);options.date=new Date(Date.UTC(Math.min(2107,Math.max(1980,d.year)),d.month-1,d.day));}
  zip.folder(name).file(filename,blob,options);bytes+=blob.size;done++;
 }
 await flush(true);status(done+' '+(date?'dated JPG copies':'original photos')+' downloaded. Extract the ZIP'+(part>2?' files':' file')+' to access your photos.');
}
$('downloadAll').onclick=()=>run(()=>downloadPhotos([...photos]));
$('downloadSelected').onclick=()=>run(()=>downloadPhotos(photos.filter(p=>selectedPhotos.has(p.name))));
$('downloadAllDated').onclick=()=>askDownloadDate(false);
$('downloadSelectedDated').onclick=()=>askDownloadDate(true);
$('signout').onclick=()=>run(async()=>{const {error}=await client.auth.signOut();if(error)throw error;});
addEventListener('beforeunload',e=>{if(busy||queue.some(x=>x.state!=='Uploaded'&&!x.invalid)){e.preventDefault();e.returnValue='';}});
addEventListener('offline',()=>status('You are offline. Keep this page open and retry remaining uploads when connected.',true));
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install').hidden=false;});
$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}};
async function sessionChanged(session){
  const next=session?.user;if(next?.id===user?.id&&user)return;
  clearCaptions();captureDates.clear();datedRequest=null;$('dateDownloadDialog').close();selectedPhotos.clear();epoch++;const version=epoch;user=next||null;selected=null;properties=[];photos=[];queue=[];
  $('files').value='';$('photos').replaceChildren();$('properties').replaceChildren();$('queue').replaceChildren();$('account').textContent='';$('library').hidden=true;$('workspace').hidden=true;$('addressList').hidden=false;$('signedOut').hidden=!!user;
  if(!user){initPhotoCaptcha();status('Sign in to upload and download your property photos.');return;}
  try{const {data,error}=await client.rpc('photo_library_enabled');check(version);if(error)throw error;if(!data){$('signedOut').hidden=false;initPhotoCaptcha();status('Photo Uploads is currently available only to the pilot account.',true);return;}$('library').hidden=false;$('password').value='';$('account').textContent=user.email;await loadProperties();showList('active');await openRequestedAddress();}catch(e){if(version===epoch)status(e.message,true);}
}
let requestedAddressHandled=false;
async function openRequestedAddress(){
 const url=new URL(location.href),raw=url.searchParams.get('address');if(requestedAddressHandled||!raw)return;
 const address=raw.trim().replace(/\s+/g,' ');if(!address||address.length>500){status('Enter a valid property address of 500 characters or fewer.',true);return;}
 await run(async()=>{
  const version=epoch;let property=properties.find(p=>p.address.toLowerCase()===address.toLowerCase());
  if(!property){
   $('address').value=address;status('No photo address exists for this property. Click Create only when you are ready to add photos.');$('address').focus();
  }else{check(version);await openProperty(property);}
  requestedAddressHandled=true;url.searchParams.delete('address');history.replaceState(history.state,'',url);
 });
}
let captchaToken='',captchaWidget=null,captchaLoading=false;
function initPhotoCaptcha(){
  if(captchaWidget!==null||captchaLoading)return;
  const render=()=>{captchaLoading=false;captchaWidget=window.turnstile.render('#photoCaptcha',{sitekey:'0x4AAAAAAEZOKm51JtNNvBzG',callback:token=>{captchaToken=token;$('authStatus').textContent='';},'expired-callback':()=>captchaToken='','error-callback':()=>{$('authStatus').textContent='Verification could not load. Check your connection and try again.';captchaToken='';}});};
  if(window.turnstile){render();return;}captchaLoading=true;
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=render;script.onerror=()=>{captchaLoading=false;$('authStatus').textContent='Verification could not load. Try signing in again when connected.';};document.head.append(script);
}
$('photoSignIn').onsubmit=async event=>{
  event.preventDefault();if(!client)return;
  if(!captchaToken){initPhotoCaptcha();$('authStatus').textContent='Complete the security verification before signing in.';return;}
  $('signin').disabled=true;$('authStatus').textContent='Signing in…';
  try{const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value,options:{captchaToken}});if(error)throw error;$('password').value='';$('authStatus').textContent='';await sessionChanged(data.session);}
  catch(error){$('authStatus').textContent=error.message||'Unable to sign in. Please try again.';}
  finally{captchaToken='';if(captchaWidget!==null)window.turnstile.reset(captchaWidget);$('signin').disabled=false;}
};
if(!client)status('Unable to load sign-in. Check your connection and refresh.',true);
else {client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>sessionChanged(session),0));client.auth.getSession().then(({data,error})=>{if(error)status(error.message,true);else sessionChanged(data.session);});}

// Check the live entry page before reloading, so offline updates preserve selections.
$('updateApp').onclick=async()=>{
  if(busy)return;
  if(queue.some(x=>x.state!=='Uploaded'&&!x.invalid)&&!confirm('Updating will clear photos you selected but have not uploaded. Your uploaded photos are safe. Update now?'))return;
  setBusy(true);status('Checking for the latest app…');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const url=new URL(location.href);url.searchParams.set('app-update',String(Date.now()));
    const response=await fetch(url.href,{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error('Update unavailable. Please try again shortly.');
    const html=await response.text();
    if(!html.includes('id="updateApp"')||!html.includes('photos.js'))throw Error('Update unavailable. Please try again shortly.');
    queue=[];setBusy(false);status('Opening the latest app…');
    location.replace(url.href);
  }catch(error){
    status(error.name==='AbortError'?'Update timed out. Your selected photos are still here. Try again when connected.':'Could not update the app. Your selected photos are still here. Check your connection and try again.',true);
    setBusy(false);
  }finally{clearTimeout(timeout);}
};
