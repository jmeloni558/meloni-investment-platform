import Stripe from 'npm:stripe@22.0.0';
import { withSupabase } from 'npm:@supabase/server@1.4.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function unix(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

const allowedPlans = new Set([
  'professional_50_monthly',
  'professional_50_yearly',
  'unlimited_monthly',
  'unlimited_yearly',
]);

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

    const eventCreatedAt = unix(event.created);
    const applyEvent = async (operation: 'none' | 'entitlement' | 'subscription', values: Record<string, unknown> = {}) => {
      const { data, error } = await ctx.supabaseAdmin.rpc('process_stripe_webhook_event', {
        p_event_id: event.id,
        p_event_type: event.type,
        p_event_created_at: eventCreatedAt,
        p_operation: operation,
        p_user_id: null,
        p_property_id: null,
        p_checkout_session_id: null,
        p_payment_intent_id: null,
        p_customer_id: null,
        p_subscription_id: null,
        p_price_id: null,
        p_plan: null,
        p_status: null,
        p_period_start: null,
        p_period_end: null,
        p_cancel_at_period_end: false,
        ...values,
      });
      if (error) throw error;
      return data as { duplicate?: boolean } | null;
    };

    try {
      let result: { duplicate?: boolean } | null;
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const propertyId = session.metadata?.property_id;
        result = session.mode === 'payment' && session.payment_status === 'paid' && userId && propertyId
          ? await applyEvent('entitlement', {
            p_user_id: userId,
            p_property_id: propertyId,
            p_checkout_session_id: session.id,
            p_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          })
          : await applyEvent('none');
      } else if (event.type.startsWith('customer.subscription.')) {
        const eventSubscription = event.data.object as Stripe.Subscription;
        const subscription = await stripe.subscriptions.retrieve(eventSubscription.id);
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        let userId = subscription.metadata?.user_id || null;
        if (!userId) {
          const { data: customer, error } = await ctx.supabaseAdmin.from('billing_customers')
            .select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
          if (error) throw error;
          userId = customer?.user_id || null;
        }
        if (!userId) {
          result = await applyEvent('none');
        } else {
          const item = subscription.items.data[0];
          const plan = subscription.metadata?.plan;
          if (!item?.price?.id || !plan || !allowedPlans.has(plan)) {
            throw new Error('Managed Stripe subscription is missing a recognized price or plan');
          }
          result = await applyEvent('subscription', {
            p_user_id: userId,
            p_customer_id: customerId,
            p_subscription_id: subscription.id,
            p_price_id: item.price.id,
            p_plan: plan,
            p_status: subscription.status,
            p_period_start: unix(item.current_period_start),
            p_period_end: unix(item.current_period_end),
            p_cancel_at_period_end: subscription.cancel_at_period_end,
          });
        }
      } else {
        result = await applyEvent('none');
      }
      return Response.json({ received: true, duplicate: Boolean(result?.duplicate) });
    } catch (error) {
      console.error('[stripe-webhook] processing failed', {
        eventId: event.id,
        eventType: event.type,
        message: error instanceof Error ? error.message : String(error),
      });
      return Response.json({ received: false, error: 'Webhook processing failed' }, { status: 500 });
    }
  }),
};
