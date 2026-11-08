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
      const [config]=await tx`select c.*,v.decrypted_secret as refresh from private.outlook_calendar_connection c
        join vault.decrypted_secrets v on c.refresh_secret=v.id`;
      if (!config) return false;
      const token=await microsoftToken(config.tenant,config.client_id,config.refresh);
      if (token.refresh_token && token.refresh_token!==config.refresh)
        await tx`select vault.update_secret(${config.refresh_secret}::uuid,${token.refresh_token})`;

      if (!job.appointment) {
        await removeLinkedVisit(config.calendar_id,job.event_id,job.create_key,token.access_token);
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
      const events=calendarBase+encodeURIComponent(config.calendar_id)+"/events";
      const updating=Boolean(job.event_id);
      const response=await fetch(updating?events+"/"+encodeURIComponent(job.event_id):events,{
        method:updating?"PATCH":"POST",signal:timeout(),
        headers:{Authorization:"Bearer "+token.access_token,"Content-Type":"application/json",Prefer:'IdType="ImmutableId"'},
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

Deno.serve(async request=>{
  const dispatchKey=Deno.env.get("OUTLOOK_DISPATCH");
  if (!dispatchKey || request.method!=="POST" || request.headers.get("Authorization")!=="Bearer "+dispatchKey)
    return new Response(null,{status:403});
  try{
    for(let i=0;i<10;i++) if (!await dispatch()) break;
    return new Response(null,{status:204});
  }catch{
    console.error("Calendar worker could not finish its database transaction");
    return new Response(null,{status:503});
  }
});
