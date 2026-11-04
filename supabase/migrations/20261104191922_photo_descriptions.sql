create table public.photo_descriptions (
 object_id uuid primary key references storage.objects(id) on delete cascade,
 property_id uuid not null references public.photo_properties(id) on delete cascade,
 description text not null check (char_length(description) <= 80)
);
create index photo_descriptions_property on public.photo_descriptions(property_id);
alter table public.photo_descriptions enable row level security;
revoke all on public.photo_descriptions from public,anon,authenticated;
grant select,insert on public.photo_descriptions to authenticated;
grant update(description) on public.photo_descriptions to authenticated;
create policy read_own_descriptions on public.photo_descriptions for select to authenticated
 using (exists(select 1 from public.photo_properties p where p.id=property_id));
create policy write_completed_descriptions on public.photo_descriptions for all to authenticated
 using (exists(select 1 from public.photo_properties p where p.id=property_id and p.completed_at is not null and p.deleting_at is null))
 with check (exists(select 1 from storage.objects o join public.photo_properties p on p.id=property_id
 where o.id=object_id and o.bucket_id='property-photos' and split_part(o.name,'/',1)=(select auth.uid())::text
 and split_part(o.name,'/',2)=p.id::text and p.completed_at is not null and p.deleting_at is null));

create function public.get_photo_descriptions(p_property uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(object_id,description),'{}'::jsonb)
 from public.photo_descriptions where property_id=p_property and description<>'';
$$;
create function public.set_photo_description(p_property uuid,p_object uuid,p_description text)
returns void language sql security invoker set search_path='' as $$
 insert into public.photo_descriptions(object_id,property_id,description)
 values(p_object,p_property,btrim(p_description))
 on conflict(object_id) do update set description=excluded.description;
$$;
revoke all on function public.get_photo_descriptions(uuid),public.set_photo_description(uuid,uuid,text) from public,anon;
grant execute on function public.get_photo_descriptions(uuid),public.set_photo_description(uuid,uuid,text) to authenticated;
