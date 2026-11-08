alter table public.field_orders add column points_of_contact jsonb not null default '[]'::jsonb
  check (jsonb_typeof(points_of_contact)='array' and jsonb_array_length(points_of_contact)<=2);
grant insert(points_of_contact),update(points_of_contact) on public.field_orders to authenticated;
