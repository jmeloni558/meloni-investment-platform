import {BUCKET,MAX_BYTES,safeName,validateFile,originalName,downloadName,listPhotos,uploadPhoto} from './photo-library.mjs';
const $=id=>document.getElementById(id);
const client=window.supabase?.createClient('https://lmaiqpkogmmsldkziggy.supabase.co','sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7');
let user=null,properties=[],selected=null,photos=[],queue=[],busy=false,epoch=0,installPrompt;
const bucket=client?.storage.from(BUCKET);
const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
function check(version){if(version!==epoch || !user)throw Error('Your session changed. Sign in again to continue.');}
function setBusy(value){busy=value;document.querySelectorAll('#library button,#library input').forEach(el=>el.disabled=value);$('upload').disabled=value||!queue.some(x=>x.state!=='Uploaded'&&!x.invalid);}
function node(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function renderProperties(){
  const search=$('search').value.trim().toLowerCase();$('properties').replaceChildren();
  for(const p of properties.filter(p=>p.address.toLowerCase().includes(search))){const b=node('button',p.address);b.disabled=busy;if(p.id===selected?.id)b.setAttribute('aria-current','true');b.onclick=()=>run(()=>openProperty(p));$('properties').append(b);}
  if(!$('properties').children.length)$('properties').append(node('p','No matching properties.','hint'));
}
function renderQueue(){
  $('queue').replaceChildren(...queue.map(x=>node('div',x.file.name+' — '+x.state,'queue-row')));
  $('upload').textContent=queue.some(x=>x.state.startsWith('Failed'))?'Retry remaining photos':'Upload photos';
  $('upload').disabled=busy||!queue.some(x=>x.state!=='Uploaded'&&!x.invalid);
}
async function run(action){if(busy)return;setBusy(true);try{await action();}catch(error){status(error.message||'Something went wrong. Please try again.',true);}finally{setBusy(false);}}
async function loadProperties(){
  const version=epoch,rows=[];
  for(let offset=0;;offset+=500){const {data,error}=await client.from('photo_properties').select('id,address,created_at').order('address').order('id').range(offset,offset+499);check(version);if(error)throw error;rows.push(...data);if(data.length<500)break;}
  properties=rows;renderProperties();
}
async function openProperty(p){
  if(queue.some(x=>x.state!=='Uploaded')&&!confirm('Leave the selected photos? Photos not uploaded will need to be selected again.'))return;
  selected=p;photos=[];queue=[];$('files').value='';renderQueue();$('photos').replaceChildren();$('workspace').hidden=false;$('empty').hidden=true;$('propertyTitle').textContent=p.address;renderProperties();await refreshPhotos();$('propertyTitle').focus();
}
async function refreshPhotos(){
  const version=epoch,p=selected;if(!p)return;const prefix=user.id+'/'+p.id;
  status('Loading photos…');const rows=await listPhotos(bucket,user.id+'/'+p.id);check(version);if(p.id!==selected?.id)return;photos=rows;
  $('photos').replaceChildren();$('count').textContent=photos.length+' photo'+(photos.length===1?'':'s');
  for(const photo of photos){
    const card=node('article',null,'photo');
    if(/\.(heic|heif)$/i.test(photo.name)){card.append(node('div','HEIC / HEIF photo','placeholder'));}
    else {const img=node('img');img.alt=originalName(photo.name);img.loading='lazy';card.append(img);const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();if(version!==epoch)return;bucket.createSignedUrl(prefix+'/'+photo.name,300).then(({data,error})=>{if(version!==epoch)return;if(error){img.replaceWith(node('div','Preview unavailable','placeholder'));return;}img.src=data.signedUrl;}).catch(()=>{img.replaceWith(node('div','Preview unavailable','placeholder'));});});observer.observe(img);}
    card.append(node('p',originalName(photo.name)));
    const download=node('button','Download','secondary');download.onclick=()=>run(async()=>{const blob=await getPhoto(photo,epoch);save(blob,downloadName(photo.name));status('Photo downloaded.');});card.append(download);$('photos').append(card);
  }
  status(photos.length?'Photos are up to date.':'This property is ready. Select photos to upload.');
}
async function getPhoto(photo,version){check(version);const {data,error}=await bucket.download(user.id+'/'+selected.id+'/'+photo.name);check(version);if(error)throw error;return data;}
function save(blob,name){const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('newProperty').onsubmit=e=>{e.preventDefault();run(async()=>{
  const address=$('address').value.trim().replace(/\s+/g,' ');if(!address)throw Error('Enter a property address.');
  const existing=properties.find(p=>p.address.toLowerCase()===address.toLowerCase());if(existing){await openProperty(existing);return;}
  const version=epoch;const {data,error}=await client.from('photo_properties').insert({user_id:user.id,address}).select('id,address,created_at').single();check(version);
  if(error){if(error.code==='23505'){await loadProperties();const p=properties.find(p=>p.address.toLowerCase()===address.toLowerCase());if(p){await openProperty(p);return;}}throw error;}
  await loadProperties();await openProperty(data);$('address').value='';
});};
$('search').oninput=renderProperties;
$('files').onchange=()=>{queue=Array.from($('files').files).map(file=>{try{validateFile(file);return {file,state:'Ready'};}catch(e){return {file,state:e.message,invalid:true};}});renderQueue();};
$('upload').onclick=()=>run(async()=>{
  const version=epoch,prefix=user.id+'/'+selected.id;let failures=0,uploaded=0;
  for(const item of queue){if(item.invalid||item.state==='Uploaded')continue;check(version);item.state='Uploading…';renderQueue();status('Uploading '+item.file.name+'…');
    try{await uploadPhoto(bucket,prefix,item.file);check(version);item.state='Uploaded';uploaded++;}catch(e){check(version);item.state='Failed: '+(e.message||'Connection lost');failures++;}renderQueue();
  }
  await refreshPhotos();status(uploaded+' uploaded. '+(failures?failures+' failed. Tap Retry remaining photos.':'Uploads complete.'),!!failures);renderQueue();
});
$('refresh').onclick=()=>run(refreshPhotos);
$('folder').hidden=!('showDirectoryPicker' in window);
$('folder').onclick=()=>run(async()=>{
  if(!photos.length)throw Error('There are no photos to download yet.');
  let root;try{root=await window.showDirectoryPicker({mode:'readwrite'});}catch(e){if(e.name==='AbortError')return;throw e;}
  const version=epoch,folder=await root.getDirectoryHandle(safeName(selected.address),{create:true});let done=0;
  for(const photo of photos){status('Saving photo '+(done+1)+' of '+photos.length+'…');const blob=await getPhoto(photo,version);const handle=await folder.getFileHandle(downloadName(photo.name),{create:true});const writer=await handle.createWritable();try{await writer.write(blob);await writer.close();}catch(e){await writer.abort().catch(()=>{});throw e;}done++;}
  status(done+' photos saved in '+safeName(selected.address)+'.');
});
$('zip').onclick=()=>run(async()=>{
  if(!photos.length)throw Error('There are no photos to download yet.');
  if(photos.reduce((sum,p)=>sum+Number(p.metadata?.size||MAX_BYTES),0)>250*1024*1024)throw Error('This library is too large for one ZIP. Use Save to PC folder in Chrome or Edge, or download photos individually.');
  if(!window.JSZip)throw Error('The ZIP tool did not load. Refresh the page and try again.');
  const version=epoch,zip=new window.JSZip(),name=safeName(selected.address),folder=zip.folder(name);let done=0;
  for(const photo of photos){status('Preparing photo '+(++done)+' of '+photos.length+'…');folder.file(downloadName(photo.name),await getPhoto(photo,version));}
  const blob=await zip.generateAsync({type:'blob',compression:'STORE'});check(version);save(blob,name+'.zip');status('ZIP downloaded. Extract it to access the '+name+' folder.');
});
$('signout').onclick=()=>run(async()=>{const {error}=await client.auth.signOut();if(error)throw error;});
addEventListener('beforeunload',e=>{if(busy||queue.some(x=>x.state!=='Uploaded'&&!x.invalid)){e.preventDefault();e.returnValue='';}});
addEventListener('offline',()=>status('You are offline. Keep this page open and retry remaining uploads when connected.',true));
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install').hidden=false;});
$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}};
async function sessionChanged(session){
  const next=session?.user;if(next?.id===user?.id&&user)return;
  epoch++;const version=epoch;user=next||null;selected=null;properties=[];photos=[];queue=[];
  $('files').value='';$('photos').replaceChildren();$('properties').replaceChildren();$('queue').replaceChildren();$('account').textContent='';$('library').hidden=true;$('workspace').hidden=true;$('empty').hidden=false;$('signedOut').hidden=!!user;
  if(!user){status('Sign in to upload and download your property photos.');return;}
  try{const {data,error}=await client.rpc('photo_library_enabled');check(version);if(error)throw error;if(!data){status('Photo Uploads is currently available only to the pilot account.',true);return;}$('library').hidden=false;$('account').textContent=user.email;await loadProperties();status('Choose a property or enter an address to begin.');}catch(e){if(version===epoch)status(e.message,true);}
}
if(!client)status('Unable to load sign-in. Check your connection and refresh.',true);
else {client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>sessionChanged(session),0));client.auth.getSession().then(({data,error})=>{if(error)status(error.message,true);else sessionChanged(data.session);});}
