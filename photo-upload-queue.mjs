import {BUCKET,objectName,uploadPhoto} from './photo-library.mjs?v=4';

// Cover Android file-provider reads, token lookups and network requests with one deadline.
export async function bounded(task, parent, ms){
  const controller=new AbortController();
  const abort=()=>controller.abort(parent.reason);
  if(parent?.aborted)abort();
  else parent?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(new DOMException('Upload request timed out','TimeoutError')),ms);
  let rejectAbort;
  try{
    controller.signal.throwIfAborted();
    const stopped=new Promise((_,reject)=>{
      rejectAbort=()=>reject(controller.signal.reason);
      controller.signal.addEventListener('abort',rejectAbort,{once:true});
    });
    return await Promise.race([task(controller.signal),stopped]);
  }finally{
    clearTimeout(timer);
    parent?.removeEventListener('abort',abort);
    controller.signal.removeEventListener('abort',rejectAbort);
  }
}
export function uploadFailure(error){
  const message=error?.message||'';
  if(+error?.statusCode===401||/token.*expired|expired.*token|exp.*claim.*failed|invalid jwt|session expired/i.test(message))return 'auth';
  if(+error?.statusCode>=500||[408,429].includes(+error?.statusCode)||error?.name==='TimeoutError'||/fetch|network|connection|timed out|load failed/i.test(message))return 'network';
  return 'file';
}

export async function sendQueuedPhoto({file,prefix,takenDate,auth,createClient,knownNames,signal,onRetry,onProgress}){
  const owner=prefix.split('/')[0];
  async function session(force){
    let result=force?await auth.refreshSession():await auth.getSession();
    if(!force&&result.data?.session?.expires_at*1000<Date.now()+180000)result=await auth.refreshSession();
    if(result.error)throw result.error;
    if(result.data?.session?.user.id!==owner)throw Error('Session expired. Sign in again.');
    return result.data.session;
  }
  // Snapshot one original so Android only has to read the picker file once.
  const {local,name}=await bounded(async requestSignal=>{
    const bytes=await file.arrayBuffer();
    requestSignal.throwIfAborted();
    const local=new File([bytes],file.name,{type:file.type,lastModified:file.lastModified});
    return {local,name:await objectName(file,bytes)};
  },signal,90000);
  const takenOn=await bounded(()=>takenDate(local,true).catch(()=>null),signal,15000).catch(error=>{
    if(error.name==='TimeoutError')return null;
    throw error;
  });
  let force=false;
  for(let attempt=0;;attempt++){
    try{
      return await bounded(async requestSignal=>{
        const current=await session(force);
        requestSignal.throwIfAborted();
        const bucket=createClient(current.access_token,requestSignal,onProgress).storage.from(BUCKET);
        if(knownNames.has(name)){
          const {data,error}=await bucket.list(prefix,{search:name,limit:1});
          if(error)throw error;
          if(data.some(row=>row.name===name&&row.id))return name;
        }
        return uploadPhoto(bucket,prefix,local,takenOn,name);
      },signal,30*60*1000);
    }catch(error){
      signal.throwIfAborted();
      const kind=uploadFailure(error);
      if(kind==='file'||attempt>=2)throw error;
      force=kind==='auth';
      onRetry(attempt+1,kind);
      await bounded(()=>new Promise(resolve=>setTimeout(resolve,1000*(attempt+1))),signal,10000);
    }
  }
}
