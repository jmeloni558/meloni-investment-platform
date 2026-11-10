alter table public.field_orders
  add column showingtime_requested boolean not null default false,
  add column showingtime_confirmed boolean not null default false;

grant insert (showingtime_requested, showingtime_confirmed),
      update (showingtime_requested, showingtime_confirmed)
  on public.field_orders to authenticated;
