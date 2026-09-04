-- Applied by Supabase migration owner_account_access (20260904220908).
-- Server-managed, revocable owner access; never provisioned from browser metadata.
create table public.account_access_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_role text not null default 'owner' check (access_role = 'owner'),
  active boolean not null default true,
  rentcast_daily_limit integer not null default 500 check (rentcast_daily_limit between 100 and 1000),
  ai_daily_limit integer not null default 500 check (ai_daily_limit between 50 and 1000),
  created_at timestamptz not null default now()
);
alter table public.account_access_overrides enable row level security;
revoke all on public.account_access_overrides from public, anon, authenticated;
grant select on public.account_access_overrides to authenticated;
grant select, insert, update, delete on public.account_access_overrides to service_role;
create policy account_access_overrides_select_own on public.account_access_overrides
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.get_account_access()
returns jsonb language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select coalesce((
    select jsonb_build_object('owner', true, 'plan', 'owner',
      'rentcastDailyLimit', rentcast_daily_limit, 'aiDailyLimit', ai_daily_limit)
    from public.account_access_overrides where user_id = auth.uid() and active
  ), jsonb_build_object('owner', false));
$$;
revoke all on function public.get_account_access() from public, anon;
grant execute on function public.get_account_access() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_property_access(p_property_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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

  -- Owner access never grants access to another user's property.
  if exists (select 1 from public.account_access_overrides
             where user_id = v_user_id and active) then
    return jsonb_build_object('allowed', true, 'source', 'owner',
      'plan', 'owner', 'propertyId', p_property_id, 'limit', null);
  end if;

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
$function$;

CREATE OR REPLACE FUNCTION public.consume_edge_rate_limit(p_user_id uuid, p_function_name text, p_limit integer, p_window_seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_count integer;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;
  if coalesce(length(trim(p_function_name)),0)=0 then
    raise exception 'function name required';
  end if;
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'invalid rate limit';
  end if;


  -- Keep short burst protections; increase the owner's daily research allowance.
  if p_window_seconds >= 86400 and p_function_name in
    ('rentcast-property-lookup','rentcast-sales-comps','rentcast-rent-support') then
    p_limit := greatest(p_limit, coalesce((
      select rentcast_daily_limit from public.account_access_overrides
      where user_id = p_user_id and active
    ), p_limit));
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  v_reset_at := v_window_start + make_interval(secs => p_window_seconds);

  insert into public.edge_rate_limits(user_id,function_name,window_seconds,window_start,request_count,updated_at)
  values(p_user_id,p_function_name,p_window_seconds,v_window_start,1,v_now)
  on conflict (user_id,function_name,window_seconds,window_start)
  do update set request_count = public.edge_rate_limits.request_count + 1,
                updated_at = excluded.updated_at
  where public.edge_rate_limits.request_count < p_limit
  returning request_count into v_count;

  if v_count is null then
    select request_count into v_count
    from public.edge_rate_limits
    where user_id=p_user_id
      and function_name=p_function_name
      and window_seconds=p_window_seconds
      and window_start=v_window_start;

    return jsonb_build_object(
      'allowed', false,
      'limit', p_limit,
      'remaining', 0,
      'count', coalesce(v_count,p_limit),
      'reset_at', v_reset_at
    );
  end if;

  delete from public.edge_rate_limits
  where user_id=p_user_id
    and function_name=p_function_name
    and window_start < v_now - interval '2 days';

  return jsonb_build_object(
    'allowed', true,
    'limit', p_limit,
    'remaining', greatest(p_limit-v_count,0),
    'count', v_count,
    'reset_at', v_reset_at
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.consume_external_api_quota(p_provider text, p_endpoint text, p_user_id uuid, p_guest_key_hash text, p_daily_limit integer, p_monthly_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_now timestamptz := clock_timestamp();
  v_day_start timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_month_start timestamptz := date_trunc('month', v_now at time zone 'UTC') at time zone 'UTC';
  v_daily_used integer;
  v_monthly_used integer;
begin
  if coalesce(length(trim(p_provider)), 0) = 0 or coalesce(length(trim(p_endpoint)), 0) = 0 then
    raise exception 'provider and endpoint are required';
  end if;
  if (p_user_id is null) = (coalesce(length(trim(p_guest_key_hash)), 0) = 0) then
    raise exception 'exactly one caller identity is required';
  end if;
  if p_daily_limit <= 0 or p_monthly_limit <= 0 then
    raise exception 'invalid quota';
  end if;


  -- Only service_role can call this function. Caller identity is verified by the Edge Function.
  p_daily_limit := greatest(p_daily_limit, coalesce((
    select case p_provider when 'rentcast' then rentcast_daily_limit
      when 'openai' then ai_daily_limit else p_daily_limit end
    from public.account_access_overrides where user_id = p_user_id and active
  ), p_daily_limit));
  perform pg_advisory_xact_lock(hashtextextended('external-api:' || p_provider, 0));

  select
    (select count(*) from public.external_api_usage where provider = p_provider and created_at >= v_month_start) +
    (select count(*) from public.guest_external_api_usage where provider = p_provider and created_at >= v_month_start)
  into v_monthly_used;

  if v_monthly_used >= p_monthly_limit then
    return jsonb_build_object(
      'allowed', false, 'reason', 'MONTHLY_LIMIT',
      'monthlyUsed', v_monthly_used, 'monthlyLimit', p_monthly_limit,
      'dailyLimit', p_daily_limit, 'dailyRemaining', 0
    );
  end if;

  if p_user_id is not null then
    select count(*) into v_daily_used
    from public.external_api_usage
    where provider = p_provider and user_id = p_user_id and created_at >= v_day_start;
  else
    select count(*) into v_daily_used
    from public.guest_external_api_usage
    where provider = p_provider and guest_key_hash = p_guest_key_hash and created_at >= v_day_start;
  end if;

  if v_daily_used >= p_daily_limit then
    return jsonb_build_object(
      'allowed', false, 'reason', 'DAILY_LIMIT',
      'dailyUsed', v_daily_used, 'dailyLimit', p_daily_limit, 'dailyRemaining', 0,
      'monthlyUsed', v_monthly_used, 'monthlyLimit', p_monthly_limit
    );
  end if;

  if p_user_id is not null then
    insert into public.external_api_usage(user_id, provider, endpoint)
    values (p_user_id, p_provider, p_endpoint);
  else
    insert into public.guest_external_api_usage(guest_key_hash, provider, endpoint)
    values (p_guest_key_hash, p_provider, p_endpoint);
  end if;

  return jsonb_build_object(
    'allowed', true,
    'dailyUsed', v_daily_used + 1, 'dailyLimit', p_daily_limit,
    'dailyRemaining', greatest(p_daily_limit - v_daily_used - 1, 0),
    'monthlyUsed', v_monthly_used + 1, 'monthlyLimit', p_monthly_limit
  );
end;
$function$;

revoke all on function public.claim_property_access(uuid) from public, anon;
grant execute on function public.claim_property_access(uuid) to authenticated, service_role;
revoke all on function public.consume_external_api_quota(text,text,uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_external_api_quota(text,text,uuid,text,integer,integer) to service_role;
revoke all on function public.consume_edge_rate_limit(uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(uuid,text,integer,integer) to service_role;
