-- Only synthetic metadata inside a rollback. Production byte deletion uses Storage API.
begin;
set local storage.allow_delete_query='true';
select set_config('request.jwt.claims','{"sub":"8c3d1560-0eb7-4814-8f27-f24694b788a3","role":"authenticated"}',true);
select set_config('photo_test.id',gen_random_uuid()::text,true);
set local role authenticated;
do $$ declare test_id uuid:=current_setting('photo_test.id')::uuid;begin
 insert into public.photo_properties(id,user_id,address) values(test_id,auth.uid(),'Deletion transactional test '||test_id);
 insert into storage.objects(bucket_id,name,owner) values('property-photos',auth.uid()::text||'/'||test_id||'/test.jpg',auth.uid());
 begin
  perform public.delete_photo_property(test_id,true);raise exception 'Finished without starting';
 exception when raise_exception then if sqlerrm not like 'Start property deletion first%' then raise;end if;end;
 perform public.delete_photo_property(test_id,false);
 if not exists(select 1 from public.photo_properties where photo_properties.id=test_id and deleting_at is not null) then raise exception 'Deletion state not persisted';end if;
 if photo_internal.upload_allowed(test_id::text) then raise exception 'Upload allowed during deletion';end if;
 begin
  insert into storage.objects(bucket_id,name,owner) values('property-photos',auth.uid()::text||'/'||test_id||'/late.jpg',auth.uid());raise exception 'Late upload allowed';
 exception when insufficient_privilege then null;end;
 begin
  perform public.delete_photo_property(test_id,true);raise exception 'Deleted nonempty property';
 exception when raise_exception then if sqlerrm not like 'Photos remain.%' then raise;end if;end;
 if not exists(select 1 from public.photo_properties where photo_properties.id=test_id) then raise exception 'Property disappeared before photos removed';end if;
 if has_table_privilege('authenticated','public.photo_properties','DELETE') or has_column_privilege('authenticated','public.photo_properties','deleting_at','UPDATE') then raise exception 'Unrestricted delete/reset granted';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin
  perform public.delete_photo_property(current_setting('photo_test.id')::uuid,false);raise exception 'Cross-account deletion allowed';
 exception when insufficient_privilege then null;end;
 begin
  perform public.delete_photo_property(current_setting('photo_test.id')::uuid,true);raise exception 'Cross-account finish allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"8c3d1560-0eb7-4814-8f27-f24694b788a3","role":"authenticated"}',true);
set local role authenticated;
do $$ declare test_id uuid:=current_setting('photo_test.id')::uuid;begin
 delete from storage.objects where bucket_id='property-photos' and name=auth.uid()::text||'/'||test_id||'/test.jpg';
 if not found then raise exception 'Owner cannot remove remaining photo';end if;
 perform public.delete_photo_property(test_id,true);
 if exists(select 1 from public.photo_properties where photo_properties.id=test_id) then raise exception 'Empty property not removed';end if;
 insert into public.photo_properties(id,user_id,address) values(test_id,auth.uid(),'Empty deletion test '||test_id);
 perform public.delete_photo_property(test_id,false);
 perform public.delete_photo_property(test_id,true);
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.delete_photo_property(uuid,boolean)','EXECUTE') or has_function_privilege('anon','photo_internal.delete_property(uuid,boolean)','EXECUTE') then raise exception 'Anonymous deletion allowed';end if;
end $$;
select 'PASS: owner deletion, empty/completed-compatible flow, upload blocking, nonempty guard, cross-account and anonymous denial, no direct delete/reset permission' as result;
rollback;
