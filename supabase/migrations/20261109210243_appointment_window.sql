alter table public.field_orders add column appointment_window boolean not null default false;
grant insert (appointment_window, appointment_minutes), update (appointment_window, appointment_minutes)
  on public.field_orders to authenticated;

-- Outlook and older clients can clear a visit without sending the window flag.
create function private.clear_appointment_window() returns trigger
language plpgsql set search_path='' as $$
begin
  new.appointment_window := false;
  return new;
end $$;
create trigger clear_appointment_window before insert or update of appointment,appointment_window on public.field_orders
for each row when (new.appointment is null and new.appointment_window)
execute function private.clear_appointment_window();
