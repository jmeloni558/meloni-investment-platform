import "@supabase/functions-js/edge-runtime.d.ts";

type RegistrationWebhook = {
  type?: string;
  table?: string;
  schema?: string;
  record?: {
    id?: string;
    email?: string;
    created_at?: string;
    email_confirmed_at?: string | null;
    raw_app_meta_data?: { provider?: string };
  };
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);
}

function safeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function isAuthorizedWebhook(req: Request) {
  const webhookSecret = Deno.env.get("REGISTRATION_WEBHOOK_SECRET");
  if (!webhookSecret) return false;
  return safeEqual(req.headers.get("x-propertythesis-webhook-secret") || "", webhookSecret);
}

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    if (!isAuthorizedWebhook(req)) return new Response("Unauthorized", { status: 401 });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return new Response("Email service is not configured", { status: 503 });

    const payload = await req.json() as RegistrationWebhook;
    const user = payload.record;
    if (payload.type !== "INSERT" || payload.schema !== "auth" || payload.table !== "users" || !user?.id || !user.email) {
      return new Response("Invalid registration event", { status: 400 });
    }

    const recipient = Deno.env.get("REGISTRATION_NOTIFICATION_EMAIL") || "jamie@propertythesis.com";
    const sender = Deno.env.get("REGISTRATION_NOTIFICATION_FROM") || "PropertyThesis Notifications <notifications@propertythesis.com>";
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "long", timeStyle: "short" }) : "Unknown";
    const provider = user.raw_app_meta_data?.provider || "email";
    const verification = user.email_confirmed_at ? "Confirmed" : "Pending";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `propertythesis-registration-${user.id}`,
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: "New PropertyThesis registration",
        html: `<div style="font-family:Arial,sans-serif;color:#102d46;line-height:1.55"><h2 style="margin:0 0 16px">New PropertyThesis registration</h2><p>A new user has created a PropertyThesis account.</p><table style="border-collapse:collapse"><tr><td style="padding:6px 18px 6px 0;font-weight:bold">Email</td><td>${escapeHtml(user.email)}</td></tr><tr><td style="padding:6px 18px 6px 0;font-weight:bold">Registered</td><td>${escapeHtml(createdAt)} ET</td></tr><tr><td style="padding:6px 18px 6px 0;font-weight:bold">Provider</td><td>${escapeHtml(provider)}</td></tr><tr><td style="padding:6px 18px 6px 0;font-weight:bold">Email verification</td><td>${escapeHtml(verification)}</td></tr><tr><td style="padding:6px 18px 6px 0;font-weight:bold">User ID</td><td>${escapeHtml(user.id)}</td></tr></table><p style="margin-top:20px;color:#627384;font-size:12px">This is an automated administrative notification from PropertyThesis.</p></div>`,
        text: `New PropertyThesis registration\n\nEmail: ${user.email}\nRegistered: ${createdAt} ET\nProvider: ${provider}\nEmail verification: ${verification}\nUser ID: ${user.id}`,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Registration notification failed", { status: response.status, resendError: result?.name || result?.message || "Unknown Resend error" });
      return Response.json({ error: "Notification delivery failed" }, { status: 502 });
    }

    return Response.json({ delivered: true, email_id: result.id });
  },
};
