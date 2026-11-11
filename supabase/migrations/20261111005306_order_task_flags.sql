alter table public.field_orders
  add column vacant boolean not null default false,
  add column velocity boolean not null default false;

grant insert (vacant, velocity), update (vacant, velocity)
  on public.field_orders to authenticated;
