// Only sign objects selected by the authenticated worker queue.
const api=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
Deno.serve(async req=>{
  if(req.method!=='POST')return new Response(null,{status:405});
  const {worker_key}=await req.json();
  const claim=await fetch(api+'/rest/v1/rpc/claim_completed_photo_export',{method:'POST',headers:{
    apikey:anon,Authorization:'Bearer '+anon,'Content-Type':'application/json'},body:JSON.stringify({worker_key})});
  if(!claim.ok)return new Response(null,{status:403});
  const job=await claim.json();
  if(!job)return Response.json(null);
  for(let i=0;i<job.photos.length;i+=100){
    const batch=job.photos.slice(i,i+100);
    const signed=await fetch(api+'/storage/v1/object/sign/property-photos',{method:'POST',headers:{
      apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},
      body:JSON.stringify({paths:batch.map((p:{path:string})=>p.path),expiresIn:86400})});
    if(!signed.ok)return new Response(null,{status:502});
    const urls=new Map((await signed.json()).map((p:{path:string,signedURL:string})=>[p.path,p.signedURL]));
    for(const photo of batch){
      const path=urls.get(photo.path);
      if(typeof path!=='string'||!path.startsWith('/object/sign/'))return new Response(null,{status:502});
      photo.url=api+'/storage/v1'+path;
    }
  }
  return Response.json(job,{headers:{'Cache-Control':'no-store'}});
});
