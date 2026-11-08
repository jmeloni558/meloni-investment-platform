alter table public.field_orders add column on_hold boolean not null default false,
  add constraint field_orders_single_status check (not (complete and on_hold));
grant update(on_hold) on public.field_orders to authenticated;
