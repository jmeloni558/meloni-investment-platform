create or replace function public.inspection_sync_status()
returns table(address text, wanted boolean, reason text, list_url text, maps_address text, status text)
language sql stable security definer set search_path='' as $$
  select j.address,j.wanted,private.inspection_issue_reason(j),c.list_url,coalesce(j.maps_address,j.address),
    case when private.inspection_issue_reason(j) is not null then 'issue' else 'pending' end
  from private.inspection_maps_jobs j cross join private.inspection_maps_config c
  where (private.inspection_issue_reason(j) is not null or (j.wanted and j.applied is distinct from true))
    and exists(select from public.order_members where user_id=(select auth.uid()))
  order by j.address
$$;
revoke all on function public.inspection_sync_status() from public,anon;
grant execute on function public.inspection_sync_status() to authenticated;
