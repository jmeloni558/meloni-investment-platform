alter table private.outlook_jobs add column create_key uuid;
update private.outlook_jobs set create_key=order_id;
alter table private.outlook_jobs alter column create_key set default gen_random_uuid(), alter column create_key set not null;
create or replace function private.queue_outlook_visit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.appointment is null then
  if tg_op='INSERT' then return new; end if;
  if old.appointment is null then return new; end if;
 end if;
 if tg_op='UPDATE' then
  if (new.appointment,new.appointment_minutes,new.address,new.kind,new.client) is not distinct from
     (old.appointment,old.appointment_minutes,old.address,old.kind,old.client) then return new; end if;
 end if;
 insert into private.outlook_jobs(order_id) values(new.id)
 on conflict(order_id) do update set version=private.outlook_jobs.version+1,retry_at=now(),failures=0,last_error=null;
 perform private.wake_outlook_worker();
 return new;
end $$;
