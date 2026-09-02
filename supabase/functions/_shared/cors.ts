export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://propertythesis.com',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function rejectDisallowedOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return origin && origin !== 'https://propertythesis.com'
    ? json({ error: 'Origin not allowed' }, 403)
    : null;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
