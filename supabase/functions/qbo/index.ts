import postgres from "npm:postgres@3.4.7";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false, idle_timeout: 4 });
const site = "https://propertythesis.com";
const realm = "9130356152818756";
const backend = Deno.env.get("SUPABASE_URL")!;
const callback = backend + "/functions/v1/qbo";
const tokenEndpoint = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const company = "https://quickbooks.api.intuit.com/v3/company/" + realm;
const headers = { "Access-Control-Allow-Origin": site, "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info", "Cache-Control": "no-store" };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
const redirect = (result: string) => Response.redirect(site + "/quickbooks.html?result=" + result, 303);
function basic() {
  const id = Deno.env.get("QBO_CLIENT_ID"), secret = Deno.env.get("QBO_CLIENT_SECRET");
  if (!id || !secret) throw new Error("credentials_pending");
  return "Basic " + btoa(id + ":" + secret);
}
async function tokens(values: Record<string, string>) {
  const reply = await fetch(tokenEndpoint, { method: "POST", headers: { Authorization: basic(), Accept: "application/json" },
    body: new URLSearchParams(values), signal: AbortSignal.timeout(10000) });
  if (!reply.ok) throw new Error("authorization_" + reply.status);
  const result = await reply.json();
  if (!result.refresh_token || !result.access_token) throw new Error("invalid_token_response");
  return result;
}
async function api(token: string, route: string, body?: unknown) {
  const res = await fetch(company + route, { method: body ? "POST" : "GET", headers: {
    Authorization: "Bearer " + token, Accept: "application/json", "Content-Type": "application/json"
  }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("quickbooks_" + res.status);
  return await res.json();
}
async function lookup(token: string, entity: "Customer" | "Item", name: string) {
  const field = entity === "Customer" ? "DisplayName" : "Name";
  const escaped = name.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
  const query = "select * from " + entity + " where " + field + " = '" + escaped + "' and Active = true";
  const rows = (await api(token, "/query?query=" + encodeURIComponent(query))).QueryResponse?.[entity] ?? [];
  if (rows.length !== 1 || rows[0][field] !== name) throw new Error("check_" + entity);
  return rows[0].Id;
}
async function worker() {
  // Commit a frozen body before any invoice POST so retries use the same request ID and data.
  const prepared = await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(93418751)`;
    const [job] = await tx`select r.order_id,r.payload,l.customer_name,l.confirmed,l.product,l.amount,
      l.description,l.service_date::text as service_date,c.refresh_secret,v.decrypted_secret as refresh
      from private.qbo_invoice_requests r join private.qbo_connection c on r.created_at>=c.activated_at
      join vault.decrypted_secrets v on v.id=c.refresh_secret left join private.qbo_invoice_lines l using(order_id)
      where r.invoice_id is null and r.next_attempt<=now() order by r.next_attempt limit 1 for update of r`;
    if (!job) return;
    try {
      if (!job.payload && (!job.confirmed || !job.description || !job.service_date || !(Number(job.amount)>0))) throw new Error("review_order_mapping");
      const token = await tokens({grant_type:"refresh_token", refresh_token:job.refresh});
      await tx`select vault.update_secret(${job.refresh_secret}::uuid,${token.refresh_token})`;
      let payload = job.payload;
      if (!payload) {
        const customer = await lookup(token.access_token, "Customer", job.customer_name);
        const item = await lookup(token.access_token, "Item", job.product);
        payload = { CustomerRef:{value:customer}, EmailStatus:"NotSet", Line:[{DetailType:"SalesItemLineDetail",
          Description:job.description, Amount:Number(job.amount), SalesItemLineDetail:{ItemRef:{value:item},
          Qty:1, UnitPrice:Number(job.amount), ServiceDate:job.service_date}}] };
      }
      await tx`update private.qbo_invoice_requests set payload=${tx.json(payload)},next_attempt=now()+interval '10 minutes' where order_id=${job.order_id}`;
      return { token:token.access_token, id:job.order_id, payload };
    } catch (err) {
      await tx`update private.qbo_invoice_requests set error_code=${code(err)},next_attempt=now()+interval '30 minutes' where order_id=${job.order_id}`;
    }
  });
  if (!prepared) return;
  try {
    const reply = await api(prepared.token, "/invoice?requestid=" + prepared.id, prepared.payload);
    if (!reply.Invoice?.Id) throw new Error("invoice_unconfirmed");
    await sql`update private.qbo_invoice_requests set invoice_id=${reply.Invoice.Id},error_code=null where order_id=${prepared.id}`;
  } catch (err) {
    await sql`update private.qbo_invoice_requests set error_code=${code(err)} where order_id=${prepared.id}`;
  }
}
function code(err: unknown) {
  return err instanceof Error && /^(credentials_pending|authorization_\d+|quickbooks_\d+|review_order_mapping|check_(Item|Customer)|invoice_unconfirmed)$/.test(err.message) ? err.message : "connection_error";
}
Deno.serve(async req => {
  const url = new URL(req.url);
  try {
    if (req.method === "OPTIONS") return new Response(null,{headers});
    if (req.method === "GET") {
      const state = url.searchParams.get("state");
      if (!state || !/^[0-9a-f-]{36}$/i.test(state)) return redirect("invalid");
      const consumed = await sql`delete from private.qbo_states where state=${state}::uuid and expires_at>now() returning state`;
      if (!consumed.length || url.searchParams.get("realmId") !== realm || !url.searchParams.get("code")) return redirect("invalid");
      const token = await tokens({grant_type:"authorization_code", code:url.searchParams.get("code")!, redirect_uri:callback});
      await sql.begin(async tx => {
        await tx`select pg_advisory_xact_lock(93418751)`;
        const [c] = await tx`select refresh_secret from private.qbo_connection`;
        if (c) await tx`select vault.update_secret(${c.refresh_secret}::uuid,${token.refresh_token})`;
        else await tx`insert into private.qbo_connection(refresh_secret) select vault.create_secret(${token.refresh_token})`;
      });
      return redirect("connected");
    }
    if (req.method !== "POST") return json({},405);
    const auth = req.headers.get("Authorization");
    if (!auth) return json({},401);
    if (url.searchParams.has("worker")) {
      const [key] = await sql`select decrypted_secret from vault.decrypted_secrets where name='pt_qbo_dispatch'`;
      if (!key || auth !== "Bearer "+key.decrypted_secret) return json({},403);
      await worker(); return json({ok:true});
    }
    const user = await fetch(backend + "/auth/v1/user",{headers:{Authorization:auth,apikey:Deno.env.get("SUPABASE_ANON_KEY")!}});
    if (!user.ok || (await user.json()).email?.toLowerCase() !== "jamie@melonirealty.com") return json({},403);
    const {action} = await req.json();
    if (action === "status") {
      const [state] = await sql`select exists(select from private.qbo_connection) as connected`;
      return json({...state,ready:Boolean(Deno.env.get("QBO_CLIENT_ID") && Deno.env.get("QBO_CLIENT_SECRET"))});
    }
    if (action === "connect") {
      basic();
      const state = crypto.randomUUID();
      await sql`delete from private.qbo_states where expires_at<=now()`;
      await sql`insert into private.qbo_states values (${state},now()+interval '10 minutes')`;
      return json({url:"https://appcenter.intuit.com/connect/oauth2?" + new URLSearchParams({client_id:Deno.env.get("QBO_CLIENT_ID")!,
        redirect_uri:callback, scope:"com.intuit.quickbooks.accounting",response_type:"code",state})});
    }
    if (action === "disconnect") {
      await sql.begin(async tx => {
        await tx`select pg_advisory_xact_lock(93418751)`;
        const [c] = await tx`select c.refresh_secret,v.decrypted_secret from private.qbo_connection c join vault.decrypted_secrets v on v.id=c.refresh_secret`;
        if (!c) return;
        const res = await fetch("https://developer.api.intuit.com/v2/oauth2/tokens/revoke",{method:"POST",headers:{
          Authorization:basic(),"Content-Type":"application/json"},body:JSON.stringify({token:c.decrypted_secret}),signal:AbortSignal.timeout(10000)});
        if (!res.ok) throw new Error("disconnect_failed");
        await tx`delete from private.qbo_states`;
        await tx`delete from private.qbo_connection`;
        await tx`delete from vault.secrets where id=${c.refresh_secret}`;
      });
      return json({connected:false});
    }
    return json({},400);
  } catch (err) { return req.method === "GET" ? redirect("failed") : json({error:code(err)},503); }
});
