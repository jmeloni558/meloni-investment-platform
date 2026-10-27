import { withSupabase } from 'npm:@supabase/server@1.4.1';
import schema from './fields.json' with { type: 'json' };
import { cleanExtraction, forbidden, instructions, responseSchema } from './contract.mjs';

export default { fetch: withSupabase({auth:'user'}, async(req,ctx)=>{
  const origin=req.headers.get('origin');
  const headers={'Access-Control-Allow-Origin':origin==='https://staging.propertythesis.com'?origin:'https://propertythesis.com','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
  const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!['https://propertythesis.com','https://staging.propertythesis.com'].includes(origin))return json({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const db=ctx.supabase,admin=ctx.supabaseAdmin,userId=ctx.userClaims!.id;
  const {data:live,error:authError}=await admin.auth.admin.getUserById(userId);
  if(authError||!live.user?.email_confirmed_at)return json({error:'A verified active account is required.'},401);
  const {data:access,error:accessError}=await db.rpc('bpo_enabled');
  if(accessError||access!==true)return json({error:'BPO access is unavailable.'},403);
  const raw=await req.text();if(raw.length>2000)return json({error:'Request too large'},413);
  let body:any;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
  if(!/^[0-9a-f-]{36}$/i.test(body.reportId||''))return json({error:'Select a saved BPO.'},400);
  const {data:report,error}=await db.from('bpo_reports').select('*').eq('id',body.reportId).eq('user_id',userId).maybeSingle();
  if(error||!report)return json({error:'BPO not found.'},404);
  if(body.revision!==report.revision)return json({error:'This BPO changed. Reopen it before filling from files.'},409);
  const documents=report.field_values?._attachments;
  if(!Array.isArray(documents)||!documents.length||documents.length>12)return json({error:'Attach between 1 and 12 PDFs before filling the form.'},400);
  if(documents.some(d=>typeof d.path!=='string'||!d.path.startsWith(`${userId}/${report.id}/`)||d.path.includes('..')))return json({error:'Invalid document reference.'},400);
  const key=Deno.env.get('OPENAI_API_KEY');if(!key)return json({error:'AI document extraction is not configured.'},503);
  const {data:rate,error:rateError}=await admin.rpc('consume_edge_rate_limit',{p_user_id:userId,p_function_name:'bpo-extract',p_limit:2,p_window_seconds:60});
  if(rateError||!rate?.allowed)return json({error:'Please wait a minute before filling the form again.'},rateError?503:429);
  const {data:quota,error:quotaError}=await admin.rpc('consume_external_api_quota',{p_provider:'openai',p_endpoint:'bpo-extract',p_user_id:userId,p_guest_key_hash:null,p_daily_limit:50,p_monthly_limit:3000});
  if(quotaError||!quota?.allowed)return json({error:'AI document usage limit reached or unavailable. Your PDFs and form remain saved.'},quotaError?503:429);
  try{
    const content:any[]=[];let total=0;
    for(let i=0;i<documents.length;i++){
      const d=documents[i];const {data:blob,error:e}=await db.storage.from('bpo-documents').download(d.path);
      if(e||!blob)return json({error:'A source PDF is unavailable. Remove the missing attachment or upload it again.'},400);
      total+=blob.size;if(blob.size>15728640||total>25*1024*1024)return json({error:'Use PDFs totaling no more than 25 MB for one BPO.'},413);
      const bytes=new Uint8Array(await blob.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({error:'A source file is not a PDF.'},400);
      let binary='';for(let p=0;p<bytes.length;p+=16384)binary+=String.fromCharCode(...bytes.subarray(p,p+16384));
      content.push({type:'input_text',text:`Document index ${i}: ${String(d.name).slice(0,200)}`},{type:'input_file',filename:`source-${i}.pdf`,file_data:'data:application/pdf;base64,'+btoa(binary)});
    }
    const allowed=schema.filter(f=>!forbidden(f.name));
    content.unshift({type:'input_text',text:JSON.stringify({subject:report.address,fields:allowed.map(f=>({name:f.name,label:f.label,type:f.kind})),existing:Object.fromEntries(allowed.filter(f=>report.field_values[f.name]!==undefined&&report.field_values[f.name]!==''&&report.field_values[f.name]!==false).map(f=>[f.name,report.field_values[f.name]]))})});
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(140000),body:JSON.stringify({model:Deno.env.get('BPO_EXTRACT_MODEL')||'gpt-5-mini',store:false,instructions,input:[{role:'user',content}],reasoning:{effort:'low'},max_output_tokens:14000,text:{format:{type:'json_schema',name:'bpo_source_facts',strict:true,schema:responseSchema}}})});
    const payload=await response.json();
    if(!response.ok||payload.status!=='completed'){console.error('BPO extraction failed',{status:response.status,code:payload.error?.code,state:payload.status});return json({error:'AI could not finish reading the PDFs. Your files are saved; try Fill form from uploaded files again.'},502);}
    const text=payload.output?.flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('')||'';
    const result=cleanExtraction(JSON.parse(text),schema,documents);
    return json({...result,revision:report.revision});
  }catch(e){console.error('BPO extraction failed',{type:e?.name});return json({error:'AI extraction did not finish. Your files are saved; retry or edit the form manually.'},502);}
})};
