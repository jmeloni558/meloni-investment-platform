alter table public.stripe_events
  add column if not exists event_created_at timestamptz;

alter table public.billing_subscriptions
  add column if not exists last_stripe_event_created_at timestamptz,
  add column if not exists last_stripe_event_id text;

create or replace function public.process_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_operation text default 'none',
  p_user_id uuid default null,
  p_property_id uuid default null,
  p_checkout_session_id text default null,
  p_payment_intent_id text default null,
  p_customer_id text default null,
  p_subscription_id text default null,
  p_price_id text default null,
  p_plan text default null,
  p_status text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if nullif(trim(p_event_id), '') is null or nullif(trim(p_event_type), '') is null then
    raise exception 'Stripe event id and type are required';
  end if;

  if p_operation not in ('none', 'entitlement', 'subscription') then
    raise exception 'Unsupported Stripe webhook operation';
  end if;

  insert into public.stripe_events (stripe_event_id, event_type, event_created_at)
  values (p_event_id, p_event_type, p_event_created_at)
  on conflict (stripe_event_id) do nothing;

  if not found then
    return jsonb_build_object('processed', false, 'duplicate', true);
  end if;

  if p_operation = 'entitlement' then
    if p_user_id is null or p_property_id is null or nullif(trim(p_checkout_session_id), '') is null then
      raise exception 'A user, property and checkout session are required for an entitlement';
    end if;

    if not exists (
      select 1
      from public.properties
      where id = p_property_id and user_id = p_user_id
    ) then
      raise exception 'The purchased property does not belong to the Stripe customer';
    end if;

    insert into public.property_entitlements (
      user_id,
      property_id,
      source,
      stripe_checkout_session_id,
      stripe_payment_intent_id
    ) values (
      p_user_id,
      p_property_id,
      'single_purchase',
      p_checkout_session_id,
      p_payment_intent_id
    )
    on conflict (user_id, property_id) do update set
      source = 'single_purchase',
      stripe_checkout_session_id = excluded.stripe_checkout_session_id,
      stripe_payment_intent_id = excluded.stripe_payment_intent_id;
  elsif p_operation = 'subscription' then
    if p_user_id is null
      or nullif(trim(p_customer_id), '') is null
      or nullif(trim(p_subscription_id), '') is null
      or nullif(trim(p_price_id), '') is null
      or p_plan not in ('professional_50_monthly', 'professional_50_yearly', 'unlimited_monthly', 'unlimited_yearly')
      or nullif(trim(p_status), '') is null then
      raise exception 'Complete subscription data is required';
    end if;

    insert into public.billing_subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      plan,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      last_stripe_event_created_at,
      last_stripe_event_id,
      updated_at
    ) values (
      p_user_id,
      p_customer_id,
      p_subscription_id,
      p_price_id,
      p_plan,
      p_status,
      p_period_start,
      p_period_end,
      coalesce(p_cancel_at_period_end, false),
      p_event_created_at,
      p_event_id,
      now()
    )
    on conflict (user_id) do update set
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_price_id = excluded.stripe_price_id,
      plan = excluded.plan,
      status = excluded.status,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      last_stripe_event_created_at = excluded.last_stripe_event_created_at,
      last_stripe_event_id = excluded.last_stripe_event_id,
      updated_at = now()
    where public.billing_subscriptions.last_stripe_event_created_at is null
      or excluded.last_stripe_event_created_at > public.billing_subscriptions.last_stripe_event_created_at
      or (
        excluded.last_stripe_event_created_at = public.billing_subscriptions.last_stripe_event_created_at
        and excluded.last_stripe_event_id > coalesce(public.billing_subscriptions.last_stripe_event_id, '')
      );
  end if;

  return jsonb_build_object('processed', true, 'duplicate', false, 'operation', p_operation);
end;
$$;

revoke all on function public.process_stripe_webhook_event(
  text, text, timestamptz, text, uuid, uuid, text, text, text, text, text,
  text, text, timestamptz, timestamptz, boolean
) from public, anon, authenticated;

grant execute on function public.process_stripe_webhook_event(
  text, text, timestamptz, text, uuid, uuid, text, text, text, text, text,
  text, text, timestamptz, timestamptz, boolean
) to service_role;
