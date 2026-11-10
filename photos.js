import {cameraTimestamp,stampPhoto,dateParts,uprightJpeg} from './photo-dates.mjs?v=5';
import {BUCKET,safeName,validateFile,originalName,listPhotos} from './photo-library.mjs?v=3';
import {bounded,sendQueuedPhoto,uploadFailure} from './photo-upload-queue.mjs?v=1';
const $=id=>document.getElementById(id);
let embedded=false;try{embedded=parent!==window&&parent.location.origin===location.origin&&!!parent.PropertyThesisDesktopPhotos;}catch(_){}
if(embedded){
  document.documentElement.classList.add('photos-embedded');
  const frame=window.frameElement;
  const resize=()=>{frame.style.height=Math.ceil(document.body.getBoundingClientRect().height)+'px';};
  new ResizeObserver(resize).observe(document.body);
  resize();
}
window.PropertyThesisPhotos={canNavigate:()=>{if(busy||dirtyDescriptions.size){status('Wait for photo changes to finish saving.');return false;}if(queue.some(x=>x.state!=='Uploaded'&&!x.invalid)&&!confirm('Leave the selected photos? Photos not uploaded will need to be selected again.'))return false;return true;}};

const projectUrl='https://lmaiqpkogmmsldkziggy.supabase.co';
const publishableKey='sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7';
const client=window.PropertyThesisSession?.getClient()||window.supabase?.createClient(projectUrl,publishableKey);
function createUploadClient(token,signal){
  return window.supabase.createClient(projectUrl,publishableKey,{
    accessToken:async()=>token,
    global:{fetch:(url,options)=>fetch(url,{...options,signal})}
  });
}
let user=null,properties=[],selected=null,photos=[],queue=[],busy=false,epoch=0,installPrompt,listMode='active';
const stewartMode=new URLSearchParams(location.search).get('stewart')==='1';
function updateStewartRequest(){
  $('copyResult').textContent='';
  if(!selected||$('stewartPhotos').hidden){$('stewartRequest').value='';return;}
  const repair=$('stewartNo').checked?' Mark No for repair items on every subject photo.':'';
  $('stewartRequest').value='Run $stewart-order-photos for '+selected.address+' using the completed set in Photos. Upload upright copies and label each subject photo in the matching Stewart order.'+repair;
}
$('stewartNo').onchange=updateStewartRequest;
$('copyStewart').onclick=async()=>{
  try{await navigator.clipboard.writeText($('stewartRequest').value);$('copyResult').textContent=' Copied. Paste into Codex.';}
  catch{$('stewartRequest').select();$('copyResult').textContent=' Select Copy to copy this request.';}
};
const launchAddress=new URLSearchParams(location.search).get('address')?.trim();
const launchTransfer=stewartMode&&!!launchAddress&&new URLSearchParams(location.search).get('transfer')==='1';
async function localStewartExport(property, rows) {
  if (!rows.length || !window.JSZip) return null;
  try {
    let result=await client.from('field_orders').select('id').eq('photo_id',property.id).limit(2);
    if(!result.error && !result.data?.length){
      result=await client.from('field_orders').select('id').eq('address',property.address).is('photo_id',null).limit(2);
    }
    if(result.error || result.data?.length!==1) return null;
    const [order]=result.data;
    const {data:ticket,error:ticketError}=await client.rpc('issue_desktop_folder_ticket',{job_id:order.id});
    if(ticketError || !ticket) return null;
    const response=await fetch('http://127.0.0.1:45273/stewart-photos',{
      method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ticket,photos:rows.map(p=>({name:p.name,description:p.description,size:Number(p.metadata?.size),taken:p.takenOn}))}),
      signal:AbortSignal.timeout(120000)
    });
    if(!response.ok) return null;
    const zip=await window.JSZip.loadAsync(await response.arrayBuffer());
    if(Object.keys(zip.files).length!==rows.length || rows.some(p=>!zip.file(p.name))) return null;
    return zip;
  } catch {return null;}
}
async function transferSet(){
 const version=epoch,property=selected;
 if(!property||propertyList(property)!=='completed'||property.deleting_at)throw Error('Choose a completed property first.');
 const guard=()=>{check(version);if(selected?.id!==property.id)throw Error('Photo set changed.');};
 const {ordered}=await orderForDownload([...photos],version,0);
 const items=ordered.map((photo,i)=>{const original=originalName(photo.name);return {photo,description:photo.description,name:String(i+1).padStart(Math.max(3,String(ordered.length).length),'0')+'-'+(photo.description?safeName(photo.description)+'-':'')+safeName(original.replace(/\.[^.]+$/,'')).slice(0,18)+'.jpg'}});
 const {reviewTransfer}=await import('./stewart-photo-transfer.mjs?v=local-first-1');await reviewTransfer({address:property.address,source:ordered.every(p=>p.localEntry)?'OneDrive':'Photos',items,read:item=>getPhoto(item.photo,version),guard,no:$('stewartNo').checked,progress:status});
}
$('transferStewart').onclick=()=>run(transferSet);
$('stewartFolderInput').onchange=e=>{const files=[...e.target.files];e.target.value='';run(async()=>{
 const version=epoch;check(version);const allowed=/\.(jpe?g|png|webp|heic|heif)$/i;
 if(files.some(f=>allowed.test(f.name)&&f.webkitRelativePath.split('/').length!==2))throw Error('Choose a single PT Photos folder, without nested photo folders.');
 const items=files.filter(f=>allowed.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(file=>({file,name:file.name.replace(allowed,'.jpg')}));
 if(new Set(items.map(x=>x.name.toLowerCase())).size!==items.length)throw Error('Two images have the same JPEG filename. Use distinct names.');
 const {reviewTransfer}=await import('./stewart-photo-transfer.mjs?v=local-first-1');await reviewTransfer({address:launchAddress,items,read:item=>item.file,guard:()=>check(version),no:true,progress:status});
 });};
const bucket=client?.storage.from(BUCKET);
const selectedPhotos=new Set();
const cameraTimes=new Map();
const captureDates=new Map();let captionQueue=[],captionRunning=0,captionObservers=[];
function clearCaptions(){captionObservers.forEach(o=>o.disconnect());captionObservers=[];captionQueue=[];for(const url of previewURLs)URL.revokeObjectURL(url);previewURLs.clear();}
const previewURLs=new Set();
function loadPreview(card,caption,img,photo,version){
  const path=user.id+'/'+selected.id+'/'+photo.name;
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    observer.disconnect();
    captionQueue.push(async()=>{
      if(version!==epoch||!card.isConnected)return;
      try{
        const blob=await getPhoto(photo,version);
        if(version!==epoch||!card.isConnected)return;
        if(img){
          const url=URL.createObjectURL(blob);
          previewURLs.add(url);
          img.onload=img.onerror=()=>{URL.revokeObjectURL(url);previewURLs.delete(url);};
          img.src=url;
        }
        if(!captureDates.has(path)){
          if(photo.cameraTime===undefined)photo.cameraTime=await cameraTimestamp(blob);
          const date=photo.cameraTime?dateParts(photo.cameraTime.slice(0,10)).label:null;
          if(version!==epoch||!card.isConnected)return;
          captureDates.set(path,date);
        }
        const known=captureDates.get(path);
        caption.textContent='Taken: '+(known||'Not recorded');
        if(!known){
          const add=node('button','Add date taken','secondary');
          add.onclick=()=>run(async()=>{
            const input=prompt('Enter the date this photo was taken (YYYY-MM-DD).');
            if(!input)return;
            const label=dateParts(input).label;
            const {error}=await client.from('photo_capture_dates').insert({object_id:photo.id,property_id:selected.id,taken_on:input});
            check(version);if(error)throw error;
            photo.takenOn=input;captureDates.set(path,label);
            await refreshPhotos();
          });
          caption.after(add);
        }
      }catch(_){if(version===epoch&&card.isConnected&&!captureDates.get(path))caption.textContent='Taken: Could not read date — refresh to retry';}
    });
    drainCaptions();
  });
  captionObservers.push(observer);observer.observe(card);
}
function drainCaptions(){while(!busy&&captionRunning<2&&captionQueue.length){const job=captionQueue.shift();captionRunning++;job().finally(()=>{captionRunning--;drainCaptions();});}}

