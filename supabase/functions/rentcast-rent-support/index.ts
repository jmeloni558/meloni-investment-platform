import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://propertythesis.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200, extraHeaders: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

function jwtSub(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const data = JSON.parse(atob(padded));
    return typeof data?.sub === "string" && data.sub ? data.sub : null;
  } catch { return null; }
}

async function consumeLimit(userId: string, fn: string, limit: number, windowSeconds: number) {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Rate limiter is not configured");
  const r = await fetch(`${url}/rest/v1/rpc/consume_edge_rate_limit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_function_name: fn,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
  });
  if (!r.ok) throw new Error(`Rate limiter failed (${r.status})`);
  return await r.json();
}

async function enforceLimits(req: Request) {
  const userId = jwtSub(req);
  if (!userId) return { response: json({ error: "Authenticated user identity is required" }, 401) };
  const burst = await consumeLimit(userId, "rentcast-rent-support", 10, 60);
  if (!burst?.allowed) {
    const retry = Math.max(1, Math.ceil((new Date(burst.reset_at).getTime() - Date.now()) / 1000));
    return { response: json({ error: "Rate limit exceeded", scope: "minute", retryAfter: retry }, 429, { "Retry-After": String(retry) }) };
  }
  const daily = await consumeLimit(userId, "rentcast-rent-support", 100, 86400);
  if (!daily?.allowed) {
    const retry = Math.max(1, Math.ceil((new Date(daily.reset_at).getTime() - Date.now()) / 1000));
    return { response: json({ error: "Daily RentCast limit exceeded", scope: "day", retryAfter: retry }, 429, { "Retry-After": String(retry) }) };
  }
  return { userId };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && origin !== "https://propertythesis.com") return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const limited = await enforceLimits(req);
    if (limited.response) return limited.response;
  } catch (e) {
    return json({ error: "Request protection unavailable" }, 503);
  }

  const apiKey = Deno.env.get("RENTCAST_API_KEY");
  if (!apiKey) return json({ error: "Listing data service is not configured" }, 503);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const address = String(body?.address || "").trim();
  if (!address) return json({ error: "Property address is required" }, 400);

  const params = new URLSearchParams();
  params.set("address", address);
  params.set("lookupSubjectAttributes", "true");
  params.set("compCount", String(Math.min(15, Math.max(5, Number(body?.compCount) || 10))));
  params.set("daysOld", String(Math.min(365, Math.max(30, Number(body?.daysOld) || 180))));
  params.set("maxRadius", String(Math.min(10, Math.max(0.5, Number(body?.maxRadius) || 3))));

  const allowedTypes = new Set(["Single Family", "Condo", "Townhouse", "Manufactured", "Multi-Family", "Apartment"]);
  const propertyType = String(body?.propertyType || "").trim();
  if (allowedTypes.has(propertyType)) params.set("propertyType", propertyType);

  for (const [key, value] of [["bedrooms", body?.bedrooms], ["bathrooms", body?.bathrooms], ["squareFootage", body?.squareFootage]] as const) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) params.set(key, String(n));
  }

  try {
    const r = await fetch(`https://api.rentcast.io/v1/avm/rent/long-term?${params.toString()}`, {
      headers: { "Accept": "application/json", "X-Api-Key": apiKey },
    });
    const text = await r.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!r.ok) return json({ error: "RentCast request failed", status: r.status }, r.status);

    return json({
      rent: data?.rent ?? null,
      rentRangeLow: data?.rentRangeLow ?? null,
      rentRangeHigh: data?.rentRangeHigh ?? null,
      subjectProperty: data?.subjectProperty ?? null,
      comparables: Array.isArray(data?.comparables) ? data.comparables : [],
      source: "RentCast",
    });
  } catch (e) {
    return json({ error: "Unable to reach RentCast" }, 502);
  }
});
