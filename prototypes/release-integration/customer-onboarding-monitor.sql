-- Add-on after customer-onboarding.sql. Alerts disabled by default.
begin;
alter table onboarding_private.settings add column alerts_enabled boolean not null default false;
create table onboarding_private.alerts (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 counts jsonb not null,
 status text not null default 'claimed' check(status in ('claimed','accepted','failed','uncertain')),
 provider_id text
);
alter table onboarding_private.alerts enable row level security;
revoke all on onboarding_private.alerts from public,anon,authenticated;
grant select,insert,update on onboarding_private.alerts to service_role;
create function public.onboarding_claim_alert() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare metrics jsonb; a onboarding_private.alerts;
begin
 perform 1 from onboarding_private.settings where alerts_enabled for update;
 if not found then return null; end if;
 select jsonb_build_object(
  'failed',count(*) filter(where status='failed'),
  'uncertain',count(*) filter(where status='uncertain'),
  'stale_claims',count(*) filter(where status='claimed' and claimed_at<now()-interval '10 minutes')
 ) into metrics from onboarding_private.deliveries;
 metrics:=metrics||jsonb_build_object('overdue',(select count(*) from onboarding_private.members
   where exists(select 1 from onboarding_private.settings where enabled)
   and stopped_at is null and next_step<7 and (next_step=0 or tips) and next_due<now()-interval '1 hour'));
 if not exists(select 1 from jsonb_each_text(metrics) where value::bigint>0) then return null; end if;
 -- Serialize and limit to one attempt per day, including uncertain alert sends.
 if exists(select 1 from onboarding_private.alerts where created_at>now()-interval '24 hours') then return null; end if;
 insert into onboarding_private.alerts(counts) values(metrics) returning * into a;
 return jsonb_build_object('id',a.id,'counts',metrics);
end $$;
create function public.onboarding_finish_alert(p_id uuid,p_status text,p_provider_id text default null) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 if p_status not in ('accepted','failed','uncertain') then raise exception 'Invalid status'; end if;
 update onboarding_private.alerts set status=p_status,provider_id=p_provider_id where id=p_id and status='claimed';
 return found;
end $$;
revoke all on function public.onboarding_claim_alert(), public.onboarding_finish_alert(uuid,text,text) from public,anon,authenticated;
grant execute on function public.onboarding_claim_alert(), public.onboarding_finish_alert(uuid,text,text) to service_role;
commit;
-- Scheduler template (install separately after secret setup and approval):
-- POST /functions/v1/customer-onboarding/monitor every 15 minutes using the
-- private Vault sender secret, gated on alerts_enabled (not customer enabled).
-- Alerts use the email provider too: provider or DB outages can prevent them.
-- Retain an independent provider/dashboard check; this is not an uptime monitor.