const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
function check(version){if(version!==epoch || !user)throw Error('Your session changed. Sign in again to continue.');}
function setBusy(value){busy=value;if(!busy)drainCaptions();$('updateApp').disabled=value;document.querySelectorAll('#library button,#library input').forEach(el=>el.disabled=value);$('upload').disabled=value||!queue.some(x=>x.state!=='Uploaded'&&!x.invalid);renderPhotoSelection();}
function node(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
const listTitles={active:'Active properties',completed:'Completed photos',archive:'Archive'};
function propertyList(p){
  if(p.archived_at)return 'archive';
  return p.completed_at?'completed':'active';
}
async function moveArchive(p,archive){
  const version=epoch;
  let query=client.from('photo_properties').update({archived_at:archive?new Date().toISOString():null})
    .eq('id',p.id).eq('completed_at',p.completed_at).is('deleting_at',null);
  query=archive?query.is('archived_at',null):query.eq('archived_at',p.archived_at);
  const {error,data}=await query.select('id').maybeSingle();
  check(version);
  if(error)throw error;
  await loadProperties();
  status(data?(archive?'Moved to Archive.':'Restored to Completed photos.'):'The property changed. The list has been refreshed.');
}
function photoLabel(n){return n+' photo'+(n===1?'':'s');}
function syncPhotoCount(){
  const row=properties.find(p=>p.id===selected?.id);
  if(row)row.photo_count=photos.length;
  $('count').textContent=photoLabel(photos.length);
}
function renderProperties(){
  const search=$('search').value.trim().toLowerCase(),list=$('properties');
  list.replaceChildren();
  for(const p of properties.filter(p=>propertyList(p)===listMode&&p.address.toLowerCase().includes(search))){
    const address=node('button',p.address);
    if(p.photo_count>0){
      address.append(' · ',node('span',photoLabel(p.photo_count),'address-photo-count'));
    }
    address.disabled=busy;
    if(p.id===selected?.id)address.setAttribute('aria-current','true');
    address.onclick=()=>run(()=>openProperty(p));
    if(listMode==='active'||p.deleting_at){list.append(address);continue;}
    const row=node('div',null,'property-action-row'),archive=listMode==='completed';
    const action=node('button',archive?'Archive':'Restore','secondary archive-action');
    action.setAttribute('aria-label',(archive?'Archive ':'Restore ')+p.address);
    action.disabled=busy;
    action.onclick=()=>run(()=>moveArchive(p,archive));
    row.append(address,action);list.append(row);
  }
  const empty={active:'No active properties. Enter an address to begin.',completed:'No completed photo sets.',archive:'No archived photo sets.'};
  if(!list.children.length)list.append(node('p',empty[listMode],'hint'));
}
function setItemState(item,state){
  item.state=state;if(item.row)item.row.textContent=item.file.name+' — '+state;
}
function renderQueue(){
  $('queue').replaceChildren(...queue.map(x=>(x.row=node('div',x.file.name+' — '+x.state,'queue-row'))));
  $('upload').textContent=queue.some(x=>x.state.startsWith('Failed'))?'Retry remaining photos':'Upload photos';
  $('upload').disabled=busy||!queue.some(x=>x.state!=='Uploaded'&&!x.invalid);
}
const dirtyDescriptions=new Set();
function descriptionEditor(photo,property,version){
  const label=node('label','Description (optional)');
  const input=node('input');input.type='text';input.maxLength=80;input.className='photo-description';
  input.value=photo.description;
  input.setAttribute('aria-label','Description for '+originalName(photo.name));
  const note=node('small');note.setAttribute('role','status');
  let saving=null,timer;
  const editor={save:persistDescription};
  function persistDescription(){
    clearTimeout(timer);
    if(saving)return saving;
    if(!dirtyDescriptions.has(editor))return Promise.resolve();
    saving=(async()=>{
      while(dirtyDescriptions.has(editor)){
        check(version);
        const value=input.value.trim();
        if(value!==photo.description){
          note.textContent='Saving…';
          const {error}=await client.rpc('set_photo_description',{p_property:property.id,p_object:photo.id,p_description:value});
          check(version);if(error)throw error;
          photo.description=value;
        }
        if(input.value.trim()===value){dirtyDescriptions.delete(editor);note.textContent='Saved';}
      }
    })().catch(()=>{
      note.textContent='Not saved. Return to this box and press Tab to retry.';
      throw Error('A photo description could not be saved. Check your connection and try again.');
    }).finally(()=>{saving=null;});
    return saving;
  }
  const autoSave=()=>persistDescription().catch(()=>{});
  input.oninput=()=>{
    dirtyDescriptions.add(editor);note.textContent='Unsaved';
    clearTimeout(timer);timer=setTimeout(autoSave,650);
  };
  input.onblur=autoSave;
  input.onkeydown=event=>{
    if(event.key!=='Tab'||event.ctrlKey||event.altKey||event.metaKey)return;
    const fields=[...$('photos').querySelectorAll('.photo-description')];
    const next=fields[fields.indexOf(input)+(event.shiftKey?-1:1)];
    if(next){event.preventDefault();next.focus();}
  };
  label.append(input,note);return label;
}
async function flushDescriptions(){
  await Promise.all([...dirtyDescriptions].map(editor=>editor.save()));
}
async function run(action){if(busy)return;setBusy(true);try{if(dirtyDescriptions.size)await flushDescriptions();await action();}catch(error){status(error.message||'Something went wrong. Please try again.',true);}finally{setBusy(false);}}
async function loadProperties(){
  const version=epoch,rows=[];
  for(let offset=0;;offset+=500){const {data,error}=await client.from('photo_property_counts').select('id,address,created_at,completed_at,archived_at,deleting_at,photo_count').order('address').order('id').range(offset,offset+499);check(version);if(error)throw error;rows.push(...data);if(data.length<500)break;}
  properties=rows;renderProperties();
}
function refreshFieldList(){
 if(user&&!busy&&!selected&&!$('library').hidden&&document.visibilityState==='visible')loadProperties().catch(e=>status(e.message,true));
}
document.addEventListener('visibilitychange',refreshFieldList);
window.addEventListener('focus',refreshFieldList);
async function openProperty(p){
  if(queue.some(x=>x.state!=='Uploaded')&&!confirm('Leave the selected photos? Photos not uploaded will need to be selected again.'))return;
  selectedPhotos.clear();selected=p;
  $('stewartPhotos').hidden=!stewartMode||propertyList(p)!=='completed'||!!p.deleting_at;
  $('stewartNo').checked=!!launchTransfer;updateStewartRequest();
  photos=[];queue=[];$('files').value='';renderQueue();$('photos').replaceChildren();$('workspace').hidden=false;$('addressList').hidden=true;$('uploadControls').hidden=!!p.completed_at||!!p.deleting_at;$('complete').hidden=!!p.completed_at||!!p.deleting_at;$('reopen').hidden=!p.completed_at||!!p.deleting_at;$('completedNote').hidden=!p.completed_at;$('completedNote').textContent=p.archived_at?'This photo set is archived.':'This upload set is completed.';$('propertyTitle').textContent=p.address;renderProperties();window.PropertyThesisFieldApp?.recordView();await refreshPhotos();$('propertyTitle').focus();
}
async function refreshPhotos(limitSignal){
  const version=epoch,p=selected;if(!p)return;const prefix=user.id+'/'+p.id;
  status('Loading photos…');const [rows,dateResult,labels]=await Promise.all([
    listPhotos(bucket,prefix),
    client.rpc('photo_dates_for_property',{p_property:p.id}).then(result=>result.data,()=>null),
    client.rpc('get_photo_descriptions',{p_property:p.id})
  ]);limitSignal?.throwIfAborted();check(version);if(p.id!==selected?.id)return;
  if(labels.error)throw Error('Could not load photo descriptions. Refresh photos to retry.');
  status('Arranging photos in capture order…');
  for(const photo of rows){
    photo.description=labels.data?.[photo.id]||'';
    const stored=dateResult?.[photo.id];
    if(stored){try{captureDates.set(prefix+'/'+photo.name,dateParts(stored).label);photo.takenOn=stored;}catch{/* Read the original if metadata is invalid. */}}
  }
  if(stewartMode && propertyList(p)==='completed' && !p.deleting_at){
    status('Checking the OneDrive property folder…');
    const zip=await localStewartExport(p,rows);
    check(version);if(p.id!==selected?.id)return;
    if(zip)for(const photo of rows)photo.localEntry=zip.file(photo.name);
  }
  let incomplete=false;
  for(let offset=0;offset<rows.length;offset+=4){
    limitSignal?.throwIfAborted();check(version);if(p.id!==selected?.id)return;
    await Promise.all(rows.slice(offset,offset+4).map(async photo=>{
      const key=prefix+'/'+photo.name;
      // An object name includes the file hash, so its camera time is immutable.
      if(cameraTimes.has(key))photo.cameraTime=cameraTimes.get(key);
      else{
        try{
          const stamp=await bounded(signal=>readOrderTimestamp(photo,version,signal),limitSignal,20000);
          check(version);if(p.id!==selected?.id)return;
          photo.cameraTime=stamp;cameraTimes.set(key,stamp);
        }catch{incomplete=true;}
      }
    }));
  }
  limitSignal?.throwIfAborted();check(version);if(p.id!==selected?.id)return;
  photos=sortByCaptureTime(rows);
  for(const name of selectedPhotos){if(!photos.some(p=>p.name===name))selectedPhotos.delete(name);}
  clearCaptions();$('photos').replaceChildren();syncPhotoCount();
  for(const photo of photos){
    const card=node('article',null,'photo');card.dataset.photoName=photo.name;
    const label=node('label',null,'photo-select'),checkbox=node('input');checkbox.type='checkbox';checkbox.checked=selectedPhotos.has(photo.name);checkbox.disabled=busy;checkbox.setAttribute('aria-label','Select '+originalName(photo.name));checkbox.onchange=()=>{if(checkbox.checked)selectedPhotos.add(photo.name);else selectedPhotos.delete(photo.name);renderPhotoSelection();};label.append(checkbox,node('span','Select photo'));card.append(label);
    if(/\.(heic|heif)$/i.test(photo.name)){card.append(node('div','HEIC / HEIF photo','placeholder'));}
    else {const img=node('img');img.alt=originalName(photo.name);card.append(img);}
    const path=prefix+'/'+photo.name;
    if(!captureDates.has(path)&&photo.cameraTime)captureDates.set(path,dateParts(photo.cameraTime.slice(0,10)).label);
    const known=captureDates.get(path);
    const caption=node('div',null,'photo-caption'),date=node('p',known?'Taken: '+known:'Taken: Reading date…','taken-date');caption.append(node('p',originalName(photo.name)),date);card.append(caption);
    if(p.completed_at&&!p.deleting_at)caption.append(descriptionEditor(photo,p,version));
    else if(photo.description)caption.append(node('p',photo.description));
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
    $('photos').append(card);loadPreview(card,date,card.querySelector('img'),photo,version);
  }
  renderPhotoSelection();
  status(p.deleting_at?'Property deletion is unfinished. Click Delete property again to finish.':incomplete?'Some capture times could not be loaded. Refresh photos to retry.':photos.length?'Photos are up to date.':'This property is ready. Select photos to upload.');
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
  syncPhotoCount();renderPhotoSelection();
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
// Bound retained original bytes independently of the number of photos in a property.
const recentBlobs=new Map(),pendingReads=new Map();
let retainedBytes=0;
function clearTransferCache(){recentBlobs.clear();pendingReads.clear();retainedBytes=0;}
async function getPhoto(photo,version){
  check(version);
  const property=selected.id,path=user.id+'/'+property+'/'+photo.name;
  if(photo.localEntry)return photo.localEntry.async('blob');
  const local=queue.find(item=>item.name===photo.name&&item.state==='Uploaded');
  if(local)return local.file;
  if(recentBlobs.has(path))return recentBlobs.get(path);
  if(pendingReads.has(path))return pendingReads.get(path);
  const read=(async()=>{
    const {data,error}=await bucket.download(path);
    check(version);if(error)throw error;
    if(selected?.id===property&&pendingReads.get(path)===read){
      while(retainedBytes+data.size>32*1024*1024&&recentBlobs.size){
        const oldest=recentBlobs.keys().next().value;
        retainedBytes-=recentBlobs.get(oldest).size;recentBlobs.delete(oldest);
      }
      recentBlobs.set(path,data);retainedBytes+=data.size;
    }
    return data;
  })();
  pendingReads.set(path,read);
  try{return await read;}finally{if(pendingReads.get(path)===read)pendingReads.delete(path);}
}

function save(blob,name){const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('newProperty').onsubmit=e=>{e.preventDefault();run(async()=>{
  const address=$('address').value.trim().replace(/\s+/g,' ');if(!address)throw Error('Enter a property address.');
  const existing=properties.find(p=>p.address.toLowerCase()===address.toLowerCase());if(existing){status('This address already exists'+(' in '+listTitles[propertyList(existing)])+'.');$('address').value='';return;}
  const version=epoch;const {data,error}=await client.from('photo_properties').insert({user_id:user.id,address}).select('id,address,created_at,completed_at,archived_at,deleting_at').single();check(version);
  if(error){if(error.code==='23505'){await loadProperties();const p=properties.find(p=>p.address.toLowerCase()===address.toLowerCase());if(p){status('This address already exists'+(' in '+listTitles[propertyList(p)])+'.');$('address').value='';return;}}throw error;}
  await loadProperties();$('address').value='';$('search').value='';renderProperties();status('Property created. Enter another address or choose one from the list.');
}).finally(()=>$('address').focus());};

let storageRequest=0;
function formatStorage(bytes){
  if(bytes>=1e9)return (bytes/1e9).toLocaleString(undefined,{maximumFractionDigits:2})+' GB';
  if(bytes>=1e6)return (bytes/1e6).toLocaleString(undefined,{maximumFractionDigits:1})+' MB';
  if(bytes>=1000)return (bytes/1000).toLocaleString(undefined,{maximumFractionDigits:1})+' KB';
  return bytes+' B';
}
async function refreshStorage(){
  const version=epoch,request=++storageRequest;
  const label=$('storageUsage'),meter=$('storageMeter');
  try{
    const {data,error}=await client.from('photo_storage_usage').select('photo_bytes,project_bytes,included_bytes').single();
    if(version!==epoch||request!==storageRequest)return;
    if(error||!data)throw Error('Storage unavailable');
    const {photo_bytes,project_bytes,included_bytes}=data;
    if(![photo_bytes,project_bytes,included_bytes].every(Number.isSafeInteger)||included_bytes<=0)throw Error('Invalid storage totals');
    const left=Math.max(0,included_bytes-project_bytes);
    label.textContent=formatStorage(photo_bytes)+' in your photos · '+formatStorage(left)+' left of '+formatStorage(included_bytes);
    meter.max=included_bytes;meter.value=Math.min(project_bytes,included_bytes);meter.hidden=false;
  }catch{
    if(version!==epoch||request!==storageRequest)return;
    label.textContent='Storage usage is unavailable.';meter.hidden=true;
  }
}
function showList(mode=listMode){
  if(queue.some(x=>x.state!=='Uploaded'&&!x.invalid)&&!confirm('Return to addresses without uploading the selected photos?'))return;
  clearCaptions();clearTransferCache();selectedPhotos.clear();listMode=mode;selected=null;photos=[];queue=[];$('files').value='';renderQueue();$('photos').replaceChildren();
  $('workspace').hidden=true;$('addressList').hidden=false;$('newProperty').hidden=mode!=='active';
  refreshStorage();window.PropertyThesisFieldApp?.recordView();
  $('listTitle').textContent=stewartMode&&mode==='completed'?'Stewart photo workflow — choose a completed property':listTitles[mode];
  $('activeTab').setAttribute('aria-pressed',String(mode==='active'));$('completedTab').setAttribute('aria-pressed',String(mode==='completed'));$('archiveTab').setAttribute('aria-pressed',String(mode==='archive'));
  renderProperties();$('listTitle').focus();status(mode==='archive'?'Archived photo sets are available here.':mode==='completed'?'Completed photo sets are saved here.':'Choose a property or enter an address.');
}
$('backToList').onclick=()=>dirtyDescriptions.size?run(()=>showList()):showList();
$('activeTab').onclick=()=>showList('active');
$('archiveTab').onclick=()=>showList('archive');
$('completedTab').onclick=()=>showList('completed');
async function changeCompletion(completed){
  if(queue.some(x=>x.state!=='Uploaded'&&!x.invalid))throw Error('Upload or clear the selected photos before marking this set completed.');
  if(completed&&!photos.length)throw Error('Upload at least one photo before marking this set completed.');
  const version=epoch;
  const {data,error}=await client.from('photo_properties').update({completed_at:completed?new Date().toISOString():null,archived_at:null}).eq('id',selected.id).select('id,address,created_at,completed_at,archived_at,deleting_at').single();
  check(version);if(error)throw error;
  selected=data;await loadProperties();
  if(completed){showList('active');status('Upload set completed. Find it in Completed photos.');}
  else{listMode='active';await openProperty(data);}
}
$('complete').onclick=()=>run(()=>changeCompletion(true));
$('reopen').onclick=()=>run(()=>changeCompletion(false));
$('search').oninput=renderProperties;
$('files').onchange=()=>{queue=Array.from($('files').files).map(file=>{try{validateFile(file);return {file,state:'Ready'};}catch(e){return {file,state:e.message,invalid:true};}});renderQueue();};
let batchController=null;
$('pauseUpload').onclick=()=>batchController?.abort();
$('upload').onclick=()=>run(async()=>{
  if(selected.completed_at)throw Error('Reopen this completed set before uploading.');
  const version=epoch,prefix=user.id+'/'+selected.id;
  const waiting=queue.filter(item=>!item.invalid&&item.state!=='Uploaded');
  const controller=new AbortController();
  batchController=controller;
  const pause=$('pauseUpload');
  pause.hidden=false;pause.disabled=false;
  const confirmed=new Set(photos.map(photo=>photo.name));
  for(const item of queue)if(item.state==='Uploaded')confirmed.add(item.name);
  let next=0,uploaded=0,failures=0,interruption='';
  async function worker(){
    while(next<waiting.length&&!controller.signal.aborted&&!interruption){
      check(version);
      const item=waiting[next++];
      setItemState(item,'Uploading…');
      try{
        item.name=await sendQueuedPhoto({file:item.file,prefix,auth:client.auth,
          takenDate:async file=>{
            item.cameraTime=await cameraTimestamp(file);
            return item.cameraTime?.slice(0,10)||null;
          },
          createClient:createUploadClient,knownNames:confirmed,signal:controller.signal,
          onRetry:(number,kind)=>setItemState(item,(kind==='auth'?'Renewing sign-in':'Connection interrupted')+' · retry '+number+' of 2')
        });
        check(version);if(item.cameraTime!==undefined)cameraTimes.set(prefix+'/'+item.name,item.cameraTime);
        confirmed.add(item.name);setItemState(item,'Uploaded');uploaded++;
        const row=properties.find(p=>p.id===selected.id);
        if(row)row.photo_count=confirmed.size;
      }catch(error){
        check(version);
        if(controller.signal.aborted){setItemState(item,'Ready');break;}
        const kind=uploadFailure(error);
        setItemState(item,'Failed: '+(error.message||'Upload interrupted'));failures++;
        if(kind!=='file')interruption=kind==='auth'?'Sign-in could not be renewed.':'The connection is unavailable.';
      }
      status(uploaded+' of '+waiting.length+' photos confirmed.');
    }
  }
  try{
    const workers=matchMedia('(pointer: coarse), (max-width: 760px)').matches?1:3;
    await Promise.all(Array.from({length:Math.min(workers,waiting.length)},worker));
    check(version);
    const paused=controller.signal.aborted||interruption;
    if(!paused){
      try{await bounded(signal=>refreshPhotos(signal),controller.signal,30000);}
      catch{interruption='Gallery refresh interrupted.';}
    }
    const remaining=queue.filter(item=>!item.invalid&&item.state!=='Uploaded').length;
    status(uploaded+' uploaded. '+(remaining?(interruption||'Upload paused.')+' '+remaining+' remaining. Tap Retry remaining photos.':interruption||'Uploads complete.'),!!failures||!!interruption);
  }finally{
    batchController=null;pause.hidden=true;renderQueue();
    if(queue.some(item=>!item.invalid&&item.state!=='Uploaded'))$('upload').textContent='Retry remaining photos';
  }
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
async function readOrderTimestamp(photo,version,signal){
  const path=user.id+'/'+selected.id+'/'+photo.name;
  if(!photo.localEntry&&!recentBlobs.has(path)&&!pendingReads.has(path)&&!queue.some(item=>item.name===photo.name)){
    // Read only the camera header of larger JPEGs before sorting.
    if(/\.jpe?g$/i.test(photo.name)&&Number(photo.metadata?.size)>262144){
      const {data,error}=await bucket.download(path,undefined,{headers:{Range:'bytes=0-262143'},signal});
      check(version);
      if(!error&&data){
        const stamp=await cameraTimestamp(data).catch(()=>null);
        if(stamp||data.size>=Number(photo.metadata?.size))return stamp;
      }
    }
  }
  signal?.throwIfAborted();
  return cameraTimestamp(await getPhoto(photo,version)).catch(()=>null);
}
async function orderForDownload(items,version,limit){
  const originals=new Map();
  const fits=items.reduce((sum,p)=>sum+(Number(p.metadata?.size)||Infinity),0)<=limit;
  for(let offset=0;offset<items.length;offset+=4){
    check(version);
    await Promise.all(items.slice(offset,offset+4).map(async photo=>{
      if(photo.cameraTime!==undefined)return;
      if(fits){
        const blob=await getPhoto(photo,version);
        originals.set(photo.name,blob);
        photo.cameraTime=await cameraTimestamp(blob).catch(()=>null);
      }else photo.cameraTime=await readOrderTimestamp(photo,version);
    }));
  }
  check(version);
  return {ordered:sortByCaptureTime(items),originals};
}
function sortByCaptureTime(items){
  const byName=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
  const orderKey=p=>{
    const value=p.cameraTime||p.takenOn;
    if(!value)return '~';
    return value.length===10?value+'T99':value;
  };
  return items.slice().sort((a,b)=>{
    const left=orderKey(a),right=orderKey(b);
    if(left!==right)return left<right?-1:1;
    return byName.compare(originalName(a.name),originalName(b.name))||a.name.localeCompare(b.name);
  });
}
async function downloadPhotos(items,date=''){
 if(!items.length)throw Error('Select photos to download.');
 if(!window.JSZip)throw Error('The ZIP tool did not load. Refresh the page and try again.');
 const version=epoch,name=safeName(selected.address.split(',')[0].slice(0,18))+'-ready',limit=128*1024*1024;let zip=new window.JSZip(),bytes=0,part=1,done=0;
 status('Sorting photos by the time they were taken…');
 const {ordered,originals}=await orderForDownload(items,version,limit);
 const digits=Math.max(3,String(ordered.length).length);
 const flush=async(final)=>{const blob=await zip.generateAsync({type:'blob',compression:'STORE'});check(version);save(blob,name+(date?'-dated-'+date:'')+(part>1||!final?'-part-'+part:'')+'.zip');part++;zip=new window.JSZip();bytes=0;};
 for(let offset=0;offset<ordered.length;offset+=4){
  check(version);
  const batch=ordered.slice(offset,offset+4);
  const blobs=await Promise.all(batch.map(photo=>originals.get(photo.name)||getPhoto(photo,version)));
  check(version);
  for(const [index,photo] of batch.entries()){
    check(version);status('Preparing '+(date?'dated ':'')+'photo '+(done+1)+' of '+items.length+'…');
    let blob=blobs[index];originals.delete(photo.name);
    const original=originalName(photo.name),dot=original.lastIndexOf('.');
    const stem=safeName(original.slice(0,dot)).slice(0,18);
    const suffix=date?'-'+date+'.jpg':original.slice(dot);
    const description=photo.description?safeName(photo.description)+'-':'';
    const filename=String(done+1).padStart(digits,'0')+'-'+description+stem+suffix;
    blob=date?await stampPhoto(blob,date,original):await uprightJpeg(blob,original);
    check(version);
    if(bytes&&bytes+blob.size>limit)await flush(false);
    const options={};if(date){const d=dateParts(date);options.date=new Date(Date.UTC(Math.min(2107,Math.max(1980,d.year)),d.month-1,d.day));}
    zip.file(filename,blob,options);bytes+=blob.size;done++;
  }
 }
 await flush(true);status(done+' '+(date?'dated JPG copies':'photos')+' downloaded. Extract the ZIP'+(part>2?' files':' file')+' to access your photos.');
}
$('downloadAll').onclick=()=>run(()=>downloadPhotos([...photos]));
$('downloadSelected').onclick=()=>run(()=>downloadPhotos(photos.filter(p=>selectedPhotos.has(p.name))));
$('downloadAllDated').onclick=()=>askDownloadDate(false);
$('downloadSelectedDated').onclick=()=>askDownloadDate(true);
$('signout').onclick=()=>run(async()=>{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;});
addEventListener('beforeunload',e=>{if(busy||dirtyDescriptions.size||queue.some(x=>x.state!=='Uploaded'&&!x.invalid)){e.preventDefault();e.returnValue='';}});
addEventListener('offline',()=>status('You are offline. Keep this page open and retry remaining uploads when connected.',true));
const installedDisplay=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
$('install').hidden=installedDisplay();
function showInstallHelp(){const help=$('installHelp');help.open=true;help.querySelector('summary').focus();help.scrollIntoView({block:'nearest'});}
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install').hidden=installedDisplay();});
addEventListener('appinstalled',()=>{installPrompt=null;$('install').hidden=true;$('installHelp').open=false;});
$('install').onclick=async()=>{
  if(!installPrompt){showInstallHelp();return;}
  const prompt=installPrompt;installPrompt=null;$('install').disabled=true;
  try{await prompt.prompt();const choice=await prompt.userChoice;if(choice?.outcome==='accepted')$('install').hidden=true;else showInstallHelp();}
  catch{showInstallHelp();}
  finally{$('install').disabled=false;}
};
async function sessionChanged(session){
  const next=session?.user;if(next?.id===user?.id&&user)return;
  $('storageUsage').textContent='Checking storage…';$('storageMeter').hidden=true;
  dirtyDescriptions.clear();batchController?.abort();clearCaptions();clearTransferCache();cameraTimes.clear();captureDates.clear();datedRequest=null;$('dateDownloadDialog').close();selectedPhotos.clear();epoch++;const version=epoch;user=next||null;selected=null;properties=[];photos=[];queue=[];
  $('files').value='';$('photos').replaceChildren();$('properties').replaceChildren();$('queue').replaceChildren();$('account').textContent='';$('library').hidden=true;$('workspace').hidden=true;$('addressList').hidden=false;$('signedOut').hidden=!!user;
  if(!user){initPhotoCaptcha();status('Sign in to upload and download your property photos.');return;}
  try{const {data,error}=await client.rpc('photo_library_enabled');check(version);if(error)throw error;if(!data){$('signedOut').hidden=false;initPhotoCaptcha();status('Photo Uploads is currently available only to the pilot account.',true);return;}$('library').hidden=false;$('password').value='';$('account').textContent=user.email;await loadProperties();showList(stewartMode?'completed':'active');await openRequestedAddress();}catch(e){if(version===epoch)status(e.message,true);}
}
let requestedAddressHandled=false;
async function openRequestedAddress(){
 const url=new URL(location.href),raw=url.searchParams.get('address');const setId=url.searchParams.get('set');
 if(requestedAddressHandled)return;
 if(setId){
   requestedAddressHandled=true;
   const record=properties.find(p=>p.id===setId);
   if(record){listMode=propertyList(record);await openProperty(record);}else status('This photo set is unavailable.',true);
   return;
 }
 if(!raw)return;
 const address=raw.trim().replace(/\s+/g,' ');if(!address||address.length>500){status('Enter a valid property address of 500 characters or fewer.',true);return;}
 await run(async()=>{
  const version=epoch;let property=properties.find(p=>p.address.toLowerCase()===address.toLowerCase());
  if(stewartMode){const key=a=>a.replace(/[.,]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();const exact=properties.filter(row=>propertyList(row)==='completed'&&!row.deleting_at&&key(row.address)===key(address));property=exact.length===1?exact[0]:null;}
  if(stewartMode&&!property){
    // A BPO may supply only the street line. Keep the unit and require one completed match.
    const matches=properties.filter(row=>propertyList(row)==='completed'&&!row.deleting_at&&row.address.split(',')[0].trim().toLowerCase()===address.toLowerCase());
    if(matches.length===1)property=matches[0];
  }
  if(stewartMode&&(!property||propertyList(property)!=='completed'||property.deleting_at)){
   $('stewartFolder').hidden=!launchTransfer;status(launchTransfer?'No unique completed set matched. Select this property’s PT Photos folder below.':'Choose the matching address from Completed photos for the Stewart workflow.');
  }else if(!property){
   $('address').value=address;status('No photo address exists for this property. Click Create only when you are ready to add photos.');$('address').focus();
  }else{check(version);listMode=propertyList(property);await openProperty(property);if(launchTransfer)await transferSet();}
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
    if(dirtyDescriptions.size)await flushDescriptions();
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
if(window===parent){
  // Keep the photo workspace mounted so tab switches preserve the open set and file queue.
  const launchParams=new URLSearchParams(location.search);
  let currentEntry=null,restoring=false;
  const fieldView=()=>document.body.classList.contains('pt-orders-open') && app.dashboard
    ? app.dashboard.view() : {screen:'photos',mode:selected?propertyList(selected):listMode,set:selected?.id || null};
  // The real launch entry is the root. Only user navigation adds entries above it.
  function beginHistory(event){
    if(!user || !event.target.closest('#fieldViews,#ptOrders,#library'))return;
    if(currentEntry?.owner===user.id)return;
    currentEntry={owner:user.id,index:history.state?.ptField?.index || 0,view:fieldView()};
    history.replaceState({...history.state,ptField:currentEntry},'');
  }
  document.addEventListener('click',beginHistory,true);
  document.addEventListener('change',beginHistory,true);
  const app=window.PropertyThesisFieldApp={
    recordView(){
      queueMicrotask(()=>{
        if(restoring || !user || currentEntry?.owner!==user.id)return;
        const view=fieldView();
        if(JSON.stringify(view)===JSON.stringify(currentEntry.view))return;
        currentEntry={owner:user.id,index:currentEntry.index+1,view};
        history.pushState({ptField:currentEntry},'');
      });
    },
    startOnDashboard:!stewartMode && !launchParams.get('address') && !launchParams.get('set'),
    canShowDashboard(){
      if(!busy)return true;
      status('Wait for the current photo operation to finish before switching views.');return false;
    },
    resumePhotos(){
      if(!user||busy||$('library').hidden)return;
      if(!selected){refreshFieldList();return;}
      const id=selected.id;
      loadProperties().then(()=>{
        if(selected?.id!==id)return;
        const updated=properties.find(p=>p.id===id);
        if(!updated){showList();return;}
        selected=updated;listMode=propertyList(updated);
        $('uploadControls').hidden=!!updated.completed_at||!!updated.deleting_at;
        $('complete').hidden=$('uploadControls').hidden;
        $('reopen').hidden=!updated.completed_at||!!updated.deleting_at;
        $('completedNote').hidden=!updated.completed_at;
        $('completedNote').textContent=updated.archived_at?'This photo set is archived.':'This upload set is completed.';
      }).catch(e=>status(e.message,true));
    },
    openSet(id){
      if(selected?.id===id){this.resumePhotos();this.recordView();return;}
      run(async()=>{await loadProperties();const p=properties.find(row=>row.id===id);
        if(!p)throw Error('This photo set is unavailable.');
        await openProperty(p);if(selected?.id===id)listMode=propertyList(p);
      });
    }
  };
  window.addEventListener('popstate',async event=>{
    const target=event.state?.ptField;
    if(!target || !user || target.owner!==user.id)return;
    if(currentEntry?.index===target.index)return;
    const previous=currentEntry;
    restoring=true;
    try{
      let ok=false;
      const view=target.view;
      if(!busy && view.screen==='dashboard' && app.dashboard)ok=await app.dashboard.restore(view);
      if(!busy && view.screen==='photos'){
        if(dirtyDescriptions.size)await flushDescriptions();
        if(app.dashboard && !await app.dashboard.hide()){if(previous)history.go(previous.index-target.index);return;}
        if(view.set && selected?.id!==view.set){
          await run(async()=>{
            await loadProperties();
            const p=properties.find(row=>row.id===view.set);
            if(p){await openProperty(p);if(selected?.id===p.id)listMode=propertyList(p);}
            else showList(view.mode);
          });
          ok=selected?.id===view.set || (!selected && !properties.some(p=>p.id===view.set));
        }else if(!view.set && (selected || listMode!==view.mode)){
          showList(view.mode);ok=!selected && listMode===view.mode;
        }else{app.resumePhotos();ok=true;}
      }
      if(!ok && previous){history.go(previous.index-target.index);return;}
      currentEntry=target;
    }catch(error){
      status(error.message || 'Unable to return to that screen.',true);
      if(previous)history.go(previous.index-target.index);
    }finally{restoring=false;}
  });
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='./order-dashboard.css?v=appointment-row-1';document.head.append(sheet);
  import('./order-dashboard.js?v=appointment-start-row-1').catch(()=>status('Dashboard could not load. Use Update app to retry.',true));
}
