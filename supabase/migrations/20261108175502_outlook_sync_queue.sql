create table private.outlook_calendar_connection (
 singleton boolean primary key default true check(singleton),
 tenant text not null, client_id text not null, calendar_id text not null,
 refresh_secret uuid not null references vault.secrets(id)
);
create table private.outlook_jobs (
 order_id uuid primary key references public.field_orders on delete cascade,
 version bigint not null default 1, done bigint not null default 0,
 event_id text, retry_at timestamptz not null default now(), failures integer not null default 0,
 last_error text
);
revoke all on private.outlook_calendar_connection,private.outlook_jobs from public,anon,authenticated;
create function private.wake_outlook_worker() returns void language plpgsql security definer set search_path='' as $$
declare bearer text;
begin
 if not exists(select from private.outlook_calendar_connection) or
    not exists(select from private.outlook_jobs where done<version and retry_at<=clock_timestamp()) then return; end if;
 select decrypted_secret into bearer from vault.decrypted_secrets where name='pt_outlook_dispatch';
 if bearer is not null then
  perform net.http_post(url:='https://lmaiqpkogmmsldkziggy.supabase.co/functions/v1/outlook-write',
   headers:=jsonb_build_object('Authorization','Bearer '||bearer,'Content-Type','application/json'),body:='{}'::jsonb,timeout_milliseconds:=60000);
 end if;
end $$;
create function private.queue_outlook_visit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.appointment is null then return new; end if;
 if tg_op='UPDATE' then
  if (new.appointment,new.appointment_minutes,new.address,new.kind,new.client) is not distinct from
     (old.appointment,old.appointment_minutes,old.address,old.kind,old.client) then return new; end if;
 end if;
 insert into private.outlook_jobs(order_id) values(new.id)
 on conflict(order_id) do update set version=private.outlook_jobs.version+1,retry_at=now(),failures=0,last_error=null;
 perform private.wake_outlook_worker();
 return new;
end $$;
revoke all on function private.queue_outlook_visit(),private.wake_outlook_worker() from public,anon,authenticated;
create trigger queue_outlook_visit after insert or update of appointment,appointment_minutes,address,kind,client on public.field_orders
for each row execute function private.queue_outlook_visit();
select cron.schedule('pt-outlook-retry','* * * * *','select private.wake_outlook_worker()');
