create table private.completed_photo_exports (
 property_id uuid primary key references public.photo_properties on delete cascade,
 order_id uuid not null references public.field_orders on delete cascade,
 revision uuid not null default gen_random_uuid(), lease uuid, retry_at timestamptz not null default now(),
 exported_at timestamptz, last_error text
);
revoke all on private.completed_photo_exports from public,anon,authenticated;

create function private.queue_completed_photo_export() returns trigger language plpgsql security definer set search_path='' as $$
declare f public.field_orders;
begin
 if new.completed_at is null then
   delete from private.completed_photo_exports where property_id=new.id and exported_at is null;
   return null;
 end if;
 select * into f from public.field_orders where photo_id=new.id and list_name is null and not former_list_task
   and kind in ('Int BPO','Ext BPO','Desktop BPO','Int PCR','Ext PCR','PDCR') and client is not null;
 if not found then return null; end if;
 insert into private.order_folder_jobs(order_id,client,kind,address)
 values(f.id,f.client,f.kind,f.address) on conflict(order_id) do update set lookup_only=false,completed_at=null,retry_at=now()
 where private.order_folder_jobs.folder_url is null;
 insert into private.completed_photo_exports(property_id,order_id) values(new.id,f.id)
 on conflict(property_id) do update set order_id=excluded.order_id,revision=excluded.revision,exported_at=null,retry_at=now(),lease=null,last_error=null;
 return null;
end $$;
create trigger queue_completed_photo_export after update of completed_at on public.photo_properties
 for each row when ((old.completed_at is null) <> (new.completed_at is null)) execute function private.queue_completed_photo_export();

create function public.claim_completed_photo_export(worker_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.completed_photo_exports; result jsonb;
begin
 if not exists(select from private.order_folder_worker where key_hash=sha256(convert_to(worker_key,'UTF8'))) then raise exception 'Invalid worker'; end if;
 select e.* into j from private.completed_photo_exports e join private.order_folder_jobs f using(order_id)
 where e.exported_at is null and e.retry_at<=now() and f.folder_url is not null order by e.retry_at limit 1 for update of e skip locked;
 if not found then return null; end if;
 update private.completed_photo_exports set lease=gen_random_uuid(),retry_at=now()+interval '30 minutes' where property_id=j.property_id returning * into j;
 select jsonb_build_object('lease',j.lease,'revision',j.revision,'folder',f.folder_url,
   'dated',lower(trim(f.client)) in ('rrreview','rrr','amo services','amo'),
   'photos',coalesce((select jsonb_agg(jsonb_build_object('path',o.name,'taken',coalesce(o.user_metadata->>'taken_on',d.taken_on::text),
     'description',l.description,'bytes',o.metadata->>'size')) from storage.objects o left join public.photo_capture_dates d on d.object_id=o.id
     left join public.photo_descriptions l on l.object_id=o.id where o.bucket_id='property-photos'
     and split_part(o.name,'/',1)=p.user_id::text and split_part(o.name,'/',2)=p.id::text),'[]'::jsonb))
 into result from public.photo_properties p join private.order_folder_jobs f on f.order_id=j.order_id where p.id=j.property_id;
 return result;
end $$;
create function public.finish_completed_photo_export(worker_key text,job_lease uuid,failure text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select from private.order_folder_worker where key_hash=sha256(convert_to(worker_key,'UTF8'))) then raise exception 'Invalid worker'; end if;
 update private.completed_photo_exports set exported_at=case when failure is null then now() end,last_error=left(failure,220),
 lease=null,retry_at=now()+interval '10 minutes' where lease=job_lease;
end $$;
revoke all on function private.queue_completed_photo_export(),public.claim_completed_photo_export(text),public.finish_completed_photo_export(text,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_completed_photo_export(text),public.finish_completed_photo_export(text,uuid,text) to anon;
