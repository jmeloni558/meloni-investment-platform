create table private.bpo_setup_tickets(
 ticket uuid primary key default gen_random_uuid(),
 expires_at timestamptz not null default now()+interval '90 seconds'
);
revoke all on private.bpo_setup_tickets from public,anon,authenticated;
create function public.issue_bpo_setup_ticket() returns uuid
language plpgsql security definer set search_path='' as $$
declare t uuid;
begin
 if not exists(select from public.order_members where user_id=auth.uid()) then raise exception 'Dashboard access required'; end if;
 delete from private.bpo_setup_tickets where expires_at<=now();
 insert into private.bpo_setup_tickets default values returning ticket into t;
 return t;
end $$;
create function public.take_bpo_setup_ticket(worker_key text,open_ticket uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t uuid; orders jsonb;
begin
 if not exists(select from private.order_folder_worker where key_hash=pg_catalog.sha256(pg_catalog.convert_to(worker_key,'UTF8'))) then raise exception 'Invalid worker'; end if;
 delete from private.bpo_setup_tickets where ticket=open_ticket and expires_at>now() returning ticket into t;
 if t is null then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'address',f.address,'client',f.client,'kind',f.kind,'folder_url',j.folder_url) order by f.due,f.id),'[]'::jsonb) into orders
 from public.field_orders f left join private.order_folder_jobs j on j.order_id=f.id
 where not f.complete and f.list_name is null and not f.former_list_task
 and f.kind in ('Int BPO','Ext BPO','Interior BPO','Exterior BPO','Desktop BPO');
 return orders;
end $$;
revoke all on function public.issue_bpo_setup_ticket(),public.take_bpo_setup_ticket(text,uuid) from public,anon,authenticated;
grant execute on function public.issue_bpo_setup_ticket() to authenticated;
grant execute on function public.take_bpo_setup_ticket(text,uuid) to anon;
