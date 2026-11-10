const I='Additional Interior Subject Photo', E='Additional Exterior Subject Photo';
const categories=['Subject Address Verification Photo','Subject Photo of Front','Subject Photo of Back','Subject Street Scene','Subject Street Scene Facing Other Direction','Subject Left Side','Subject Right Side','Subject Photo of Side','Subject Backyard','Subject View From Front of House','Subject View From Back of House','Main Living Area','Bedroom','Bathroom','Kitchen',I,E];
function suggest(s){s=s.toLowerCase();return categories.find(k=>k.toLowerCase()===s)||([[/address|mailbox/,'Subject Address Verification Photo'],[/kitchen/,'Kitchen'],[/bath(room)?/,'Bathroom'],[/bed(room)?/,'Bedroom'],[/living room/,'Main Living Area'],[/exterior|balcony|porch|patio|yard/,E],[/interior|garage|hall|laundry|ceiling|closet|panel|heater/,I]].find(([r])=>r.test(s))?.[1]||'')}
function request(op,props){
 const id=crypto.randomUUID();return new Promise((resolve,reject)=>{
 const clean=()=>{clearTimeout(timer);window.removeEventListener('message',on)};
 function on(e){if(e.source!==window||e.origin!==location.origin||e.data?.kind!=='pt-photo-result'||e.data.id!==id)return;clean();e.data.response?.ok?resolve(e.data.response.value):reject(Error(e.data.response?.error||'Extension unavailable.'))}
 const timer=setTimeout(()=>{clean();reject(Error(op==='find'?'Load or reload PropertyThesis Importers 1.4.1 or newer in Edge, then refresh this page.':'Stewart did not respond. Check Photos/Files and retry; existing filenames will be skipped.'))},op==='find'?9000:75000);
 window.addEventListener('message',on);window.postMessage({kind:'pt-photos',id,op,...props},location.origin);
 });}
function elem(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e}
async function canvasFor(blob,name,rotation,max){
 let bitmap;try{bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'})}catch{throw Error('Cannot decode '+name+'. Convert this photo to JPEG and retry.')}
 try{const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),w=Math.round(bitmap.width*scale),h=Math.round(bitmap.height*scale),c=document.createElement('canvas');c.width=rotation%2?h:w;c.height=rotation%2?w:h;
 const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.translate(c.width/2,c.height/2);ctx.rotate(rotation*Math.PI/2);ctx.drawImage(bitmap,-w/2,-h/2,w,h);return c;
 }finally{bitmap.close()}}
export async function reviewTransfer({address,source,items,read,no,guard,progress}){
 if(!items.length)throw Error('This set has no photos.');
 const cmd=async(op,args={})=>{guard();return request(op,{address,target,...args})};let target;target=await cmd('find');
 const existing=new Map(await cmd('begin'));
 const d=elem('dialog'),title=elem('h2','Review photos for Stewart'),desc=elem('p',address+' · '+items.length+' photos'+(source?' from '+source:'')+'. Check orientation and choose labels. Existing filenames will keep their images and any saved labels.'),
 form=elem('form'),grid=elem('div'),cancel=elem('button','Cancel'),send=elem('button','Upload to Stewart'),repair=elem('label'),check=elem('input');check.type='checkbox';check.checked=no;repair.append(check,' Mark No for repair items on each photo');cancel.type='button';send.type='submit';
 Object.assign(d.style,{maxWidth:'90vw',maxHeight:'90vh',overflow:'auto'});Object.assign(grid.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:'12px'});form.append(grid,repair,send,cancel);d.append(title,desc,form);document.body.append(d);
 try{const rows=[];
 for(const [i,item] of items.entries()){guard();progress('Preparing preview '+(i+1)+' of '+items.length+'…');const preview=await canvasFor(await read(item),item.name,0,180),isExisting=existing.has(item.name.toLowerCase()),row=elem('section'),sel=elem('select'),rot=elem('button','Rotate 90°');rot.type='button';let angle=0;rot.onclick=()=>{angle=(angle+1)%4;preview.style.transform='rotate('+angle*90+'deg)'};rot.disabled=isExisting;const box=elem('div');Object.assign(box.style,{height:'182px',display:'grid',placeItems:'center'});box.append(preview);
 sel.append(new Option('Choose a label…',''));for(const k of categories)sel.append(new Option(k,k));sel.value=suggest(item.description||item.name);if(existing.get(item.name.toLowerCase())){sel.add(new Option(existing.get(item.name.toLowerCase())+' (saved)','existing'));sel.value='existing';sel.disabled=true}
 sel.required=true;row.append(box,elem('p',item.name+(isExisting?' (already uploaded)':'')),sel,rot);grid.append(row);rows.push({item,sel,angle:()=>angle,isExisting})}
 guard();const accepted=await new Promise(resolve=>{form.onsubmit=e=>{e.preventDefault();resolve(true)};cancel.onclick=()=>resolve(false);d.oncancel=()=>resolve(false);d.showModal()});d.close();if(!accepted){progress('Upload canceled.');return}
 for(const [i,r] of rows.entries()){guard();progress('Sending '+(i+1)+' of '+rows.length+': '+r.item.name);
 let data;if(!r.isExisting){const canvas=await canvasFor(await read(r.item),r.item.name,r.angle(),2400);data=canvas.toDataURL('image/jpeg',0.93).split(',')[1]}
 await cmd('file',{name:r.item.name,label:r.sel.value,no:check.checked,data});}
 const n=await cmd('finish',{names:items.map(x=>x.name),labels:rows.map(r=>existing.get(r.item.name.toLowerCase())||r.sel.value),no:check.checked});progress(n+' photos verified in Stewart'+(check.checked?' with Repair Item set to No':'')+'.');
 }finally{d.remove()}}
