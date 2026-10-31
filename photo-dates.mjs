const pending=new Map();
async function dependency(name,url){
  if(window[name])return window[name];
  if(!pending.has(name))pending.set(name,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.onload=()=>resolve(window[name]);script.onerror=()=>{pending.delete(name);script.remove();reject(Error('Photo date tools could not load. Check your connection and retry.'));};document.head.append(script);}));
  return pending.get(name);
}
export function dateParts(value){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');
  if(!match)throw Error('Enter the date to stamp on these photos.');
  const [,year,month,day]=match,date=new Date(0);date.setUTCFullYear(+year,+month-1,+day);date.setUTCHours(0,0,0,0);
  if(+year<1||date.getUTCFullYear()!==+year||date.getUTCMonth()!==+month-1||date.getUTCDate()!==+day)throw Error('Enter a valid photo date.');
  return {label:month+'/'+day+'/'+year.slice(-2),exif:year+':'+month+':'+day+' 00:00:00',year:+year,month:+month,day:+day};
}
export async function takenDate(blob){
  const exifr=await dependency('exifr','assets/vendor/exifr-7.1.3.js');
  // exifr handles JPEG/PNG/HEIF/TIFF; unwrap the TIFF metadata in WebP's RIFF container.
  const header=new Uint8Array(await blob.slice(0,12).arrayBuffer());
  if(String.fromCharCode(...header.slice(0,4))==='RIFF'&&String.fromCharCode(...header.slice(8,12))==='WEBP'){
    let found=false;
    for(let offset=12;offset+8<=blob.size;){
      const chunk=await blob.slice(offset,offset+8).arrayBuffer(),view=new DataView(chunk),size=view.getUint32(4,true);
      if(offset+8+size>blob.size)return null;
      if(view.getUint32(0)===0x45584946){let payload=blob.slice(offset+8,offset+8+size);const prefix=new Uint8Array(await payload.slice(0,6).arrayBuffer());if(String.fromCharCode(...prefix)==='Exif\0\0')payload=payload.slice(6);blob=payload;found=true;break;}
      offset+=8+size+(size%2);
    }
    if(!found)return null;
  }
  let tags;try{tags=await exifr.parse(blob,{reviveValues:false,pick:['DateTimeOriginal','CreateDate']});}catch(_){return null;}
  // Keep the camera's calendar date; do not shift it through a browser timezone.
  const raw=tags?.DateTimeOriginal||tags?.CreateDate,match=typeof raw==='string'&&/^(\d{4})[:-](\d{2})[:-](\d{2})/.exec(raw);
  if(!match)return null;
  try{return dateParts(match.slice(1).join('-')).label;}catch(_){return null;}
}
export async function stampPhoto(blob,date,name='photo'){
  const parts=dateParts(date),piexif=await dependency('piexif','assets/vendor/piexif-1.0.6.js');
  let bitmap;
  try{bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});}catch(error){
    if(!/\.(heic|heif)$/i.test(name))throw Error('Cannot read '+name+'. No dated copy was created.');
    const convert=await dependency('heic2any','assets/vendor/heic2any-0.0.4.min.js');
    try{const jpeg=await convert({blob,toType:'image/jpeg',quality:1});if(Array.isArray(jpeg))throw Error('Multiple images');bitmap=await createImageBitmap(jpeg,{imageOrientation:'from-image'});}catch(_){throw Error('Cannot convert '+name+' for dating. Convert it to JPG and upload it again.');}
  }
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  try{
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('This photo is too large for this browser to stamp.');
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);
    const size=Math.max(1,Math.round(Math.min(canvas.width/9,Math.min(canvas.width,canvas.height)*.038))),margin=Math.max(1,Math.round(size*.65));
    ctx.font='bold '+size+'px Arial';ctx.textAlign='right';ctx.textBaseline='bottom';ctx.lineWidth=Math.max(1,size*.12);ctx.strokeStyle='rgba(0,0,0,.85)';ctx.fillStyle='#ffffff';
    ctx.strokeText(parts.label,canvas.width-margin,canvas.height-margin);ctx.fillText(parts.label,canvas.width-margin,canvas.height-margin);
    const jpeg=canvas.toDataURL('image/jpeg',.95);if(!jpeg.startsWith('data:image/jpeg;base64,'))throw Error('This photo is too large for this browser to stamp.');
    // Canvas creates a new image without old EXIF/XMP/IPTC dates or stale thumbnails.
    // Populate every date field in the new file with the explicitly entered date.
    const metadata={'0th':{[piexif.ImageIFD.DateTime]:parts.exif,[piexif.ImageIFD.Orientation]:1},Exif:{[piexif.ExifIFD.DateTimeOriginal]:parts.exif,[piexif.ExifIFD.DateTimeDigitized]:parts.exif},GPS:{},'1st':{},thumbnail:null};
    const output=piexif.insert(piexif.dump(metadata),jpeg),binary=atob(output.split(',')[1]);
    return new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:'image/jpeg'});
  }finally{bitmap.close();canvas.width=canvas.height=1;}
}
