grant update(address,kind) on public.field_orders to authenticated;

-- Keep a corrected address on the same linked set, including its uploaded photos.
create function private.sync_order_photo_address() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.photo_properties set address=new.address where id=new.photo_id;
  return null;
exception when unique_violation then
  raise exception 'A PT Photos set already uses that address. Uncheck Photos needed and save, then check it again to link the matching set.';
end $$;
revoke all on function private.sync_order_photo_address() from public,anon,authenticated;
create trigger sync_order_photo_address after update of address on public.field_orders
for each row when (new.address is distinct from old.address and new.photo_id=old.photo_id)
execute function private.sync_order_photo_address();
