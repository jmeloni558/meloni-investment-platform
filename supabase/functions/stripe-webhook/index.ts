import Stripe from 'npm:stripe@^22';
import { withSupabase } from 'npm:@supabase/server@^1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function unix(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const signature = req.headers.get('stripe-signature') ?? '';
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!secret) return new Response('Webhook secret is not configured', { status: 503 });
    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret, undefined, cryptoProvider);
    } catch {
      return new Response('Invalid signature', { status: 400 });
    }

    const { data: seen } = await ctx.supabaseAdmin.from('stripe_events')
      .select('stripe_event_id').eq('stripe_event_id', event.id).maybeSingle();
    if (seen) return Response.json({ received: true, duplicate: true });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const propertyId = session.metadata?.property_id;
      if (session.mode === 'payment' && session.payment_status === 'paid' && userId && propertyId) {
        await ctx.supabaseAdmin.from('property_entitlements').upsert({
          user_id: userId,
          property_id: propertyId,
          source: 'single_purchase',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        }, { onConflict: 'user_id,property_id' });
      }
    }

    if (event.type.startsWith('customer.subscription.')) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      const item = subscription.items.data[0];
      const plan = subscription.metadata?.plan;
      if (userId && item?.price?.id && plan) {
        await ctx.supabaseAdmin.from('billing_subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: String(subscription.customer),
          stripe_subscription_id: subscription.id,
          stripe_price_id: item.price.id,
          plan,
          status: subscription.status,
          current_period_start: unix(item.current_period_start),
          current_period_end: unix(item.current_period_end),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    }

    await ctx.supabaseAdmin.from('stripe_events').insert({ stripe_event_id: event.id, event_type: event.type });
    return Response.json({ received: true });
  }),
};
