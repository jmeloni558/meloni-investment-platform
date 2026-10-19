-- One evidence set per subject property; all subject analyses share it.
create table public.property_income_comparables (
  property_id uuid primary key references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  evidence jsonb not null,
  updated_at timestamptz not null default now(),
  constraint income_comps_evidence_shape check (
    coalesce(jsonb_typeof(evidence) = 'object'
    and evidence->>'version' = '1'
    and jsonb_typeof(evidence->'items') = 'array'
    and jsonb_array_length(evidence->'items') <= 20
    and octet_length(evidence::text) <= 262144
    and evidence ? 'reconciliation',false)
  )
);
create index property_income_comparables_user_idx on public.property_income_comparables(user_id);
alter table public.property_income_comparables enable row level security;
revoke all on public.property_income_comparables from public, anon, authenticated;
grant select on public.property_income_comparables to authenticated;
grant insert(property_id,user_id,revision,evidence) on public.property_income_comparables to authenticated;
grant update(revision,evidence) on public.property_income_comparables to authenticated;
grant all on public.property_income_comparables to service_role;
create policy income_comps_read on public.property_income_comparables for select to authenticated
  using (user_id = (select auth.uid()));
create policy income_comps_create on public.property_income_comparables for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.properties p where p.id=property_id and p.user_id=(select auth.uid())
  ));
create policy income_comps_update on public.property_income_comparables for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.properties p where p.id=property_id and p.user_id=(select auth.uid())
  ));
create function public.validate_income_comps_revision() returns trigger language plpgsql
set search_path = '' as $$
begin
  if TG_OP='INSERT' and NEW.revision<>1 then raise exception 'Initial revision must be 1'; end if;
  if TG_OP='UPDATE' and (NEW.revision<>OLD.revision+1 or NEW.property_id<>OLD.property_id or NEW.user_id<>OLD.user_id)
    then raise exception 'Invalid income comp revision or ownership change'; end if;
  NEW.updated_at=now();
  return NEW;
end $$;
revoke all on function public.validate_income_comps_revision() from public,anon,authenticated;
create trigger income_comps_revision before insert or update on public.property_income_comparables
for each row execute function public.validate_income_comps_revision();
comment on table public.property_income_comparables is
'User-authored income comp snapshots and cap reconciliation. Cascades on subject/account deletion. Include in recovery and customer-data export inventories before production enablement.';
