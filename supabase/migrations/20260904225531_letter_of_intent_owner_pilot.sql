-- Immutable server-created LOI previews. Clients can read their own owner-pilot
-- records, but cannot alter a recipient, preview, sending status or audit trail.
create table public.letters_of_intent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  analysis_id uuid references public.analyses(id) on delete set null,
  analysis_updated_at timestamptz not null,
  address text not null check (length(address) between 1 and 300),
  recipient_email text not null,
  sender_email text not null,
  sender_from text not null,
  terms jsonb not null check (jsonb_typeof(terms) = 'object'),
  subject text not null,
  letter_text text not null,
  letter_html text not null,
  document_hash text not null check (document_hash ~ '^[a-f0-9]{64}$'),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  template_version text not null,
  status text not null default 'prepared' check (status in ('prepared','sending','submitted','failed','unknown')),
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  submitted_at timestamptz,
  unique (user_id, fingerprint)
);
create index letters_of_intent_user_created on public.letters_of_intent (user_id, created_at desc);
create index letters_of_intent_property on public.letters_of_intent (property_id);
create index letters_of_intent_analysis on public.letters_of_intent (analysis_id);
alter table public.letters_of_intent enable row level security;
revoke all on public.letters_of_intent from public, anon, authenticated;
grant select on public.letters_of_intent to authenticated;
grant all on public.letters_of_intent to service_role;
create policy "Owner pilot can read only own letters" on public.letters_of_intent
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from public.account_access_overrides o
    where o.user_id = (select auth.uid()) and o.active and o.access_role = 'owner'
  ));
comment on table public.letters_of_intent is 'Owner-only LOI pilot. Edge Function validates ownership and creates immutable previews; no client writes. Submitted means provider accepted, not delivered or contract accepted. Retained after property deletion; account deletion cascades.';
