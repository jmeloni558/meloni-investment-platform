export async function verifyWebhook(req,raw,secret) {
  const id=req.headers.get('svix-id'),timestamp=req.headers.get('svix-timestamp'),signatures=req.headers.get('svix-signature');
  if(!id||!timestamp||!signatures||!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
  try {
    const bytes=Uint8Array.from(atob(secret.replace(/^whsec_/,'')),c=>c.charCodeAt(0));
    const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const payload=new TextEncoder().encode(`${id}.${timestamp}.${raw}`);
    for(const sig of signatures.split(' ')) {
      if(!sig.startsWith('v1,'))continue;
      const decoded=Uint8Array.from(atob(sig.slice(3)),c=>c.charCodeAt(0));
      if(await crypto.subtle.verify('HMAC',key,decoded,payload))return true;
    }
  }catch{/* Invalid encoding is not a verified webhook. */}
  return false;
}

