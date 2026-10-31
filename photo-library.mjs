export const BUCKET = 'property-photos';
export const MAX_BYTES = 25 * 1024 * 1024;
export const MIME = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif'};
export function safeName(value) {
  let name=String(value).normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,140).replace(/[. ]+$/g,'');
  if(!name || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name))name='Property_'+name;
  return name;
}
export function validateFile(file) {
  const type=MIME[file.name.split('.').pop().toLowerCase()];
  if(!type || (file.type && file.type!==type && !(type==='image/heic' && file.type==='image/heif')))throw Error('Choose JPG, PNG, WebP, HEIC or HEIF photos.');
  if(!file.size || file.size>MAX_BYTES)throw Error('Each photo must be between 1 byte and 25 MB.');
  return type;
}
export async function objectName(file) {
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
  const dot=file.name.lastIndexOf('.'),stem=safeName(file.name.slice(0,dot)).slice(0,110).replace(/[^a-zA-Z0-9._-]/g,'_');
  return hash+'--'+stem+'.'+file.name.slice(dot+1).toLowerCase();
}
export function originalName(name){return name.replace(/^[a-f0-9]{64}--/,'');}
export function downloadName(name){return safeName(originalName(name).replace(/(\.[^.]+)$/, '-'+name.slice(0,12)+'$1'));}
export async function listPhotos(bucket,prefix) {
  const rows=[];
  for(let offset=0;;offset+=100){const {data,error}=await bucket.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(error)throw error;rows.push(...data.filter(x=>x.id));if(data.length<100)return rows;}
}
export async function uploadPhoto(bucket,prefix,file) {
  const contentType=validateFile(file),name=await objectName(file);
  const {error}=await bucket.upload(prefix+'/'+name,file,{contentType,upsert:false});
  if(error){
    // A prior request may have succeeded before the connection dropped. Never overwrite it.
    const {data,error:lookupError}=await bucket.list(prefix,{search:name,limit:100});
    if(lookupError || !data.some(x=>x.name===name && x.id))throw error;
  }
  return name;
}
