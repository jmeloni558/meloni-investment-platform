-- NULL means the place may have been saved directly in Google Maps.
alter table private.inspection_maps_jobs alter column applied drop not null;

create function private.inspection_address_key(address text) returns text
language sql immutable strict set search_path='' as $$
  select private.order_address_key(regexp_replace(address,'\s*(#|apt\.?\s+|unit\s+)[a-z0-9-]+',' ','i'));
$$;

create function private.remove_completed_inspection() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text := private.inspection_address_key(new.address);
begin
  perform pg_advisory_xact_lock(hashtextextended(k,1532));
  -- Another unfinished visit at this place can still need the saved pin.
  if exists(select from public.field_orders f
    left join public.photo_properties p on p.id=f.photo_id
    where not f.complete and f.list_name is null and not f.former_list_task
      and f.id<>new.id and private.inspection_address_key(f.address)=k
      and (f.photo_id is null or (p.completed_at is null and p.archived_at is null))) then
    return null;
  end if;
  insert into private.inspection_maps_jobs(address_key,address,wanted,applied)
    values(k,new.address,false,null)
    on conflict(address_key) do update set address=excluded.address,wanted=false,applied=null,retry_at=now();
  return null;
end $$;

revoke all on function private.inspection_address_key(text),private.remove_completed_inspection() from public,anon,authenticated;
create trigger remove_completed_inspection after update of complete on public.field_orders
for each row when (not old.complete and new.complete and new.list_name is null and not new.former_list_task)
execute function private.remove_completed_inspection();

create or replace function public.claim_inspection_place() returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.inspection_maps_jobs; cfg private.inspection_maps_config;
begin
 if not exists(select from public.order_members where user_id=(select auth.uid())) then raise exception 'Dashboard access required'; end if;
 select * into cfg from private.inspection_maps_config; if not found then return null; end if;
 select * into j from private.inspection_maps_jobs where (wanted is distinct from applied or last_error is not null or lease is not null) and retry_at<=now()
   and coalesce(lease_until,'-infinity')<=now() order by retry_at,address_key limit 1 for update skip locked;
 if not found then return null; end if;
 update private.inspection_maps_jobs set lease=gen_random_uuid(),lease_until=now()+interval '5 minutes' where address_key=j.address_key returning * into j;
 return jsonb_build_object('lease',j.lease,'address',j.address,'wanted',j.wanted,'listUrl',cfg.list_url,'account',cfg.google_account,'listName',cfg.list_name);
end $$;
