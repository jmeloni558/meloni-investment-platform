const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeText = (text: string) => text.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/[,;]/g, "\\$&");
function fold(line: string) {
  const encoder = new TextEncoder();
  let chunk = "", bytes = 0;
  const lines = [];
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { lines.push(chunk); chunk = " "; bytes = 1; }
    chunk += char; bytes += size;
  }
  return [...lines, chunk].join("\r\n");
}
Deno.serve(async (request) => {
  const token = new URL(request.url).searchParams.get("key");
  if (!token || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(token)) return new Response(null,{status:404});
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const result = await fetch(Deno.env.get("SUPABASE_URL") + "/rest/v1/rpc/read_order_appointments", {
    method:"POST", headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({feed_key:token})
  });
  if (!result.ok) return new Response(null,{status:result.status===400?404:503});
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PropertyThesis//Orders//EN","CALSCALE:GREGORIAN","X-WR-CALNAME:PropertyThesis appointments"];
  for (const order of await result.json()) {
    const start = new Date(order.appointment);
    lines.push("BEGIN:VEVENT","UID:"+order.id+"@propertythesis.com","DTSTAMP:"+stamp(new Date(order.updated_at)),
      "LAST-MODIFIED:"+stamp(new Date(order.updated_at)),"DTSTART:"+stamp(start),"DURATION:PT"+(order.appointment_minutes ?? 60)+"M",
      "SUMMARY:"+escapeText(order.kind+" ("+order.client+") – "+order.address),"LOCATION:"+escapeText(order.address),"END:VEVENT");
  }
  return new Response([...lines,"END:VCALENDAR",""].map(fold).join("\r\n"),{headers:{"Content-Type":"text/calendar; charset=utf-8","Cache-Control":"private, no-store"}});
});
