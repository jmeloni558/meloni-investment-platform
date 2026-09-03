import Stripe from 'npm:stripe@22.0.0';
import { withSupabase } from 'npm:@supabase/server@1.4.1';
import { corsHeaders, json, rejectDisallowedOrigin } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const siteUrl = 'https://propertythesis.com';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const rejectedOrigin = rejectDisallowedOrigin(req);
    if (rejectedOrigin) return rejectedOrigin;
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const userId = ctx.userClaims!.id;
    const { data: customerRow, error: customerError } = await ctx.supabaseAdmin
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (customerError) return json({ error: 'Unable to load billing profile' }, 500);
    if (!customerRow?.stripe_customer_id) return json({ error: 'No billing account was found' }, 404);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerRow.stripe_customer_id,
      return_url: `${siteUrl}/pricing.html`,
    });

    return json({ url: session.url });
  }),
};
