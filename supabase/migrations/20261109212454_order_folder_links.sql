alter table private.order_folder_jobs add column folder_url text, add column lookup_only boolean not null default false;
update private.order_folder_jobs set completed_at=null,lookup_only=true,retry_at=now() where completed_at is not null;
create or replace function public.next_order_folder(worker_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare job private.order_folder_jobs;
begin
  if not exists(select from private.order_folder_worker where key_hash=pg_catalog.sha256(pg_catalog.convert_to(worker_key,'UTF8'))) then raise exception 'Invalid worker'; end if;
  select * into job from private.order_folder_jobs where completed_at is null and retry_at<=now() order by retry_at,order_id limit 1 for update skip locked;
  if not found then return null; end if;
  update private.order_folder_jobs set retry_at=now()+interval '5 minutes' where order_id=job.order_id;
  return jsonb_build_object('id',job.order_id,'client',job.client,'kind',job.kind,'address',job.address,'lookup_only',job.lookup_only);
end $$;

create function public.record_order_folder(worker_key text,job_id uuid,folder_link text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select from private.order_folder_worker where key_hash=pg_catalog.sha256(pg_catalog.convert_to(worker_key,'UTF8'))) then raise exception 'Invalid worker'; end if;
  update private.order_folder_jobs set folder_url=folder_link,completed_at=now(),last_error=null where order_id=job_id and (folder_link is not null or lookup_only);
end $$;

create function public.desktop_order_folder(job_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.order_folder_jobs;
begin
  if not exists(select from public.order_members where user_id=auth.uid()) then raise exception 'Dashboard access required'; end if;
  insert into private.order_folder_jobs(order_id,client,kind,address,lookup_only)
    select id,client,kind,address,true from public.field_orders where id=job_id and client is not null and kind in ('Int BPO','Ext BPO','Desktop BPO','Int PCR','Ext PCR','PDCR') and list_name is null and not former_list_task
    on conflict do nothing;
  select * into j from private.order_folder_jobs where order_id=job_id;
  if not found then return null; end if;
  if j.lookup_only and j.completed_at < now()-interval '1 hour' and j.folder_url is null then
    update private.order_folder_jobs set completed_at=null,retry_at=now() where order_id=job_id;
    j.completed_at:=null;
  end if;
  return jsonb_build_object('url',j.folder_url,'pending',j.completed_at is null);
end $$;
revoke all on function public.record_order_folder(text,uuid,text),public.desktop_order_folder(uuid) from public,anon,authenticated;
grant execute on function public.desktop_order_folder(uuid) to authenticated;
grant execute on function public.record_order_folder(text,uuid,text) to anon;

insert into private.order_folder_jobs(order_id,client,kind,address,lookup_only)
select id,client,kind,address,true from public.field_orders where not complete and list_name is null and not former_list_task and client is not null and kind in ('Int BPO','Ext BPO','Desktop BPO','Int PCR','Ext PCR','PDCR') on conflict do nothing;
