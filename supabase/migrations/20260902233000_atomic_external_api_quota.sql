create or replace function public.consume_external_api_quota(
  p_provider text,
  p_endpoint text,
  p_user_id uuid,
  p_guest_key_hash text,
  p_daily_limit integer,
  p_monthly_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
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
$$;

revoke all on function public.consume_external_api_quota(text, text, uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_external_api_quota(text, text, uuid, text, integer, integer)
  to service_role;
