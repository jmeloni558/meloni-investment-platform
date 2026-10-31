-- Independent of properties, analyses and bpo_reports: only an address is needed.
create table public.photo_library_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null default true
);
alter table public.photo_library_access enable row level security;
revoke all on public.photo_library_access from public,anon,authenticated;
grant select on public.photo_library_access to authenticated;
grant all on public.photo_library_access to service_role;
create policy photo_access_own on public.photo_library_access for select to authenticated using(user_id=(select auth.uid()));
create function public.photo_library_enabled() returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select exists(select 1 from public.photo_library_access where user_id=(select auth.uid()) and active);
$$;
revoke all on function public.photo_library_enabled() from public,anon;
grant execute on function public.photo_library_enabled() to authenticated,service_role;
create table public.photo_properties (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 address text not null check(length(trim(address)) between 1 and 500),
 created_at timestamptz not null default now()
);
create unique index photo_properties_address on public.photo_properties(user_id,lower(regexp_replace(trim(address),'\s+',' ','g')));
alter table public.photo_properties enable row level security;
revoke all on public.photo_properties from public,anon,authenticated;
grant select,insert on public.photo_properties to authenticated;
grant all on public.photo_properties to service_role;
create policy photo_properties_read on public.photo_properties for select to authenticated using(user_id=(select auth.uid()) and (select public.photo_library_enabled()));
create policy photo_properties_create on public.photo_properties for insert to authenticated with check(user_id=(select auth.uid()) and (select public.photo_library_enabled()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('property-photos','property-photos',false,26214400,array['image/jpeg','image/png','image/webp','image/heic','image/heif']);
create policy property_photos_read on storage.objects for select to authenticated using(
 bucket_id='property-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 and (select public.photo_library_enabled())
 and exists(select 1 from public.photo_properties p where p.id::text=(storage.foldername(name))[2] and p.user_id=(select auth.uid()))
);
create policy property_photos_create on storage.objects for insert to authenticated with check(
 bucket_id='property-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=2
 and (select public.photo_library_enabled())
 and exists(select 1 from public.photo_properties p where p.id::text=(storage.foldername(name))[2] and p.user_id=(select auth.uid()))
);
-- Server-managed pilot enrollment; never authorize from a browser-provided email.
insert into public.photo_library_access(user_id)
 select id from auth.users where lower(email)='jamie@melonirealty.com' and email_confirmed_at is not null;
