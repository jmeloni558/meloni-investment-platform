import {readIndependentFacts} from './independent.mjs';
import {sourceContent} from './sources.mjs';
import {instructions,prepare,responseSchema,validateOutput} from './contract.mjs';

export function createHandler({schema,env,fetchImpl=fetch}){
 return async(req,ctx)=>{
  const origin=req.headers.get('origin'),allowed=['https://propertythesis.com','https://staging.propertythesis.com'];
  const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!allowed.includes(origin))return json({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const userId=ctx.userClaims?.id;if(!userId)return json({error:'Sign in to generate an AI BPO.'},401);
  const db=ctx.supabase,admin=ctx.supabaseAdmin;
  const {data:live,error:authError}=await admin.auth.admin.getUserById(userId);
  if(authError||!live?.user?.email_confirmed_at)return json({error:'A verified active account is required.'},401);
  const {data:access,error:accessError}=await db.rpc('bpo_enabled');
  if(accessError||access!==true)return json({error:'BPO access is unavailable.'},403);
  const raw=await req.text();if(raw.length>2000)return json({error:'Request too large'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body)||!/^[0-9a-f-]{36}$/i.test(body.reportId||'')||!Number.isSafeInteger(body.revision)||body.revision<1)return json({error:'Select and save the BPO before generating.'},400);
  const read=()=>db.from('bpo_reports').select('id,revision,field_values').eq('id',body.reportId).eq('user_id',userId).maybeSingle();
  const {data:report,error}=await read();if(error||!report)return json({error:'BPO not found.'},404);
  if(report.revision!==body.revision)return json({error:'This BPO changed. Reopen it before generating an AI BPO.'},409);
  if(report.field_values?._clientTemplate==='rrr'||!report.field_values?._aiReview?.at)return json({error:'Analyze the source documents first.'},400);
  const key=env('OPENAI_API_KEY');if(!key)return json({error:'AI BPO writing is not configured. Your notes and existing AI BPO remain saved.'},503);
  const {data:rate,error:rateError}=await admin.rpc('consume_edge_rate_limit',{p_user_id:userId,p_function_name:'bpo-generate',p_limit:2,p_window_seconds:60});
  if(rateError||!rate?.allowed)return json({error:'Please wait a minute before generating again.'},rateError?503:429);
  const {data:quota,error:quotaError}=await admin.rpc('consume_external_api_quota',{p_provider:'openai',p_endpoint:'bpo-generate',p_user_id:userId,p_guest_key_hash:null,p_daily_limit:50,p_monthly_limit:3000});
  if(quotaError||!quota?.allowed)return json({error:'AI BPO usage limit reached or unavailable. Your notes and existing AI BPO remain saved.'},quotaError?503:429);
  const work=async()=>{try{
   const documents=await sourceContent(db,report.field_values||{},userId,body.reportId);
   const fresh=await readIndependentFacts({values:report.field_values||{},schema,documents,key,model:env('BPO_GENERATE_MODEL')||'gpt-5-mini',fetchImpl});
   const input=prepare(fresh,schema);
   const {sourceValues,...modelInput}=input;
   let result,feedback='';const deadline=Date.now()+(body.stream===true?240000:130000);
   for(let attempt=0;attempt<2;attempt++){
    const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(Math.max(1000,Math.min(115000,deadline-Date.now()))),body:JSON.stringify({model:env('BPO_GENERATE_MODEL')||'gpt-5-mini',store:false,instructions:instructions+(feedback?'\nRevise the writing to satisfy this validation requirement: '+feedback:''),input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(modelInput)},...documents]}],reasoning:{effort:'low'},max_output_tokens:12000,text:{format:{type:'json_schema',name:'ai_bpo',strict:true,schema:responseSchema(input)}}})});
    const payload=await response.json();if(!response.ok||payload.status!=='completed')throw Error('AI BPO provider status '+response.status+' / '+(payload.error?.code||payload.incomplete_details?.reason||payload.status||'unknown'));
    const output=payload.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('')||'';
    try{result=validateOutput(JSON.parse(output),input);break;}catch(e){feedback=e instanceof SyntaxError?'Return valid structured JSON.':e.message;if(attempt===1)throw e;}
   }
   const latest=await read();if(latest.error||latest.data?.revision!==report.revision)return json({error:'This BPO changed while the AI BPO was being written. Reopen it and generate again.'},409);
   // Return a draft only. The existing report is never overwritten by the server.
   return json({...result,revision:report.revision});
  }catch(e){console.error('bpo-generate failed:',e?.name,e?.message);return json({error:'The AI BPO could not be completed. Your notes and previous narrative are safe. Please retry.'},502);}};
  if(body.stream!==true)return work();
  // Valid JSON whitespace keeps the authenticated request active while source
  // reading and validation retries run. No partial report is ever returned.
  const encoder=new TextEncoder();let timer,closed=false;
  const stream=new ReadableStream({start(controller){
   controller.enqueue(encoder.encode(' '.repeat(1024)));
   timer=setInterval(()=>{if(!closed)controller.enqueue(encoder.encode(' '.repeat(1024)));},10000);
   work().then(async response=>{const text=await response.text();if(!closed){controller.enqueue(encoder.encode(text));controller.close();closed=true;}}).catch(()=>{if(!closed){controller.enqueue(encoder.encode(JSON.stringify({error:'AI BPO generation failed. Your saved report is unchanged.'})));controller.close();closed=true;}}).finally(()=>clearInterval(timer));
  },cancel(){closed=true;clearInterval(timer);}});
  return new Response(stream,{headers:{...headers,'Cache-Control':'no-store'}});
 };
}
