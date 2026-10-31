import test from 'node:test';
import assert from 'node:assert/strict';
import {safeName,MAX_BYTES,validateFile,objectName,uploadPhoto,listPhotos,downloadName} from '../photo-library.mjs';
test('Windows paths and reserved device names are safe',()=>{
  assert.equal(safeName('../123 Main: Street / Tampa.'),'.._123 Main_ Street _ Tampa');
  assert.equal(safeName('CON'),'Property_CON');assert.equal(safeName('NUL.jpg'),'Property_NUL.jpg');
  assert.ok(!safeName('a'.repeat(140)+'.').endsWith('.'));
});
test('reject non-photos, empty files and oversize photos',()=>{
  for(const file of [{name:'x.svg',size:2,type:'image/svg+xml'},{name:'x.jpg',size:0},{name:'x.jpg',size:MAX_BYTES+1},{name:'x.jpg',size:5,type:'text/html'}])assert.throws(()=>validateFile(file));
  assert.equal(validateFile({name:'IMG.HEIC',size:50,type:''}),'image/heic');
});
test('retries recover a committed upload after a lost response without overwriting',async()=>{
  const file=new File(['photo bytes'],'same.jpg',{type:'image/jpeg'}),name=await objectName(file);let options;
  const bucket={upload:async(_path,_file,opt)=>{options=opt;return {error:{message:'connection lost'}};},list:async()=>({data:[{name,id:'saved'}]})};
  assert.equal(await uploadPhoto(bucket,'user/property',file),name);assert.equal(options.upsert,false);
  bucket.list=async()=>({data:[]});await assert.rejects(uploadPhoto(bucket,'user/property',file));
});
test('same-name photos with different contents keep separate object and download names',async()=>{
  const a=await objectName(new File(['a'],'IMG.jpg')),b=await objectName(new File(['b'],'IMG.jpg'));
  assert.notEqual(a,b);assert.notEqual(downloadName(a),downloadName(b));
});
test('long filenames retain their extension through storage and download',async()=>{
 const name=await objectName(new File(['a'],'x'.repeat(200)+'.JPEG'));
 assert.ok(name.endsWith('.jpeg'));assert.ok(downloadName(name).endsWith('.jpeg'));
});
test('list pagination includes photos beyond first 100 and propagates failures',async()=>{
  const calls=[];const bucket={list:async(_prefix,{offset})=>{calls.push(offset);return {data:Array.from({length:offset===0?100:3},(_,i)=>({id:i+1,name:String(i)}))};}};
  assert.equal((await listPhotos(bucket,'u/p')).length,103);assert.deepEqual(calls,[0,100]);
  await assert.rejects(listPhotos({list:async()=>({error:Error('offline')})},'u/p'),/offline/);
});
