create table private.qbo_connection (
 singleton boolean primary key default true check(singleton),
 refresh_secret uuid not null, activated_at timestamptz not null default now()
);
create table private.qbo_states (state uuid primary key, expires_at timestamptz not null);
alter table private.qbo_invoice_requests add column payload jsonb,
 add column next_attempt timestamptz not null default now(), add column error_code text;
revoke all on private.qbo_connection,private.qbo_states from public,anon,authenticated;
select vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'pt_qbo_dispatch');
create function private.wake_qbo_worker() returns void language plpgsql security definer set search_path='' as $$
declare bearer text;
begin
 if not exists(select from private.qbo_invoice_requests r join private.qbo_connection c on r.created_at>=c.activated_at
  where r.invoice_id is null and r.next_attempt<=now()) then return; end if;
 select decrypted_secret into strict bearer from vault.decrypted_secrets where name='pt_qbo_dispatch';
 perform net.http_post(url:='https://lmaiqpkogmmsldkziggy.supabase.co/functions/v1/qbo?worker=1',
 headers:=jsonb_build_object('Authorization','Bearer '||bearer),body:='{}'::jsonb,timeout_milliseconds:=60000);
end $$;
revoke all on function private.wake_qbo_worker() from public,anon,authenticated;
select cron.schedule('pt-qbo-invoices','* * * * *','select private.wake_qbo_worker()');
