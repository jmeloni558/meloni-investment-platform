create or replace function public.process_stripe_refund_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payment_intent_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted_count integer;
begin
  if nullif(trim(p_event_id), '') is null
    or p_event_type <> 'charge.refunded'
    or nullif(trim(p_payment_intent_id), '') is null then
    raise exception 'A valid full-refund event and payment intent are required';
  end if;

  insert into public.stripe_events (stripe_event_id, event_type, event_created_at)
  values (p_event_id, p_event_type, p_event_created_at)
  on conflict (stripe_event_id) do nothing;

  if not found then
    return jsonb_build_object('processed', false, 'duplicate', true);
  end if;

  delete from public.property_entitlements
  where source = 'single_purchase'
    and stripe_payment_intent_id = p_payment_intent_id;

  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'processed', true,
    'duplicate', false,
    'operation', 'revoke_entitlement',
    'revoked', v_deleted_count
  );
end;
$$;

revoke all on function public.process_stripe_refund_event(text, text, timestamptz, text)
  from public, anon, authenticated;

grant execute on function public.process_stripe_refund_event(text, text, timestamptz, text)
  to service_role;
