// Only the registered OneDrive worker can claim an order or supply its file.
export function engagementHandler(sql: any, accessToken: () => Promise<string>, company: string) {
  return async (req: Request) => {
    const key = req.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!key || !(await sql`select 1 from private.order_folder_worker
      where key_hash=sha256(convert_to(${key},'UTF8'))`).length) return new Response(null,{status:403});
    const action=new URL(req.url).searchParams.get("loe");
    if (action === "claim") {
      const [job]=await sql`with due as (
        select j.order_id from private.invoice_loe_jobs j
        where j.next_check<=now() and coalesce(j.lease_until,'-infinity')<=now()
        order by j.next_check limit 1 for update skip locked
      ), claimed as (update private.invoice_loe_jobs j set lease=gen_random_uuid(),lease_until=now()+interval '3 minutes'
        from due where due.order_id=j.order_id returning j.*)
      select j.lease,f.address,b.folder_url as folder,r.created_at,
        exists(select 1 from private.order_folder_jobs previous where previous.folder_url=b.folder_url and previous.order_id<>j.order_id) as reused
      from claimed j join public.field_orders f on f.id=j.order_id
      join private.qbo_invoice_requests r on r.order_id=j.order_id
      left join private.order_folder_jobs b on b.order_id=j.order_id`;
      return Response.json(job ?? null);
    }
    const lease=req.headers.get("X-LOE-Lease");
    if (!lease || !/^[a-f0-9-]{36}$/i.test(lease)) return new Response(null,{status:400});
    const [job]=await sql`select j.* from private.invoice_loe_jobs j join private.qbo_invoice_requests r
      on r.order_id=j.order_id and r.invoice_id=j.invoice_id where lease=${lease}::uuid and lease_until>now()`;
    if (!job) return new Response(null,{status:409});
    if (action==="missing" || action==="ambiguous") {
      await sql.begin(async (tx:any)=>{
        const [result]=await tx`update private.invoice_loe_jobs set misses=misses+1,
          next_check=case when misses=0 then now()+interval '5 minutes' end,lease=null,lease_until=null,last_error=${action}
          where lease=${lease}::uuid returning order_id,misses`;
        if(result?.misses>=2) await tx`update public.field_orders set missing_loe=true where id=${result.order_id}`;
      });
      return Response.json({ok:true});
    }
    if (action!=="upload") return new Response(null,{status:400});
    const filename=decodeURIComponent(req.headers.get("X-LOE-Name")||"");
    const type=req.headers.get("Content-Type")||"";
    if (!filename || /[\\/\x00-\x1f]/.test(filename) || filename.length>255) return new Response(null,{status:400});
    const blob=await req.blob();
    if (!blob.size || blob.size>20*1024*1024) return new Response(null,{status:413});
    const marker="PropertyThesis LOE "+job.order_id;
    const token=await accessToken();
    const auth={Authorization:"Bearer "+token,Accept:"application/json"};
    const linked=(a:any)=>a?.Note===marker && a.AttachableRef?.some((r:any)=>r.EntityRef?.type==="Invoice" && String(r.EntityRef.value)===job.invoice_id);
    if (!/^\d+$/.test(job.invoice_id)) throw Error("invalid_invoice");
    const query="select * from Attachable where AttachableRef.EntityRef.Type = 'Invoice' and AttachableRef.EntityRef.value = '"+job.invoice_id+"'";
    let attachment;
    for(let start=1;!attachment;start+=100){
      const response=await fetch(company+"/query?query="+encodeURIComponent(query+" STARTPOSITION "+start+" MAXRESULTS 100"),{headers:auth,signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error("attachment_lookup_failed");
      const result=await response.json();
      if(result.Fault || !result.QueryResponse)throw Error("attachment_lookup_failed");
      const page=result.QueryResponse.Attachable??[];
      attachment=page.find(linked);
      if(page.length<100)break;
    }
    if(!attachment){
      const form=new FormData();
      form.append("file_metadata_01",new Blob([JSON.stringify({FileName:filename,ContentType:type,Note:marker,
        AttachableRef:[{EntityRef:{type:"Invoice",value:job.invoice_id},IncludeOnSend:false}]})],{type:"application/json"}),"metadata.json");
      form.append("file_content_01",blob,filename);
      const response=await fetch(company+"/upload?requestid=loe-"+job.order_id,{method:"POST",headers:auth,body:form,signal:AbortSignal.timeout(45000)});
      if(!response.ok) throw Error("attachment_upload_failed");
      attachment=(await response.json()).AttachableResponse?.[0]?.Attachable;
      if (!linked(attachment) || !attachment.Id) throw Error("attachment_unconfirmed");
    }
    await sql`update private.invoice_loe_jobs set attachment_id=${attachment.Id},next_check=null,lease=null,lease_until=null,last_error=null where lease=${lease}::uuid`;
    return Response.json({ok:true});
  };
}
