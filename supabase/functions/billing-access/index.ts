import { withSupabase } from 'npm:@supabase/server@1.4.1';
import { corsHeaders, json, rejectDisallowedOrigin } from '../_shared/cors.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const rejectedOrigin = rejectDisallowedOrigin(req);
    if (rejectedOrigin) return rejectedOrigin;
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const body = await req.json().catch(() => ({}));
    if (!body.propertyId) return json({ error: 'A property is required' }, 400);
    const { data, error } = await ctx.supabase.rpc('claim_property_access', { p_property_id: body.propertyId });
    if (error) {
      console.error('[billing-access] access claim failed', { code: error.code });
      return json({ error: 'Unable to check property access' }, 400);
    }
    return json(data);
  }),
};
