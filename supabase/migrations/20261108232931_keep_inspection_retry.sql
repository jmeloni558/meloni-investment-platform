-- Preserve uncertain Maps changes until a subsequent read confirms the final state.
create or replace function private.queue_inspection_place() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; a text; desired boolean;
begin
 for k,a in select distinct x.key,x.addr from (values
   (case when tg_op<>'INSERT' then old.address_key end,case when tg_op<>'INSERT' then old.address end),
   (case when tg_op<>'DELETE' then new.address_key end,case when tg_op<>'DELETE' then new.address end)) x(key,addr)
   where x.key is not null order by x.key loop
   perform pg_advisory_xact_lock(hashtextextended(k,1532));
   select exists(select from private.inspection_sources where address_key=k and active) into desired;
   insert into private.inspection_maps_jobs(address_key,address,wanted) values(k,a,desired)
     on conflict(address_key) do update set wanted=excluded.wanted,address=excluded.address,retry_at=now();
 end loop;
 return null;
end $$;
create or replace function public.finish_inspection_place(job_lease uuid, observed boolean, failure text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select from public.order_members where user_id=(select auth.uid())) then raise exception 'Dashboard access required'; end if;
 update private.inspection_maps_jobs set lease=null,lease_until=null,
   applied=case when failure is null then observed else applied end,last_error=left(failure,180),
   retry_at=case when failure is null then now() when failure='Google Maps has not confirmed the change.' then now()+interval '30 seconds' else now()+interval '5 minutes' end where lease=job_lease;
end $$;
