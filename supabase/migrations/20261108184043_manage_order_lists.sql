alter table public.field_orders
  add column former_list_task boolean not null default false,
  drop constraint field_orders_list_name_fkey,
  add foreign key(list_name) references public.order_lists(name) on update cascade on delete set null,
  drop constraint field_orders_native_fields,
  add constraint field_orders_native_fields check (
    former_list_task or list_name is not null or todo_title is not null or
    (due is not null and client is not null and kind is not null and
     kind in ('Int BPO','Ext BPO','Int PCR','Ext PCR','PDCR','Desktop BPO','Marketing Photos','Inspection Photos'))
  );

-- A title-only task can still be saved on the main dashboard after its list is removed.
create function private.keep_detached_list_task() returns trigger language plpgsql set search_path='' as $$
begin
  new.former_list_task := true;
  return new;
end $$;
revoke all on function private.keep_detached_list_task() from public, anon, authenticated;
create trigger keep_detached_list_task before update of list_name on public.field_orders
for each row when(old.list_name is not null and new.list_name is null)
execute function private.keep_detached_list_task();

grant update(name),delete on public.order_lists to authenticated;
