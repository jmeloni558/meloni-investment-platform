import postgres from "npm:postgres@3.4.7";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  prepare: false, max: 1, idle_timeout: 4, connect_timeout: 8
});
const calendarBase = "https://graph.microsoft.com/v1.0/me/calendars/";
const timeout = () => AbortSignal.timeout(12000);

class RemoteError extends Error {
  constructor(readonly code: string, readonly retrySeconds = 0) { super(code); }
}

async function microsoftToken(tenant: string, client: string, refresh: string) {
  const response = await fetch("https://login.microsoftonline.com/" + encodeURIComponent(tenant) + "/oauth2/v2.0/token", {
    method: "POST", signal: timeout(),
    body: new URLSearchParams({client_id: client, grant_type:"refresh_token", refresh_token:refresh,
      scope:"https://graph.microsoft.com/Calendars.ReadWrite offline_access"})
  });
  const token = await response.json();
  if (!response.ok || !token.access_token) throw new RemoteError("authorization_" + response.status);
  return token;
}

function checkGraph(response: Response) {
  if (!response.ok) throw new RemoteError("calendar_"+response.status,Number(response.headers.get("Retry-After"))||0);
}

async function removeLinkedVisit(calendarId: string, eventId: string | null, createKey: string, accessToken: string) {
  const calendar=calendarBase+encodeURIComponent(calendarId);
  const headers={Authorization:"Bearer "+accessToken,Prefer:'IdType="ImmutableId"'};
  const info=await fetch(calendar+"?$select=isDefaultCalendar",{headers,signal:timeout()});
  checkGraph(info);
  if ((await info.json()).isDefaultCalendar!==false) throw new RemoteError("default_calendar_protected");

  // Look only inside the configured calendar. This also recovers a successful POST
  // whose response was lost, and leaves an event moved to another calendar alone.
  let next=calendar+"/events?$select=id,transactionId&$top=250";
  while (next) {
    if (new URL(next).origin!=="https://graph.microsoft.com") throw new RemoteError("invalid_graph_page");
    const page=await fetch(next,{headers,signal:timeout()});
    checkGraph(page);
    const result=await page.json();
    const match=result.value.find((item:{id:string;transactionId?:string})=>
      item.transactionId===createKey && (!eventId || item.id===eventId));
    if (match) {
      const response=await fetch(calendar+"/events/"+encodeURIComponent(match.id),{method:"DELETE",headers,signal:timeout()});
      if (response.status!==404) checkGraph(response);
      return;
    }
    next=result["@odata.nextLink"];
  }
}

async function connection(tx: postgres.TransactionSql) {
      const [config]=await tx`select c.*,v.decrypted_secret as refresh from private.outlook_calendar_connection c
        join vault.decrypted_secrets v on c.refresh_secret=v.id`;
      if (!config) return null;
      const token=await microsoftToken(config.tenant,config.client_id,config.refresh);
      if (token.refresh_token && token.refresh_token!==config.refresh)
        await tx`select vault.update_secret(${config.refresh_secret}::uuid,${token.refresh_token})`;

  return { calendar:calendarBase+encodeURIComponent(config.calendar_id),accessToken:token.access_token,calendarId:config.calendar_id };
}

async function dispatch() {
  return await sql.begin(async tx => {
    // Only one writer refreshes Microsoft tokens or creates events at a time.
    const [lock]=await tx`select pg_try_advisory_xact_lock(942113807) as acquired`;
    if (!lock.acquired) return false;
    const [job]=await tx`select j.order_id,j.create_key,j.version,j.event_id,j.failures,
      f.address,f.client,f.kind,f.appointment,f.appointment_minutes
      from private.outlook_jobs j join public.field_orders f on f.id=j.order_id
      where j.done<j.version and j.retry_at<=clock_timestamp()
      order by j.retry_at,j.order_id limit 1`;
    if (!job) return false;
    try {
      const linked=await connection(tx);
      if (!linked) return false;
      if (!job.appointment) {
        await removeLinkedVisit(linked.calendarId,job.event_id,job.create_key,linked.accessToken);
        await tx`update private.outlook_jobs set done=${job.version},event_id=null,create_key=gen_random_uuid(),
          failures=0,last_error=null where order_id=${job.order_id}`;
        return true;
      }
      const start=new Date(job.appointment);
      const end=new Date(start.getTime()+job.appointment_minutes*60000);
      const time=(date:Date)=>({dateTime:date.toISOString().slice(0,-1),timeZone:"UTC"});
      const prefix=[job.kind,job.client && "("+job.client+")"].filter(Boolean).join(" ");
      const event={subject:[prefix,job.address].filter(Boolean).join(" – "),location:{displayName:job.address},
        start:time(start),end:time(end)};
      const events=linked.calendar+"/events";
      const updating=Boolean(job.event_id);
      const response=await fetch(updating?events+"/"+encodeURIComponent(job.event_id):events,{
        method:updating?"PATCH":"POST",signal:timeout(),
        headers:{Authorization:"Bearer "+linked.accessToken,"Content-Type":"application/json",Prefer:'IdType="ImmutableId"'},
        body:JSON.stringify(updating?event:{...event,transactionId:job.create_key})
      });
      if (!response.ok) throw new RemoteError("calendar_"+response.status,Number(response.headers.get("Retry-After"))||0);
      const id=updating?job.event_id:(await response.json()).id;
      if (!id) throw new RemoteError("missing_event_id");
      await tx`update private.outlook_jobs set done=${job.version},event_id=${id},failures=0,last_error=null
        where order_id=${job.order_id}`;
    } catch (error) {
      const failure=error instanceof RemoteError?error:new RemoteError("transport_error");
      const delay=Math.max(failure.retrySeconds,Math.min(3600,15*2**Math.min(job.failures,8)));
      await tx`update private.outlook_jobs set failures=failures+1,last_error=${failure.code},
        retry_at=now()+make_interval(secs=>${delay}::integer) where order_id=${job.order_id} and version=${job.version}`;
    }
    return true;
  });
}

