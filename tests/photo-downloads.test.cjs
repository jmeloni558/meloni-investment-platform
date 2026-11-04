const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('photos.js','utf8'),code=source.slice(source.indexOf('async function orderForDownload('),source.indexOf("$('downloadAll').onclick"));
function fixture(){const saved=[],downloaded=[];let changed=false;class Zip{constructor(){this.files=[];}file(name,blob){this.files.push({name,blob});}async generateAsync(){return this.files;}}
 const context={readOrderTimestamp:async photo=>photo.testTime||null,cameraTimestamp:async photo=>photo.testTime||null,window:{JSZip:Zip},epoch:1,selected:{address:'123 Test Street'},safeName:s=>s,originalName:s=>s,check:()=>{if(changed)throw Error('Account changed');},status:()=>{},getPhoto:async photo=>{downloaded.push(photo.name);if(photo.fail)throw Error('Download failed');return photo;},save:(files,name)=>saved.push({files,name})};vm.createContext(context);vm.runInContext(code,context);return {context,saved,downloaded,revoke:()=>changed=true};}
test('large all/selected downloads split without dropping or duplicating originals',async()=>{const f=fixture(),photos=Array.from({length:4},(_,i)=>({name:i+'.jpg',size:70*1024*1024}));await f.context.downloadPhotos(photos);assert.equal(f.saved.length,4);assert.deepEqual(f.saved.map(x=>x.name),[1,2,3,4].map(n=>'123 Test Street-part-'+n+'.zip'));assert.deepEqual(f.saved.flatMap(x=>x.files.map(p=>p.blob)),photos);assert.deepEqual(f.downloaded,photos.map(p=>p.name));});
test('ordinary selection yields one ZIP and a failed download is never presented as complete',async()=>{const f=fixture();await f.context.downloadPhotos([{name:'selected.png',size:100}]);assert.equal(f.saved[0].name,'123 Test Street.zip');assert.deepEqual(f.downloaded,['selected.png']);const failed=fixture();await assert.rejects(failed.context.downloadPhotos([{name:'broken.jpg',size:100,fail:true}]),/Download failed/);assert.equal(failed.saved.length,0);const revoked=fixture();revoked.revoke();await assert.rejects(revoked.context.downloadPhotos([{name:'private.jpg',size:100}]),/Account changed/);assert.equal(revoked.saved.length,0);});
test('deep OneDrive downloads have short flat paths and distinct names for similar photos',async()=>{
 const f=fixture();f.context.selected.address='1404 N Riverhills Dr Temple Terrace, FL 33617';
 const prefix='very-long-camera-name-'.repeat(5);
 await f.context.downloadPhotos([{name:prefix+'1.jpeg',size:20},{name:prefix+'2.jpeg',size:20}]);
 const archive=f.saved[0];assert.ok(archive.name.length<=28);assert.equal(new Set(archive.files.map(e=>e.name)).size,2);
 for(const file of archive.files){assert.ok(file.name.length<=27);assert.ok(file.name.endsWith('.jpeg'));assert.doesNotMatch(file.name,/[\\/]/);}
 f.context.stampPhoto=async b=>b;f.context.dateParts=()=>({year:2026,month:11,day:2});
 await f.context.downloadPhotos([{name:prefix+'3.png',size:20}],'2026-11-02');
 assert.match(f.saved[1].files[0].name,/-2026-11-02\.jpg$/);
});
test('downloads overlap at most four reads and keep ZIP order even when later photos finish first',async()=>{
 const f=fixture(),photos=Array.from({length:9},(_,i)=>({name:i+'.jpg',size:100}));let active=0,peak=0;
 f.context.getPhoto=async photo=>{active++;peak=Math.max(active,peak);await new Promise(resolve=>setTimeout(resolve,10-Number.parseInt(photo.name)));active--;return photo;};
 await f.context.downloadPhotos(photos);
 assert.equal(peak,4);assert.deepEqual(f.saved[0].files.map(entry=>entry.blob),photos);
});
test('preview and ZIP reads share one request; just-uploaded files are read locally',async()=>{
 const remote=new Blob(['original']),local=new Blob(['local']);let calls=0;
 const ctx={user:{id:'owner'},selected:{id:'property'},queue:[],check(){},bucket:{download:async()=>{calls++;await Promise.resolve();return {data:remote};}}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const recentBlobs='),source.indexOf('function save(')),ctx);
 const photo={name:'sample.jpg'};const both=await Promise.all([ctx.getPhoto(photo,1),ctx.getPhoto(photo,1)]);assert.equal(calls,1);assert.ok(both.every(b=>b===remote));
 assert.equal(await ctx.getPhoto(photo,1),remote);assert.equal(calls,1);
 ctx.clearTransferCache();ctx.queue=[{name:photo.name,state:'Uploaded',file:local}];assert.equal(await ctx.getPhoto(photo,1),local);assert.equal(calls,1);
});
