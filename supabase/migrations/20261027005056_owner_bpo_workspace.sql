-- Private, account-scoped BPO pilot. Grants are operational, never browser-managed.
create table public.bpo_access (user_id uuid primary key references auth.users(id) on delete cascade, active boolean not null default true);
alter table public.bpo_access enable row level security;
revoke all on public.bpo_access from public,anon,authenticated;
grant select on public.bpo_access to authenticated;
grant all on public.bpo_access to service_role;
create policy bpo_access_own on public.bpo_access for select to authenticated using (user_id=(select auth.uid()));
create function public.bpo_enabled() returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select exists(select 1 from public.bpo_access where user_id=(select auth.uid()) and active);
$$;
revoke all on function public.bpo_enabled() from public,anon;
grant execute on function public.bpo_enabled() to authenticated,service_role;
create table public.bpo_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 address text not null check(length(trim(address)) between 1 and 500),
 field_values jsonb not null default '{}' check(jsonb_typeof(field_values)='object' and octet_length(field_values::text)<=200000),
 revision integer not null default 1, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.bpo_reports enable row level security;
revoke all on public.bpo_reports from public,anon,authenticated;
grant select,delete on public.bpo_reports to authenticated;
grant insert(id,user_id,address,field_values) on public.bpo_reports to authenticated;
grant update(address,field_values) on public.bpo_reports to authenticated;
grant all on public.bpo_reports to service_role;
create policy bpo_reports_owner on public.bpo_reports for all to authenticated using(user_id=(select auth.uid()) and (select public.bpo_enabled())) with check(user_id=(select auth.uid()) and (select public.bpo_enabled()));
create index bpo_reports_user on public.bpo_reports(user_id);
create function propertythesis_private.bpo_revision() returns trigger language plpgsql security invoker set search_path=pg_catalog as $$ begin new.revision:=old.revision+1;new.updated_at:=now();return new;end $$;
revoke all on function propertythesis_private.bpo_revision() from public,anon,authenticated;
create trigger bpo_revision before update on public.bpo_reports for each row execute function propertythesis_private.bpo_revision();
-- PDF attachments live in a private bucket. The first path component is the account UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('bpo-documents','bpo-documents',false,15728640,array['application/pdf']);
create policy bpo_documents_owner on storage.objects for all to authenticated
 using(bucket_id='bpo-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.bpo_enabled()))
 with check(bucket_id='bpo-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.bpo_enabled()) and exists(select 1 from public.bpo_reports r where r.id::text=(storage.foldername(name))[2] and r.user_id=(select auth.uid())));
comment on table public.bpo_reports is 'Owner-only BPO pilot; source facts and value opinion are user reviewed. Included in logical database backups.';
