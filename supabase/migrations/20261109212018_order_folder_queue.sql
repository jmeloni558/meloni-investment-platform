create table private.order_folder_jobs (
  order_id uuid primary key references public.field_orders(id) on delete cascade,
  client text not null, kind text not null, address text not null,
  retry_at timestamptz not null default now(), completed_at timestamptz, last_error text
);
create table private.order_folder_worker (key_hash bytea primary key);
revoke all on private.order_folder_jobs, private.order_folder_worker from public, anon, authenticated;

create function private.queue_order_folder() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into private.order_folder_jobs(order_id,client,kind,address) values(new.id,new.client,new.kind,new.address);
  return null;
end $$;
create trigger queue_new_order_folder after insert on public.field_orders for each row
when (new.list_name is null and not new.former_list_task and not new.complete and new.client is not null
  and new.kind in ('Int BPO','Ext BPO','Desktop BPO','Int PCR','Ext PCR','PDCR'))
execute function private.queue_order_folder();

create function public.next_order_folder(worker_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare job private.order_folder_jobs;
begin
  if not exists(select from private.order_folder_worker where key_hash=pg_catalog.sha256(pg_catalog.convert_to(worker_key,'UTF8'))) then raise exception 'Invalid worker'; end if;
  select * into job from private.order_folder_jobs where completed_at is null and retry_at<=now() order by retry_at,order_id limit 1 for update skip locked;
  if not found then return null; end if;
  update private.order_folder_jobs set retry_at=now()+interval '5 minutes' where order_id=job.order_id;
  return jsonb_build_object('id',job.order_id,'client',job.client,'kind',job.kind,'address',job.address);
end $$;
create function public.finish_order_folder(worker_key text,job_id uuid,failure text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select from private.order_folder_worker where key_hash=pg_catalog.sha256(pg_catalog.convert_to(worker_key,'UTF8'))) then raise exception 'Invalid worker'; end if;
  update private.order_folder_jobs set completed_at=case when failure is null then now() end,last_error=left(failure,240),
    retry_at=now()+interval '10 minutes' where order_id=job_id and completed_at is null;
end $$;
revoke all on function private.queue_order_folder(),public.next_order_folder(text),public.finish_order_folder(text,uuid,text) from public,anon,authenticated;
grant execute on function public.next_order_folder(text),public.finish_order_folder(text,uuid,text) to anon;
