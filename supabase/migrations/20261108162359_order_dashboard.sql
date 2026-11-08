create schema if not exists private;
create table public.order_members (
  user_id uuid primary key references auth.users on delete cascade,
  photo_owner uuid not null references auth.users
);
insert into public.order_members
select u.id, owner.id from auth.users u cross join auth.users owner
where owner.email='jamie@melonirealty.com' and owner.email_confirmed_at is not null
and u.email in ('jamie@melonirealty.com','jamiemeloni2012@gmail.com') and u.email_confirmed_at is not null;
alter table public.order_members enable row level security;
revoke all on public.order_members from public,anon,authenticated;
grant select on public.order_members to authenticated;
create policy own_membership on public.order_members for select to authenticated using(user_id=(select auth.uid()));

create table public.order_clients(name text primary key check(length(trim(name)) between 1 and 160));
create unique index order_clients_name_folded on public.order_clients(lower(name));
create table public.field_orders(
 id uuid primary key, address text not null check(length(trim(address)) between 1 and 500),
 kind text not null check(kind in ('Int BPO','Ext BPO','Int PCR','Ext PCR','PDCR','Desktop BPO','Marketing Photos','Inspection Photos')),
 client text not null references public.order_clients(name), due date not null,
 notes text not null default '', appointment timestamptz, needs_photos boolean not null default false,
 photo_id uuid unique references public.photo_properties(id) on delete set null,
 complete boolean not null default false, updated_at timestamptz not null default now()
);
alter table public.field_orders enable row level security;
alter table public.order_clients enable row level security;
revoke all on public.field_orders,public.order_clients from public,anon,authenticated;
grant select on public.field_orders,public.order_clients to authenticated;
grant insert(id,address,kind,client,due,notes,appointment,needs_photos),update(client,due,notes,appointment,complete) on public.field_orders to authenticated;
grant insert(name) on public.order_clients to authenticated;
create policy member_orders on public.field_orders to authenticated using(exists(select from public.order_members)) with check(exists(select from public.order_members));
create policy member_clients on public.order_clients to authenticated using(exists(select from public.order_members)) with check(exists(select from public.order_members));

-- A repeat assignment gets a fresh set. Address-only creation keeps its original uniqueness.
alter table public.photo_properties add column dashboard_set boolean not null default false;
drop index public.photo_properties_address;
create unique index photo_properties_address on public.photo_properties(user_id,lower(regexp_replace(trim(address),'\s+',' ','g'))) where not dashboard_set;
create function private.field_order_photos() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if tg_op='INSERT' and new.needs_photos then
   select photo_owner into strict owner_id from public.order_members where user_id=auth.uid();
   insert into public.photo_properties(user_id,address,dashboard_set) values(owner_id,new.address,true) returning id into new.photo_id;
 elsif tg_op='UPDATE' and new.complete and not old.complete and new.photo_id is not null then
   update public.photo_properties set completed_at=coalesce(completed_at,now()), archived_at=coalesce(archived_at,now()) where id=new.photo_id;
 end if;
 new.updated_at=clock_timestamp();
 return new;
end $$;
revoke all on function private.field_order_photos() from public,anon,authenticated;
create trigger field_order_photos before insert or update on public.field_orders for each row execute function private.field_order_photos();

create table private.order_calendar_keys(member_id uuid primary key references public.order_members on delete cascade, token uuid not null unique default gen_random_uuid());
create function public.order_calendar_key() returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not exists(select from public.order_members where user_id=auth.uid()) then raise exception 'Dashboard access required'; end if;
 insert into private.order_calendar_keys(member_id) values(auth.uid()) on conflict(member_id) do nothing;
 select token into result from private.order_calendar_keys where member_id=auth.uid();
 return result;
end $$;
revoke all on function public.order_calendar_key() from public,anon;
grant execute on function public.order_calendar_key() to authenticated;
create function public.read_order_appointments(feed_key uuid) returns table(id uuid,address text,kind text,client text,appointment timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select from private.order_calendar_keys where token=feed_key) then raise exception 'Invalid calendar'; end if;
 return query select f.id,f.address,f.kind,f.client,f.appointment,f.updated_at from public.field_orders f where f.appointment is not null;
end $$;
revoke all on function public.read_order_appointments(uuid) from public,anon,authenticated;
grant execute on function public.read_order_appointments(uuid) to service_role;
insert into public.order_clients(name) values ('AMO Services'),('Applied Valuation Services'),('Appraisal Scout'),('Ascribe - Formerly LRES'),('Asset Valuation Solutions'),('Beacon PDC'),('Class Valuation'),('Clear Capital'),('Computershare Asset Mgmt'),('Consolidated Analytics'),('eMerge Property Solutions'),('eStreet Appraisal Mgmt'),('Financial Asset Services'),('Financial Dimensions'),('First American'),('Fox 1 Financial'),('Granite Risk Mgmt'),('Groundworks'),('Guardian Asset Mgmt'),('HomeGenius'),('I Buy Homes.Com'),('Insource Financial'),('Loan Officers'),('National Asset Mgmt Group'),('NVMS'),('Omnia Real Estate Services'),('Other'),('PCV Murcor'),('Proxy Pics'),('Realtors'),('REO America'),('ResidX'),('RRReview'),('Service Link - EXOS'),('Single Source'),('Springhouse Valuations - Altisource'),('Spurs Capital'),('Stewart Valuation'),('Think Lattice - Formerly SWBC'),('USA Valuation Services'),('Valligent'),('Valor Valuations'),('Valuation Connect');
