create table public.order_lists(
  name text primary key check(name=btrim(name) and length(name) between 1 and 80)
);
create unique index order_lists_folded on public.order_lists(lower(name));
alter table public.order_lists enable row level security;
revoke all on public.order_lists from public,anon,authenticated;
grant select,insert(name) on public.order_lists to authenticated;
create policy member_lists on public.order_lists to authenticated
using(exists(select from public.order_members)) with check(exists(select from public.order_members));
alter table public.field_orders add column list_name text references public.order_lists(name);
grant insert(list_name),update(list_name) on public.field_orders to authenticated;
alter table public.field_orders drop constraint field_orders_native_fields,
  add constraint field_orders_native_fields check (
    list_name is not null or todo_title is not null or
    (due is not null and client is not null and kind is not null and
     kind in ('Int BPO','Ext BPO','Int PCR','Ext PCR','PDCR','Desktop BPO','Marketing Photos','Inspection Photos'))
  );
