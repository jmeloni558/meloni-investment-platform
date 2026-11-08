-- Only new billable orders enter the invoice workflow. No address uniqueness:
-- a repeat assignment at the same address has a different order_id.
create table private.qbo_service_map(
 kind text primary key, product text not null, tag_group text not null, tag_name text not null
);
insert into private.qbo_service_map values
 ('Int BPO','Interior BPO','BPO','Interior BPO'),
 ('Ext BPO','Exterior BPO','BPO','Exterior BPO'),
 ('Desktop BPO','Desktop BPO','BPO','Desktop BPO'),
 ('PDCR','Data Collection Report','Property Inspections','Data Collection Report'),
 ('Int PCR','Int PCR','Property Inspections','Property Condition Report'),
 ('Ext PCR','Ext PCR','Property Inspections','Property Condition Report');
create table private.qbo_customer_matches(
 client text primary key references public.order_clients(name),
 customer_name text not null,
 confirmed boolean not null default false
);
create table private.qbo_invoice_requests(
 order_id uuid primary key references public.field_orders(id),
 created_at timestamptz not null default now(),
 invoice_id text unique
);
revoke all on private.qbo_service_map,private.qbo_customer_matches,private.qbo_invoice_requests from public,anon,authenticated;
create function private.prepare_order_invoice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.list_name is null and not new.complete and new.todo_title is null and new.fee is not null
    and exists(select from private.qbo_service_map where kind=new.kind) then
  insert into private.qbo_invoice_requests(order_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function private.prepare_order_invoice() from public,anon,authenticated;
create trigger prepare_order_invoice after insert on public.field_orders for each row execute function private.prepare_order_invoice();

create view private.qbo_invoice_lines as
 select r.order_id,r.invoice_id,f.client,m.customer_name,m.confirmed,s.product,s.tag_group,s.tag_name,
        f.due as service_date,f.address as description,1 as quantity,f.fee as rate,f.fee as amount
 from private.qbo_invoice_requests r join public.field_orders f on f.id=r.order_id
 join private.qbo_service_map s on s.kind=f.kind
 left join private.qbo_customer_matches m on m.client=f.client
 where f.list_name is null and f.fee is not null;
revoke all on private.qbo_invoice_lines from public,anon,authenticated;
