alter table public.field_orders add column missing_loe boolean not null default false;
create table private.invoice_loe_jobs (
  order_id uuid primary key references public.field_orders(id) on delete cascade,
  invoice_id text not null,
  next_check timestamptz default now() + interval '5 minutes',
  misses smallint not null default 0,
  lease uuid,
  lease_until timestamptz,
  attachment_id text,
  last_error text
);
revoke all on private.invoice_loe_jobs from public, anon, authenticated;
create function private.queue_invoice_loe() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into private.invoice_loe_jobs(order_id,invoice_id) values(new.order_id,new.invoice_id)
  on conflict(order_id) do nothing;
  return null;
end $$;
revoke all on function private.queue_invoice_loe() from public, anon, authenticated;
create trigger queue_generated_invoice_loe after update of invoice_id on private.qbo_invoice_requests
for each row when (old.invoice_id is null and new.invoice_id is not null and new.payload is not null)
execute function private.queue_invoice_loe();
