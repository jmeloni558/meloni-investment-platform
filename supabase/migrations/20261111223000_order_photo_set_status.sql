create function public.order_photo_set_status(order_ids uuid[])
returns table(order_id uuid, finished boolean, active boolean)
language sql stable security definer set search_path='' as $$
  select o.id,
         p.completed_at is not null or p.archived_at is not null,
         p.completed_at is null and p.archived_at is null and p.deleting_at is null
  from public.order_members m
  join public.photo_properties p on p.user_id=m.photo_owner
  join public.field_orders o on o.photo_id=p.id
  where m.user_id=(select auth.uid()) and o.id=any(order_ids)
$$;
revoke all on function public.order_photo_set_status(uuid[]) from public,anon;
grant execute on function public.order_photo_set_status(uuid[]) to authenticated;
