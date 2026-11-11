-- Keep the Maps spelling with the job so completion uses the same place.
alter table private.inspection_maps_jobs add column maps_address text;

drop function public.inspection_sync_issues();
create function public.inspection_sync_issues()
returns table(address text, wanted boolean, reason text, list_url text, maps_address text)
language sql stable security definer set search_path='' as $$
  select j.address,j.wanted,j.last_error,c.list_url,coalesce(j.maps_address,j.address)
  from private.inspection_maps_jobs j cross join private.inspection_maps_config c
  where j.last_error is not null and exists(select from public.order_members where user_id=(select auth.uid()))
  order by j.address
$$;
revoke all on function public.inspection_sync_issues() from public,anon;
grant execute on function public.inspection_sync_issues() to authenticated;

create function public.retry_inspection_address(original_address text, previous_lookup text,
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
  update private.inspection_maps_jobs
  set maps_address=nullif(lookup,address),applied=null,last_error=null,retry_at=now(),lease=null,lease_until=null
  where address_key=private.inspection_address_key(original_address) and address=original_address
    and coalesce(maps_address,address)=previous_lookup and wanted=expected_wanted and last_error=expected_reason
    and coalesce(lease_until,'-infinity')<=now();
  if not found then raise exception 'A retry is running or the issue has changed. Close this window and refresh the dashboard.'; end if;
end $$;
revoke all on function public.retry_inspection_address(text,text,boolean,text,text) from public,anon;
grant execute on function public.retry_inspection_address(text,text,boolean,text,text) to authenticated;

create or replace function public.claim_inspection_place() returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.inspection_maps_jobs; cfg private.inspection_maps_config;
begin
 if not exists(select from public.order_members where user_id=(select auth.uid())) then raise exception 'Dashboard access required'; end if;
 select * into cfg from private.inspection_maps_config; if not found then return null; end if;
 select * into j from private.inspection_maps_jobs where (wanted is distinct from applied or last_error is not null or lease is not null) and retry_at<=now()
   and coalesce(lease_until,'-infinity')<=now() order by retry_at,address_key limit 1 for update skip locked;
 if not found then return null; end if;
 update private.inspection_maps_jobs set lease=gen_random_uuid(),lease_until=now()+interval '5 minutes' where address_key=j.address_key returning * into j;
 return jsonb_build_object('lease',j.lease,'address',coalesce(j.maps_address,j.address),'wanted',j.wanted,'listUrl',cfg.list_url,'account',cfg.google_account,'listName',cfg.list_name);
end $$;
