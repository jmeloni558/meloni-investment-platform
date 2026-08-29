revoke all on function public.claim_property_access(uuid) from public;
revoke all on function public.claim_property_access(uuid) from anon;
grant execute on function public.claim_property_access(uuid) to authenticated;

create index if not exists property_entitlements_property_idx
  on public.property_entitlements (property_id);
