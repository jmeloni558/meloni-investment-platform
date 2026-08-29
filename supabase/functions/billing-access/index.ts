import { withSupabase } from 'npm:@supabase/server@^1';
import { corsHeaders, json } from '../_shared/cors.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    const body = await req.json().catch(() => ({}));
    if (!body.propertyId) return json({ error: 'A property is required' }, 400);
    const { data, error } = await ctx.supabase.rpc('claim_property_access', { p_property_id: body.propertyId });
    if (error) return json({ error: error.message }, 400);
    return json(data);
  }),
};
