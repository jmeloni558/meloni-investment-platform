create table public.photo_capture_dates (
 object_id uuid primary key,
 property_id uuid not null references public.photo_properties(id) on delete cascade,
 taken_on date not null check (taken_on between date '0001-01-01' and date '9999-12-31')
);
alter table public.photo_capture_dates enable row level security;
revoke all on public.photo_capture_dates from public, anon, authenticated;
grant select, insert on public.photo_capture_dates to authenticated;
grant all on public.photo_capture_dates to service_role;
create policy read_own_capture_dates on public.photo_capture_dates for select to authenticated
 using (exists(select 1 from public.photo_properties p where p.id=property_id));
create policy add_own_capture_dates on public.photo_capture_dates for insert to authenticated
 with check (exists(select 1 from storage.objects o where o.id=object_id and o.bucket_id='property-photos'
 and split_part(o.name,'/',1)=(select auth.uid())::text and split_part(o.name,'/',2)=property_id::text));

create function public.photo_dates_for_property(p_property uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(o.id,coalesce(o.user_metadata->>'taken_on',d.taken_on::text)), '{}'::jsonb)
 from storage.objects o left join public.photo_capture_dates d on d.object_id=o.id
 where o.bucket_id='property-photos' and split_part(o.name,'/',1)=(select auth.uid())::text
 and split_part(o.name,'/',2)=p_property::text and coalesce(o.user_metadata->>'taken_on',d.taken_on::text) is not null;
$$;
revoke all on function public.photo_dates_for_property(uuid) from public,anon;
grant execute on function public.photo_dates_for_property(uuid) to authenticated;
