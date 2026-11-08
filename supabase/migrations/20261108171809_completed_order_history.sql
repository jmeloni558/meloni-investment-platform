alter table public.field_orders
  add column todo_title text,
  add column todo_completed_at timestamptz,
  alter column due drop not null,
  alter column kind drop not null,
  alter column client drop not null,
  drop constraint field_orders_kind_check,
  add constraint field_orders_native_fields check (
    todo_title is not null or (due is not null and client is not null and kind is not null and
    kind in ('Int BPO','Ext BPO','Int PCR','Ext PCR','PDCR','Desktop BPO','Marketing Photos','Inspection Photos'))
  );
create or replace function public.search_field_orders(search_text text)
returns setof public.field_orders
language sql stable security invoker set search_path='' as $$
  select f.* from public.field_orders f
  where length(trim(search_text)) > 0 and not exists (
    select from regexp_split_to_table(lower(trim(search_text)), '[[:space:]]+') term
    where strpos(lower(concat_ws(' ', f.address, f.client, f.kind, f.todo_title, f.notes, f.due::text)),term)=0
  );
$$;
revoke all on function public.search_field_orders(text) from public,anon;
grant execute on function public.search_field_orders(text) to authenticated;

