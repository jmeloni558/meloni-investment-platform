create function private.inspection_issue_reason(j private.inspection_maps_jobs)
returns text language sql stable set search_path='' as $$
  select coalesce(j.last_error, case when j.wanted is distinct from j.applied
    and j.retry_at <= now() - interval '5 minutes' and coalesce(j.lease_until,'-infinity')<=now()
    then 'Google Maps sync is delayed. Check that Inspections sync is enabled in your signed-in Edge work profile, then retry.' end)
$$;
revoke all on function private.inspection_issue_reason(private.inspection_maps_jobs) from public,anon,authenticated;

create or replace function public.inspection_sync_issues()
returns table(address text, wanted boolean, reason text, list_url text, maps_address text)
language sql stable security definer set search_path='' as $$
  select j.address,j.wanted,private.inspection_issue_reason(j),c.list_url,coalesce(j.maps_address,j.address)
  from private.inspection_maps_jobs j cross join private.inspection_maps_config c
  where private.inspection_issue_reason(j) is not null and exists(select from public.order_members where user_id=(select auth.uid()))
  order by j.address
$$;
revoke all on function public.inspection_sync_issues() from public,anon;
grant execute on function public.inspection_sync_issues() to authenticated;

create or replace function public.retry_inspection_address(original_address text, previous_lookup text,
  expected_wanted boolean, expected_reason text, corrected_address text)
returns void language plpgsql security definer set search_path='' as $$
declare lookup text := btrim(corrected_address);
begin
  if not exists(select from public.order_members where user_id=(select auth.uid())) then
    raise exception 'Dashboard access required.';
  end if;
  if lookup is null or length(lookup)>500 or lookup !~ '^[0-9].+[[:space:]][0-9]{5}(-[0-9]{4})?$' then
    raise exception 'Enter the full street address, city and ZIP code.';
  end if;
  update private.inspection_maps_jobs j
  set maps_address=nullif(lookup,address),applied=null,last_error=null,retry_at=now(),lease=null,lease_until=null
  where address_key=private.inspection_address_key(original_address) and address=original_address
    and coalesce(maps_address,address)=previous_lookup and wanted=expected_wanted and private.inspection_issue_reason(j)=expected_reason
    and coalesce(lease_until,'-infinity')<=now();
  if not found then raise exception 'A retry is running or the issue has changed. Close this window and refresh the dashboard.'; end if;
end $$;
revoke all on function public.retry_inspection_address(text,text,boolean,text,text) from public,anon;
grant execute on function public.retry_inspection_address(text,text,boolean,text,text) to authenticated;

create or replace function public.confirm_manual_inspection(fixed_address text, expected_wanted boolean, expected_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not exists(select from public.order_members where user_id=(select auth.uid())) then raise exception 'Dashboard access required'; end if;
  update private.inspection_maps_jobs j set applied=wanted,last_error=null,lease=null,lease_until=null,retry_at=now()
    where address=fixed_address and wanted=expected_wanted and private.inspection_issue_reason(j)=expected_reason and coalesce(lease_until,'-infinity')<=now();
  return found;
end $$;