type CalendarEvent={id:string,start:{timeZone:string,dateTime:string},end:{timeZone:string,dateTime:string}};
function utc(value:CalendarEvent["start"]) {
  if (value.timeZone!=="UTC") throw new Error("Unexpected Microsoft time zone");
  const ms=Date.parse(value.dateTime.replace(/Z$/,"")+"Z");
  if (!Number.isFinite(ms)) throw new Error("Invalid Microsoft event time");
  return ms;
}

async function receiveVisits() {
  await sql.begin(async tx=>{
    const [lock]=await tx`select pg_try_advisory_xact_lock(942113807) as acquired`;
    if (!lock.acquired) return;
    const jobs=await tx`select j.order_id,j.event_id,j.version,f.appointment,f.appointment_minutes
      from private.outlook_jobs j join public.field_orders f on f.id=j.order_id
      where j.event_id is not null and j.version=j.done`;
    if (!jobs.length) return;
    const linked=await connection(tx);
    if (!linked) return;
    const headers={Authorization:"Bearer "+linked.accessToken,Prefer:'IdType="ImmutableId", outlook.timezone="UTC"'};
    const info=await fetch(linked.calendar+"?$select=isDefaultCalendar",{headers,signal:timeout()});
    checkGraph(info);
    if ((await info.json()).isDefaultCalendar!==false) throw new Error("Unexpected default calendar");
    const events=new Map<string,CalendarEvent>();
    const fields="id,start,end";
    let next=linked.calendar+"/events?$select="+fields+"&$top=250";
    while (next) {
      if (new URL(next).origin!=="https://graph.microsoft.com") throw new Error("Invalid calendar page");
      const response=await fetch(next,{headers,signal:timeout()});
      checkGraph(response);
      const page=await response.json();
      for(const event of page.value) events.set(event.id,event);
      next=page["@odata.nextLink"];
    }
    await tx`select set_config('pt.appointment_origin','outlook',true)`;
    for(const job of jobs){
      const event=events.get(job.event_id);
      let start:string|null=null,minutes=job.appointment_minutes;
      if(event){
        const ms=utc(event.start);
        minutes=Math.max(1,Math.round((utc(event.end)-ms)/60000));
        if(job.appointment && +new Date(job.appointment)===ms && minutes===job.appointment_minutes)continue;
        start=new Date(ms).toISOString();
      }else{
        // A missing row in a paged list alone isn't proof of deletion.
        const confirm=await fetch(linked.calendar+"/events/"+encodeURIComponent(job.event_id)+"?$select=id",{headers,signal:timeout()});
        if(confirm.ok)continue;
        if(confirm.status!==404)checkGraph(confirm);
        const code=(await confirm.json()).error?.code;
        if(code!=="ErrorItemNotFound" && code!=="ResourceNotFound")continue;
      }
      // Order first, then job: same locking order as a dashboard save. A local edit
      // queued during the Microsoft request wins and will be pushed on its own.
      await tx`select id from public.field_orders where id=${job.order_id} for update`;
      const [current]=await tx`select order_id from private.outlook_jobs where order_id=${job.order_id}
        and event_id=${job.event_id} and version=${job.version} and version=done for update`;
      if(!current)continue;
      await tx`update public.field_orders set appointment=${start}::timestamptz,appointment_minutes=${minutes}
        where id=${job.order_id}`;
      if(!event)await tx`update private.outlook_jobs set event_id=null,create_key=gen_random_uuid(),failures=0,last_error=null
        where order_id=${job.order_id}`;
    }
  });
}

Deno.serve(async request=>{
  const dispatchKey=Deno.env.get("OUTLOOK_DISPATCH");
  if (!dispatchKey || request.method!=="POST" || request.headers.get("Authorization")!=="Bearer "+dispatchKey)
    return new Response(null,{status:403});
  try{
    if(new URL(request.url).searchParams.get("direction")==="inbound")await receiveVisits();
    else for(let i=0;i<10;i++) if (!await dispatch()) break;
    return new Response(null,{status:204});
  }catch{
    console.error("Calendar worker could not finish its database transaction");
    return new Response(null,{status:503});
  }
});
