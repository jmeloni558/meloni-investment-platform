-- Backend-managed billing data must not inherit write or TRUNCATE privileges.
-- RLS does not apply to TRUNCATE, so keep client grants explicitly read-only.
revoke all privileges on table public.billing_customers from anon, authenticated;
revoke all privileges on table public.billing_subscriptions from anon, authenticated;
revoke all privileges on table public.property_entitlements from anon, authenticated;
revoke all privileges on table public.stripe_events from anon, authenticated;

grant select on table public.billing_customers to authenticated;
grant select on table public.billing_subscriptions to authenticated;
grant select on table public.property_entitlements to authenticated;
