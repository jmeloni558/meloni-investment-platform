import test from 'node:test';
import assert from 'node:assert/strict';
import {sendQueuedPhoto,bounded} from '../photo-upload-queue.mjs';
test('rejected token is renewed and original bytes and date survive retry',async()=>{
  const file=new File(['camera original'],'a.jpg',{type:'image/jpeg'});
  const session=token=>({data:{session:{user:{id:'owner'},access_token:token,expires_at:Date.now()/1000+3600}}});
  let refreshed=0;
  const auth={getSession:async()=>session('old'),refreshSession:async()=>{refreshed++;return session('new');}};
  const tokens=[],retries=[];
  const createClient=token=>({storage:{from:()=>({
    list:async()=>({data:[]}),upload:async(path,body,opt)=>{
      tokens.push(token);
      assert.ok(path.startsWith('owner/property/'));
      assert.equal(await body.text(),'camera original');assert.equal(opt.metadata.taken_on,'2026-11-04');
      return token==='new'?{}:{error:{statusCode:400,message:'"exp" claim timestamp check failed'}};
    }
  })}});
  await sendQueuedPhoto({file,prefix:'owner/property',takenDate:async()=>'2026-11-04',auth,createClient,knownNames:new Set(),signal:new AbortController().signal,onRetry:(n,kind)=>retries.push(kind)});
  assert.deepEqual(tokens,['old','new']);assert.deepEqual(retries,['auth']);assert.equal(refreshed,1);
});
test('a stalled operation aborts the outgoing request and releases the queue',async()=>{
  let aborted=false;
  await assert.rejects(bounded(signal=>new Promise(()=>signal.addEventListener('abort',()=>{aborted=true;})),null,20),{name:'TimeoutError'});
  assert.equal(aborted,true);
});
