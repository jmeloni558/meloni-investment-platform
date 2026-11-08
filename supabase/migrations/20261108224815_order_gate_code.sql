alter table public.field_orders add column gate_code text;
grant insert(gate_code), update(gate_code) on public.field_orders to authenticated;
