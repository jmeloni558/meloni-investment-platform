create or replace function private.queue_outlook_visit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if current_setting('pt.appointment_origin',true)='outlook' then return new; end if;
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

create function private.pull_outlook_visits() returns void language plpgsql security definer set search_path='' as $$
declare bearer text;
begin
 if not exists(select from private.outlook_jobs where event_id is not null and version=done) then return; end if;
 select decrypted_secret into bearer from vault.decrypted_secrets where name='pt_outlook_dispatch';
 if bearer is not null then
  perform net.http_post(url:='https://lmaiqpkogmmsldkziggy.supabase.co/functions/v1/outlook-write?direction=inbound',
   headers:=jsonb_build_object('Authorization','Bearer '||bearer,'Content-Type','application/json'),body:='{}'::jsonb,timeout_milliseconds:=60000);
 end if;
end $$;
revoke all on function private.pull_outlook_visits() from public,anon,authenticated;
select cron.schedule('pt-outlook-inbound','* * * * *','select private.pull_outlook_visits()');
