-- Only the aggregate byte totals are needed by the photo library.
create schema if not exists pt_photo_private;
revoke all on schema pt_photo_private from public, anon;
grant usage on schema pt_photo_private to authenticated;

create function pt_photo_private.storage_usage()
returns table(photo_bytes bigint, project_bytes bigint, included_bytes bigint)
language sql stable security definer set search_path = '' as $$
  select coalesce(sum((metadata->>'size')::bigint) filter (
           where bucket_id = 'property-photos'
             and split_part(name, '/', 1) = (select auth.uid())::text
         ), 0)::bigint,
         coalesce(sum((metadata->>'size')::bigint), 0)::bigint,
         100000000000::bigint
  from storage.objects
  having (select auth.uid()) is not null and (select public.photo_library_enabled());
$$;
revoke all on function pt_photo_private.storage_usage() from public, anon;
grant execute on function pt_photo_private.storage_usage() to authenticated;

create view public.photo_storage_usage with (security_invoker = true) as
select * from pt_photo_private.storage_usage();
revoke all on public.photo_storage_usage from public, anon, authenticated;
grant select on public.photo_storage_usage to authenticated;
