create table private.inspection_maps_config(singleton boolean primary key default true check(singleton), list_url text not null, google_account text not null, list_name text not null);
create table private.inspection_sources(order_id uuid primary key references public.field_orders on delete cascade,photo_id uuid not null,address text not null,address_key text not null,active boolean not null);
create index inspection_sources_photo on private.inspection_sources(photo_id);
create index inspection_sources_address on private.inspection_sources(address_key) where active;
create table private.inspection_maps_jobs(address_key text primary key,address text not null,wanted boolean not null,applied boolean not null default false,
 lease uuid,lease_until timestamptz,retry_at timestamptz not null default now(),last_error text);
revoke all on private.inspection_maps_config,private.inspection_sources,private.inspection_maps_jobs from public,anon,authenticated;

create function private.queue_inspection_place() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; a text; desired boolean;
begin
 for k,a in select distinct x.key,x.addr from (values
   (case when tg_op<>'INSERT' then old.address_key end,case when tg_op<>'INSERT' then old.address end),
   (case when tg_op<>'DELETE' then new.address_key end,case when tg_op<>'DELETE' then new.address end)) x(key,addr)
   where x.key is not null order by x.key loop
   perform pg_advisory_xact_lock(hashtextextended(k,1532));
   select exists(select from private.inspection_sources where address_key=k and active) into desired;
   insert into private.inspection_maps_jobs(address_key,address,wanted) values(k,a,desired)
     on conflict(address_key) do update set wanted=excluded.wanted,address=excluded.address,retry_at=now(),last_error=null;
 end loop;
 return null;
end $$;
create trigger inspection_source_change after insert or update or delete on private.inspection_sources
for each row execute function private.queue_inspection_place();

create function private.track_inspection_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.needs_photos and new.photo_id is not null and new.list_name is null and (tg_op='INSERT' or not old.needs_photos or exists(select from private.inspection_sources where order_id=new.id)) then
   insert into private.inspection_sources
     select new.id,p.id,new.address,private.order_address_key(regexp_replace(new.address,'\s*(#|apt\.?\s+|unit\s+)[a-z0-9-]+',' ','i')),
       p.completed_at is null and p.archived_at is null from public.photo_properties p where p.id=new.photo_id
   on conflict(order_id) do update set photo_id=excluded.photo_id,address=excluded.address,address_key=excluded.address_key,active=excluded.active;
 elsif tg_op='UPDATE' then delete from private.inspection_sources where order_id=new.id;
 end if;
 return null;
end $$;
create trigger inspection_order_change after insert or update of needs_photos,photo_id,address,list_name on public.field_orders for each row execute function private.track_inspection_order();
create function private.track_inspection_photos() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update private.inspection_sources set active=(new.completed_at is null and new.archived_at is null)
 where photo_id=new.id and active is distinct from (new.completed_at is null and new.archived_at is null);
 return null;
end $$;
create trigger inspection_photos_change after update of completed_at,archived_at on public.photo_properties for each row execute function private.track_inspection_photos();

create function public.claim_inspection_place() returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.inspection_maps_jobs; cfg private.inspection_maps_config;
begin
 if not exists(select from public.order_members where user_id=(select auth.uid())) then raise exception 'Dashboard access required'; end if;
 select * into cfg from private.inspection_maps_config; if not found then return null; end if;
 select * into j from private.inspection_maps_jobs where (wanted<>applied or last_error is not null or lease is not null) and retry_at<=now()
   and coalesce(lease_until,'-infinity')<=now() order by retry_at,address_key limit 1 for update skip locked;
 if not found then return null; end if;
 update private.inspection_maps_jobs set lease=gen_random_uuid(),lease_until=now()+interval '5 minutes' where address_key=j.address_key returning * into j;
 return jsonb_build_object('lease',j.lease,'address',j.address,'wanted',j.wanted,'listUrl',cfg.list_url,'account',cfg.google_account,'listName',cfg.list_name);
end $$;
create function public.finish_inspection_place(job_lease uuid, observed boolean, failure text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select from public.order_members where user_id=(select auth.uid())) then raise exception 'Dashboard access required'; end if;
 update private.inspection_maps_jobs set lease=null,lease_until=null,
   applied=case when failure is null then observed else applied end,last_error=left(failure,180),
   retry_at=case when failure is null then now() else now()+interval '5 minutes' end where lease=job_lease;
end $$;
revoke all on function private.queue_inspection_place(),private.track_inspection_order(),private.track_inspection_photos(),public.claim_inspection_place(),public.finish_inspection_place(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_inspection_place(),public.finish_inspection_place(uuid,boolean,text) to authenticated;
