alter table public.field_orders add column fee numeric(12,2) check(fee >= 0 and fee <> 'NaN'::numeric);
grant insert(fee),update(fee) on public.field_orders to authenticated;
