alter table private.qbo_invoice_requests add column invoice_number text;

create function public.dashboard_order_invoice(target_order uuid)
returns table(invoice_id text, invoice_number text, pending boolean)
language sql stable security definer set search_path='' as $$
  select r.invoice_id,r.invoice_number,r.invoice_id is null
  from private.qbo_invoice_requests r
  where r.order_id=target_order
    and exists(select from public.order_members m where m.user_id=(select auth.uid()))
    and (r.invoice_id is not null or exists(select from private.qbo_connection c where r.created_at>=c.activated_at));
$$;
revoke all on function public.dashboard_order_invoice(uuid) from public,anon;
grant execute on function public.dashboard_order_invoice(uuid) to authenticated;
