create view public.photo_property_counts with (security_invoker = true) as
select p.id, p.address, p.created_at, p.completed_at, p.archived_at, p.deleting_at,
       coalesce(c.photo_count, 0) as photo_count
from public.photo_properties p
left join (
  select split_part(name, '/', 2) as property_id, count(*) as photo_count
  from storage.objects
  where bucket_id = 'property-photos'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and cardinality(string_to_array(name, '/')) = 3
  group by split_part(name, '/', 2)
) c on c.property_id = p.id::text;
revoke all on public.photo_property_counts from public, anon, authenticated;
grant select on public.photo_property_counts to authenticated;
