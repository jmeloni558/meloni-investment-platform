alter table public.field_orders add column appointment_needed boolean not null default false;
grant insert(appointment_needed),update(appointment_needed) on public.field_orders to authenticated;
