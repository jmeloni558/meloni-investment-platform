create function private.remove_velocity_inspection(place_address text) returns void
language plpgsql security definer set search_path='' as $$
declare k text := private.inspection_address_key(place_address);
begin
  perform pg_advisory_xact_lock(hashtextextended(k,1532));
  if exists(select from public.field_orders f left join public.photo_properties p on p.id=f.photo_id
    where not f.velocity and not f.complete and f.list_name is null and not f.former_list_task
    and private.inspection_address_key(f.address)=k and p.completed_at is null and p.archived_at is null) then return; end if;
  -- An unknown applied state makes the worker check even a manually saved pin.
  insert into private.inspection_maps_jobs(address_key,address,wanted,applied)
    values(k,place_address,false,null)
    on conflict(address_key) do update set wanted=false,applied=null,retry_at=now(),last_error=null;
end $$;
revoke all on function private.remove_velocity_inspection(text) from public,anon,authenticated;

create or replace function private.track_inspection_order() returns trigger
language plpgsql security definer set search_path='' as $$
declare visit_active boolean;
begin
  if new.list_name is not null or new.former_list_task or new.complete then
    if tg_op='UPDATE' then delete from private.inspection_sources where order_id=new.id; end if;
    return null;
  end if;
  if new.velocity then
    delete from private.inspection_sources where order_id=new.id;
    if tg_op='INSERT' or not old.velocity or old.address is distinct from new.address then
      perform private.remove_velocity_inspection(new.address);
    end if;
    return null;
  end if;
  -- Track new orders immediately. Ordinary edits to pre-rollout orders do not
  -- bulk enroll them; enabling photos or reopening a visit still enrolls it.
  if tg_op='UPDATE' and not old.velocity and not old.complete and old.needs_photos=new.needs_photos
     and not exists(select from private.inspection_sources where order_id=new.id) then return null; end if;
  visit_active:=not exists(select from public.photo_properties p where p.id=new.photo_id
    and (p.completed_at is not null or p.archived_at is not null));
  insert into private.inspection_sources as s(order_id,photo_id,address,address_key,active)
    values(new.id,new.photo_id,new.address,private.inspection_address_key(new.address),visit_active)
    on conflict(order_id) do update set photo_id=excluded.photo_id,address=excluded.address,
      address_key=excluded.address_key,active=excluded.active
    where (s.photo_id,s.address,s.address_key,s.active) is distinct from
          (excluded.photo_id,excluded.address,excluded.address_key,excluded.active);
  return null;
end $$;

drop trigger inspection_order_change on public.field_orders;
create trigger inspection_order_change after insert or update of needs_photos,photo_id,address,list_name,complete,velocity on public.field_orders
for each row execute function private.track_inspection_order();

create or replace function private.queue_inspection_place() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text; a text; desired boolean;
begin
  for k,a in select distinct x.key,x.addr from (values
    (case when tg_op<>'INSERT' then old.address_key end,case when tg_op<>'INSERT' then old.address end),
    (case when tg_op<>'DELETE' then new.address_key end,case when tg_op<>'DELETE' then new.address end)) x(key,addr)
    where x.key is not null order by x.key loop
    perform pg_advisory_xact_lock(hashtextextended(k,1532));
    select exists(select from private.inspection_sources where address_key=k and active) into desired;
    if not desired and exists(select from public.field_orders f left join public.photo_properties p on p.id=f.photo_id
      where not f.velocity and not f.complete and f.list_name is null and not f.former_list_task and private.inspection_address_key(f.address)=k
      and p.completed_at is null and p.archived_at is null) then continue; end if;
    insert into private.inspection_maps_jobs(address_key,address,wanted) values(k,a,desired)
      on conflict(address_key) do update set wanted=excluded.wanted,address=excluded.address,retry_at=now();
  end loop;
  return null;
end $$;

delete from private.inspection_sources s using public.field_orders f where s.order_id=f.id and f.velocity;
select private.remove_velocity_inspection(address) from public.field_orders
where velocity and not complete and list_name is null and not former_list_task;
