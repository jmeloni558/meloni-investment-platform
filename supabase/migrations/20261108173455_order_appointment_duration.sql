alter table public.field_orders add column appointment_minutes integer not null default 60 check (appointment_minutes > 0);
drop function public.read_order_appointments(uuid);
create function public.read_order_appointments(feed_key uuid) returns table(id uuid,address text,kind text,client text,appointment timestamptz,updated_at timestamptz,appointment_minutes integer)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select from private.order_calendar_keys where token=feed_key) then raise exception 'Invalid calendar'; end if;
 return query select f.id,f.address,f.kind,f.client,f.appointment,f.updated_at,f.appointment_minutes from public.field_orders f where f.appointment is not null;
end $$;
revoke all on function public.read_order_appointments(uuid) from public,anon,authenticated;
grant execute on function public.read_order_appointments(uuid) to service_role;
