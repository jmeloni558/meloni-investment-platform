create function public.linked_history_folders(order_ids uuid[])
returns table(order_id uuid)
language sql stable security definer set search_path='' as $$
  select j.order_id from private.order_folder_jobs j
  join public.field_orders o on o.id=j.order_id
  where o.id=any(order_ids) and o.todo_title is not null and j.folder_url is not null
    and exists (select from public.order_members m where m.user_id=(select auth.uid()))
$$;
revoke all on function public.linked_history_folders(uuid[]) from public,anon;
grant execute on function public.linked_history_folders(uuid[]) to authenticated;
