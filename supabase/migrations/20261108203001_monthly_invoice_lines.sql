alter table public.field_orders add column invoice_target text check(length(invoice_target) between 1 and 21),
 add column invoice_extra_lines jsonb not null default '[]' check(jsonb_typeof(invoice_extra_lines)='array');
grant insert(invoice_target,invoice_extra_lines) on public.field_orders to authenticated;
alter table private.qbo_invoice_requests drop constraint qbo_invoice_requests_invoice_id_key;
alter table public.order_clients add column monthly_bpo boolean not null default false;
create table private.qbo_monthly_invoices(customer_id text not null,month date not null,invoice_id text not null,primary key(customer_id,month),unique(invoice_id));
revoke all on private.qbo_monthly_invoices from public,anon,authenticated;
grant select(monthly_bpo) on public.order_clients to authenticated;
