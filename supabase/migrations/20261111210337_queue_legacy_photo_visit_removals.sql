create or replace function private.track_inspection_photos() returns trigger
language plpgsql security definer set search_path='' as $$
declare visit_open boolean := new.completed_at is null and new.archived_at is null;
begin
  update private.inspection_sources set active=visit_open
  where photo_id=new.id and active is distinct from visit_open;
  if not visit_open and old.completed_at is null and old.archived_at is null then
    -- A manually saved pin can predate enrollment in inspection_sources.
    perform private.remove_velocity_inspection(f.address)
    from public.field_orders f
    where f.photo_id=new.id and not f.complete and f.list_name is null and not f.former_list_task
    order by private.inspection_address_key(f.address);
  end if;
  return null;
end $$;
