import { withSupabase } from 'npm:@supabase/server@1.4.1';
import schema from './fields.json' with { type: 'json' };
import { extractText } from 'npm:unpdf@1.9.1';
import { PDFDocument, StandardFonts } from 'npm:pdf-lib@1.17.1';
import { cleanExtraction, instructions, v14Instructions, marketInstructions, extractionScopes, schemaFor, fitExtraction } from './contract.mjs';

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
      content.push({type:'input_text',text:`Document index ${i}: ${String(d.name).slice(0,200)}. User-selected upload group: ${['subject','sold','active','market'].includes(d.category)?d.category:'legacy/unclassified'}. Group is context; verify all facts against document content.`},{type:'input_file',filename:`source-${i}.pdf`,file_data:'data:application/pdf;base64,'+btoa(binary)});
      try{
        const extracted=await extractText(bytes.slice(),{mergePages:false});
        const pages=Array.isArray(extracted.text)?extracted.text:[extracted.text];
        content.push({type:'input_text',text:JSON.stringify({document:i,untrustedPageTranscripts:pages.slice(0,40).map((text,page)=>({page:page+1,text:text.slice(0,18000)}))})});
      }catch{ /* Scanned/unreadable text layers still have the original visual PDF input. */ }
    }
    const results=await Promise.all(extractionScopes(schema).map(async allowed=>{
    const context={type:'input_text',text:JSON.stringify({task:'Complete only this assigned section. Review every field against all source pages; include every supported fact. Other sections are handled separately.',subject:report.field_values?._subjectPending?null:report.address,fields:allowed.map(f=>({name:f.name,label:f.label,type:f.kind})),existing:Object.fromEntries(allowed.filter(f=>report.field_values[f.name]!==undefined&&report.field_values[f.name]!==''&&report.field_values[f.name]!==false).map(f=>[f.name,report.field_values[f.name]]))})};
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(140000),body:JSON.stringify({model:Deno.env.get('BPO_EXTRACT_MODEL')||'gpt-5-mini',store:false,instructions:instructions+'\n'+v14Instructions+'\n'+marketInstructions,input:[{role:'user',content:[context,...content]}],reasoning:{effort:'low'},max_output_tokens:14000,text:{format:{type:'json_schema',name:'bpo_source_facts',strict:true,schema:schemaFor(allowed)}}})});
    const payload=await response.json();
    if(!response.ok||payload.status!=='completed'){console.error('BPO extraction failed',{status:response.status,code:payload.error?.code,state:payload.status});throw Error('Section extraction incomplete');}
    const text=payload.output?.flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('')||'';
    return cleanExtraction(JSON.parse(text),allowed,documents);
    }));
    const fontDoc=await PDFDocument.create(),font=await fontDoc.embedFont(StandardFonts.Helvetica);
    const result=fitExtraction({fields:results.flatMap(r=>r.fields),warnings:[...new Set(results.flatMap(r=>r.warnings))]},schema,(text:string)=>font.widthOfTextAtSize(text,5.5));
    return json({...result,revision:report.revision});
  }catch(e){console.error('BPO extraction failed',{type:e?.name});return json({error:'AI extraction did not finish. Your files are saved; retry or edit the form manually.'},502);}
})};
