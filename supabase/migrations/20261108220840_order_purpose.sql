alter table public.field_orders add column purpose text;
grant insert(purpose), update(purpose) on public.field_orders to authenticated;
