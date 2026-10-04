-- Reviewable schema candidate. No scheduler or customer sends are enabled by this file.
begin;
create schema if not exists onboarding_private;
revoke all on schema onboarding_private from public, anon, authenticated;
grant usage on schema onboarding_private to service_role;

create table onboarding_private.settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  enroll_after timestamptz not null default now()
);
insert into onboarding_private.settings default values;
create table onboarding_private.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  tips boolean not null default false,
  consent_version text,
  consent_at timestamptz,
  joined_at timestamptz not null default now(),
  next_step integer not null default 0 check(next_step between 0 and 7),
  next_due timestamptz not null default now(),
  stopped_at timestamptz,
  stop_reason text,
  unsubscribe_token text not null unique default (gen_random_uuid()::text || gen_random_uuid()::text)
);
create table onboarding_private.deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references onboarding_private.members(user_id) on delete cascade,
  step integer not null check(step between 0 and 6),
  status text not null default 'claimed' check(status in ('claimed','accepted','failed','uncertain','cancelled')),
  claimed_at timestamptz not null default now(),
  finished_at timestamptz,
  provider_id text,
  unique(user_id,step)
);
create index onboarding_due on onboarding_private.members(next_due) where stopped_at is null and next_step < 7;
create index onboarding_email on onboarding_private.members(lower(email));
alter table onboarding_private.settings enable row level security;
alter table onboarding_private.members enable row level security;
alter table onboarding_private.deliveries enable row level security;
grant select,insert,update,delete on all tables in schema onboarding_private to service_role;

-- Internal Auth trigger only. Recipient always comes from the verified Auth record.
-- User metadata is a preference, never an authorization or entitlement claim.
create function onboarding_private.enroll_verified() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null or new.email is null or new.is_anonymous is true
     or new.deleted_at is not null or new.email like '%.invalid' then return new; end if;
  if tg_op='UPDATE' and old.email_confirmed_at is not null then
    if old.email is distinct from new.email then
      update onboarding_private.members set stopped_at=now(),stop_reason='email_changed' where user_id=new.id;
    end if;
    return new;
  end if;
  if not exists(select 1 from onboarding_private.settings where enabled and new.created_at >= enroll_after) then return new; end if;
  insert into onboarding_private.members(user_id,email,tips,consent_version,consent_at)
  values(new.id,new.email,
    coalesce(new.raw_user_meta_data->>'website_tips_consent'='welcome-tips-v1',false),
    case when new.raw_user_meta_data->>'website_tips_consent'='welcome-tips-v1' then 'welcome-tips-v1' end,
    case when new.raw_user_meta_data->>'website_tips_consent'='welcome-tips-v1' then now() end)
  on conflict(user_id) do nothing;
  return new;
end $$;
revoke all on function onboarding_private.enroll_verified() from public,anon,authenticated;
create trigger propertythesis_onboarding_verified after insert or update of email_confirmed_at,email on auth.users
for each row execute function onboarding_private.enroll_verified();

-- Service-only RPCs use invoker privileges. Private tables are never exposed to browser users.
create function public.onboarding_claim() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare m onboarding_private.members; d onboarding_private.deliveries;
begin
  if not exists(select 1 from onboarding_private.settings where enabled) then return null; end if;
  -- Never reclaim an uncertain provider send. It needs provider reconciliation.
  update onboarding_private.deliveries set status='uncertain',finished_at=now()
    where status='claimed' and claimed_at < now()-interval '10 minutes';
  select * into m from onboarding_private.members m0 where m0.stopped_at is null
    and m0.next_due <= now() and m0.next_step < 7 and (m0.next_step=0 or m0.tips)
    and not exists(select 1 from onboarding_private.deliveries d0 where d0.user_id=m0.user_id and d0.step=m0.next_step)
    order by m0.next_due for update skip locked limit 1;
  if not found then return null; end if;
  insert into onboarding_private.deliveries(user_id,step) values(m.user_id,m.next_step) returning * into d;
  return jsonb_build_object('id',d.id,'user_id',m.user_id,'email',m.email,'step',m.next_step,'tips',m.tips,'token',m.unsubscribe_token);
end $$;

create function public.onboarding_can_send(p_id uuid) returns boolean
language sql security invoker set search_path = '' as $$
  select exists(select 1 from onboarding_private.deliveries d join onboarding_private.members m on m.user_id=d.user_id
    where d.id=p_id and d.status='claimed' and d.claimed_at>now()-interval '5 minutes'
    and m.stopped_at is null and (d.step=0 or m.tips)
    and exists(select 1 from onboarding_private.settings where enabled));
$$;

create function public.onboarding_finish(p_id uuid,p_status text,p_provider_id text default null) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare d onboarding_private.deliveries;
begin
  if p_status not in ('accepted','failed','uncertain','cancelled') then raise exception 'Invalid status'; end if;
  select * into d from onboarding_private.deliveries where id=p_id for update;
  if not found or d.status<>'claimed' then return false; end if;
  update onboarding_private.deliveries set status=p_status,provider_id=p_provider_id,finished_at=now() where id=p_id;
  if p_status='accepted' then
    update onboarding_private.members set next_step=case when tips then d.step+1 else 7 end,
      next_due=now()+interval '7 days' where user_id=d.user_id;
  end if;
  return true;
end $$;

create function public.onboarding_unsubscribe(p_token text) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  if length(p_token)<>72 then return false; end if;
  update onboarding_private.members set stopped_at=coalesce(stopped_at,now()),stop_reason='unsubscribed',tips=false
    where unsubscribe_token=p_token;
  return found;
end $$;

create function public.onboarding_suppress(p_email text) returns void
language sql security invoker set search_path = '' as $$
  update onboarding_private.members set stopped_at=coalesce(stopped_at,now()),stop_reason='provider_suppression',tips=false
  where lower(email)=lower(p_email);
$$;

revoke all on function public.onboarding_claim(), public.onboarding_can_send(uuid), public.onboarding_finish(uuid,text,text),
  public.onboarding_unsubscribe(text), public.onboarding_suppress(text) from public,anon,authenticated;
grant execute on function public.onboarding_claim(), public.onboarding_can_send(uuid), public.onboarding_finish(uuid,text,text),
  public.onboarding_unsubscribe(text), public.onboarding_suppress(text) to service_role;
commit;
