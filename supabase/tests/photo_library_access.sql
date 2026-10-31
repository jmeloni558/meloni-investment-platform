-- Transactional checks: no test properties or access changes persist.
begin;
select set_config('request.jwt.claims','{"sub":"8c3d1560-0eb7-4814-8f27-f24694b788a3","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if not public.photo_library_enabled() then raise exception 'Pilot owner must have access';end if;
end $$;
insert into public.photo_properties(id,user_id,address) values('00000000-0000-4000-8000-000000000001',auth.uid(),'Photo library transactional test');
insert into storage.objects(bucket_id,name,owner) values('property-photos',auth.uid()::text||'/00000000-0000-4000-8000-000000000001/test.jpg',auth.uid());
update public.photo_properties set completed_at=now() where id='00000000-0000-4000-8000-000000000001';
do $$ begin
 if not exists(select 1 from public.photo_properties where id='00000000-0000-4000-8000-000000000001' and completed_at is not null) then raise exception 'Completion not saved';end if;
 if not exists(select 1 from storage.objects where bucket_id='property-photos' and name like '%00000000-0000-4000-8000-000000000001%') then raise exception 'Completed photos not readable';end if;
 begin
  update public.photo_properties set user_id='00000000-0000-4000-8000-000000000002' where id='00000000-0000-4000-8000-000000000001';
  raise exception 'Ownership update allowed';
 exception when insufficient_privilege then null;end;
end $$;
update public.photo_properties set completed_at=null where id='00000000-0000-4000-8000-000000000001';
do $$ begin
 if not exists(select 1 from public.photo_properties where id='00000000-0000-4000-8000-000000000001') then raise exception 'Owner cannot read property';end if;
 begin
  insert into public.photo_properties(user_id,address) values('00000000-0000-4000-8000-000000000002','Wrong owner');
  raise exception 'Cross-account insert allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if public.photo_library_enabled() then raise exception 'Non-pilot access allowed';end if;
 update public.photo_properties set completed_at=now() where id='00000000-0000-4000-8000-000000000001';
 if found then raise exception 'Cross-account completion allowed';end if;
 if exists(select 1 from public.photo_properties where id='00000000-0000-4000-8000-000000000001') then raise exception 'Cross-account read allowed';end if;
 if exists(select 1 from storage.objects where bucket_id='property-photos') then raise exception 'Cross-account photos visible';end if;
 begin
  insert into storage.objects(bucket_id,name) values('property-photos',auth.uid()::text||'/00000000-0000-4000-8000-000000000001/test.jpg');
  raise exception 'Unauthorized photo upload allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.photo_library_access(user_id) values(auth.uid());raise exception 'Self-grant allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.photo_library_access set active=false where user_id='8c3d1560-0eb7-4814-8f27-f24694b788a3';
select set_config('request.jwt.claims','{"sub":"8c3d1560-0eb7-4814-8f27-f24694b788a3","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if public.photo_library_enabled() or exists(select 1 from public.photo_properties) then raise exception 'Revoked account retains access';end if;
 if exists(select 1 from storage.objects where bucket_id='property-photos') then raise exception 'Revoked photo access';end if;
end $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.photo_properties','SELECT') then raise exception 'Anonymous read allowed';end if;
 if exists(select 1 from storage.buckets where id='property-photos' and public) then raise exception 'Photo bucket is public';end if;
end $$;
select 'PASS: address-only create, owner access, cross-account isolation, upload denial, self-grant denial, revocation, private bucket' as result;
rollback;
