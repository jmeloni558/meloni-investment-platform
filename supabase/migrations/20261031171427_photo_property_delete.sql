-- Photo bytes must be removed through Storage API before removing their parent.
alter table public.photo_properties add column deleting_at timestamptz;
create schema if not exists photo_internal;
revoke all on schema photo_internal from public,anon;
grant usage on schema photo_internal to authenticated;

-- Serialize upload metadata commits against the start of property deletion.
create function photo_internal.upload_allowed(property_id text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare pending timestamptz;
begin
 if auth.uid() is null or not public.photo_library_enabled() then return false;end if;
 select p.deleting_at into pending from public.photo_properties p
 where p.id::text=property_id and p.user_id=auth.uid() for share;
 return found and pending is null;
end $$;
revoke all on function photo_internal.upload_allowed(text) from public,anon;
grant execute on function photo_internal.upload_allowed(text) to authenticated;
alter policy property_photos_create on storage.objects with check(
 bucket_id='property-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=2
 and photo_internal.upload_allowed((storage.foldername(name))[2])
);

create function photo_internal.delete_property(p_id uuid,p_finish boolean) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare pending timestamptz;
begin
 if auth.uid() is null or not public.photo_library_enabled() then
  raise exception 'Photo library access denied' using errcode='42501';end if;
 select p.deleting_at into pending from public.photo_properties p
 where p.id=p_id and p.user_id=auth.uid() for update;
 if not found then raise exception 'Photo property unavailable' using errcode='42501';end if;
 if not p_finish then
  update public.photo_properties set deleting_at=coalesce(deleting_at,now()) where id=p_id;
  return true;
 end if;
 if pending is null then raise exception 'Start property deletion first';end if;
 if exists(select 1 from storage.objects where bucket_id='property-photos'
  and name like auth.uid()::text||'/'||p_id::text||'/%') then
  raise exception 'Photos remain. Retry Delete property to finish removing them.';end if;
 delete from public.photo_properties where id=p_id and user_id=auth.uid();
 return true;
end $$;
revoke all on function photo_internal.delete_property(uuid,boolean) from public,anon;
grant execute on function photo_internal.delete_property(uuid,boolean) to authenticated;
create function public.delete_photo_property(p_id uuid,p_finish boolean default false) returns boolean
language sql volatile security invoker set search_path='' as $$
 select photo_internal.delete_property(p_id,p_finish);
$$;
revoke all on function public.delete_photo_property(uuid,boolean) from public,anon;
grant execute on function public.delete_photo_property(uuid,boolean) to authenticated;
