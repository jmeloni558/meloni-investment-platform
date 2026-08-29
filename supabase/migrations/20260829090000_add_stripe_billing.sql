create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  plan text not null check (plan in ('professional_50_monthly','professional_50_yearly','unlimited_monthly','unlimited_yearly')),
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  source text not null check (source in ('legacy','free','single_purchase','subscription')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  unlocked_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create table if not exists public.stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists property_entitlements_user_unlocked_idx
  on public.property_entitlements (user_id, unlocked_at desc);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.property_entitlements enable row level security;
alter table public.stripe_events enable row level security;

create policy billing_customers_select_own on public.billing_customers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy billing_subscriptions_select_own on public.billing_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy property_entitlements_select_own on public.property_entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

insert into public.property_entitlements (user_id, property_id, source, unlocked_at)
select p.user_id, p.id, 'legacy', p.created_at
from public.properties p
on conflict (user_id, property_id) do nothing;

create or replace function public.claim_property_access(p_property_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.property_entitlements%rowtype;
  v_subscription public.billing_subscriptions%rowtype;
  v_total integer;
  v_used integer;
  v_source text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.properties
    where id = p_property_id and user_id = v_user_id
  ) then
    raise exception 'Property not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select * into v_existing
  from public.property_entitlements
  where user_id = v_user_id and property_id = p_property_id;

  if found then
    return jsonb_build_object('allowed', true, 'source', v_existing.source, 'propertyId', p_property_id);
  end if;

  select count(*) into v_total
  from public.property_entitlements
  where user_id = v_user_id;

  if v_total = 0 then
    insert into public.property_entitlements (user_id, property_id, source)
    values (v_user_id, p_property_id, 'free');
    return jsonb_build_object('allowed', true, 'source', 'free', 'propertyId', p_property_id);
  end if;

  select * into v_subscription
  from public.billing_subscriptions
  where user_id = v_user_id
    and status in ('active','trialing')
    and (current_period_end is null or current_period_end > now());

  if found then
    if v_subscription.plan like 'unlimited_%' then
      v_source := 'subscription';
    else
      select count(*) into v_used
      from public.property_entitlements
      where user_id = v_user_id
        and source = 'subscription'
        and unlocked_at >= coalesce(v_subscription.current_period_start, date_trunc('month', now()))
        and unlocked_at < coalesce(v_subscription.current_period_end, date_trunc('month', now()) + interval '1 month');
      if v_used < 50 then v_source := 'subscription'; end if;
    end if;
  end if;

  if v_source = 'subscription' then
    insert into public.property_entitlements (user_id, property_id, source, stripe_subscription_id)
    values (v_user_id, p_property_id, 'subscription', v_subscription.stripe_subscription_id);
    return jsonb_build_object('allowed', true, 'source', 'subscription', 'propertyId', p_property_id,
      'plan', v_subscription.plan, 'used', coalesce(v_used, 0), 'limit', case when v_subscription.plan like 'unlimited_%' then null else 50 end);
  end if;

  return jsonb_build_object('allowed', false, 'reason', 'payment_required', 'propertyId', p_property_id,
    'plan', v_subscription.plan, 'used', coalesce(v_used, 0), 'limit', case when v_subscription.plan like 'professional_50_%' then 50 else null end);
end;
$$;

revoke all on function public.claim_property_access(uuid) from public;
revoke all on function public.claim_property_access(uuid) from anon;
grant execute on function public.claim_property_access(uuid) to authenticated;

revoke all on public.billing_customers, public.billing_subscriptions, public.property_entitlements, public.stripe_events from anon;
grant select on public.billing_customers, public.billing_subscriptions, public.property_entitlements to authenticated;

create index if not exists property_entitlements_property_idx
  on public.property_entitlements (property_id);
