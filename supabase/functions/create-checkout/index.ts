import Stripe from 'npm:stripe@22.0.0';
import { withSupabase } from 'npm:@supabase/server@1.4.1';
import { corsHeaders, json, rejectDisallowedOrigin } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const siteUrl = 'https://propertythesis.com';
const prices = {
  single: { id: 'price_1UBOlCQP9TDs8kEAXSXFZaLP', mode: 'payment', plan: 'single' },
  professional_50_monthly: { id: 'price_1UBOlCQP9TDs8kEAbJn8K3A1', mode: 'subscription', plan: 'professional_50_monthly' },
  professional_50_yearly: { id: 'price_1UBOlBQP9TDs8kEATyaA8bUY', mode: 'subscription', plan: 'professional_50_yearly' },
  unlimited_monthly: { id: 'price_1UBOl6QP9TDs8kEAqd4gRTUR', mode: 'subscription', plan: 'unlimited_monthly' },
  unlimited_yearly: { id: 'price_1UBOl6QP9TDs8kEAihxPdt2q', mode: 'subscription', plan: 'unlimited_yearly' },
} as const;

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const rejectedOrigin = rejectDisallowedOrigin(req);
    if (rejectedOrigin) return rejectedOrigin;
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const body = await req.json().catch(() => ({}));
    const selected = prices[body.plan as keyof typeof prices];
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : null;
    const userId = ctx.userClaims!.id;
    const email = ctx.userClaims!.email as string | undefined;
    if (!selected) return json({ error: 'Invalid plan' }, 400);
    if (selected.mode === 'payment' && !propertyId) return json({ error: 'A property is required' }, 400);

    for (const [limit, windowSeconds, scope] of [[10, 60, 'minute'], [100, 86400, 'day']] as const) {
      const { data: rate, error: rateError } = await ctx.supabaseAdmin.rpc('consume_edge_rate_limit', {
        p_user_id: userId,
        p_function_name: 'create-checkout',
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (rateError) {
        console.error('[create-checkout] rate limiter unavailable', { code: rateError.code });
        return json({ error: 'Request protection unavailable' }, 503);
      }
      if (!rate?.allowed) {
        const retryAfter = Math.max(1, Math.ceil((new Date(rate.reset_at).getTime() - Date.now()) / 1000));
        return json({ error: 'Too many checkout requests', scope, retryAfter }, 429);
      }
    }

    if (propertyId) {
      const { data: property } = await ctx.supabase.from('properties').select('id').eq('id', propertyId).maybeSingle();
      if (!property) return json({ error: 'Property not found' }, 404);
    }

    let { data: customerRow } = await ctx.supabaseAdmin
      .from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
    let customerId = customerRow?.stripe_customer_id;
    if (customerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if (existingCustomer.deleted) customerId = undefined;
      } catch (error) {
        if ((error as { code?: string }).code === 'resource_missing') {
          customerId = undefined;
        } else {
          throw error;
        }
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } });
      customerId = customer.id;
      const { error } = await ctx.supabaseAdmin.from('billing_customers').upsert({
        user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString(),
      });
      if (error) return json({ error: 'Unable to create billing profile' }, 500);
    }

    const metadata = { user_id: userId, property_id: propertyId ?? '', plan: selected.plan };
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: userId,
      mode: selected.mode,
      line_items: [{ price: selected.id, quantity: 1 }],
      success_url: `${siteUrl}/index.html?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/index.html?billing=cancelled`,
      metadata,
      ...(selected.mode === 'subscription' ? { subscription_data: { metadata } } : {}),
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      wallet_options: { link: { display: 'never' } },
    });
    return json({ url: session.url });
  }),
};
