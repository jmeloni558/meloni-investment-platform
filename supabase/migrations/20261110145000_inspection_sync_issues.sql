create function public.inspection_sync_issues()
returns table(address text, wanted boolean, reason text, list_url text)
language sql stable security definer set search_path='' as $$
  select j.address,j.wanted,j.last_error,c.list_url
  from private.inspection_maps_jobs j cross join private.inspection_maps_config c
  where j.last_error is not null and exists(select from public.order_members where user_id=(select auth.uid()))
  order by j.address
$$;

create function public.confirm_manual_inspection(fixed_address text, expected_wanted boolean, expected_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not exists(select from public.order_members where user_id=(select auth.uid())) then raise exception 'Dashboard access required'; end if;
  update private.inspection_maps_jobs set applied=wanted,last_error=null,lease=null,lease_until=null,retry_at=now()
    where address=fixed_address and wanted=expected_wanted and last_error=expected_reason and coalesce(lease_until,'-infinity')<=now();
  return found;
end $$;
revoke all on function public.inspection_sync_issues(),public.confirm_manual_inspection(text,boolean,text) from public,anon;
grant execute on function public.inspection_sync_issues(),public.confirm_manual_inspection(text,boolean,text) to authenticated;
