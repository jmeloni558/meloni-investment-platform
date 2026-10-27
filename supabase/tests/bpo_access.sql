begin;
select set_config('bpo.test.owner',(select user_id::text from public.bpo_access where active limit 1),true);
select set_config('bpo.test.other',(select id::text from auth.users where id not in(select user_id from public.bpo_access) limit 1),true);
select set_config('bpo.test.second',(select user_id::text from public.bpo_access where active and user_id::text<>current_setting('bpo.test.owner') limit 1),true);
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('bpo.test.owner'),'role','authenticated')::text,true);
do $$ begin
 if not public.bpo_enabled() then raise exception 'Owner not enabled';end if;
 insert into public.bpo_reports(id,user_id,address,field_values) values('73110000-0000-4000-8000-000000000001',auth.uid(),'Synthetic BPO isolation test','{"sold.1.price":"300000"}');
 update public.bpo_reports set address='Synthetic BPO updated' where id='73110000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.bpo_reports where id='73110000-0000-4000-8000-000000000001' and revision=2) then raise exception 'Revision failed';end if;
 begin update public.bpo_reports set user_id=current_setting('bpo.test.second')::uuid where id='73110000-0000-4000-8000-000000000001';raise exception 'Ownership reassignment permitted';exception when insufficient_privilege then null;end;
 insert into storage.objects(bucket_id,name,owner) values('bpo-documents',auth.uid()::text||'/73110000-0000-4000-8000-000000000001/test.pdf',auth.uid());
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('bpo.test.second'),'role','authenticated')::text,true);
do $$ begin
 if exists(select 1 from public.bpo_reports where id='73110000-0000-4000-8000-000000000001') then raise exception 'Cross-account BPO visible';end if;
 if exists(select 1 from storage.objects where bucket_id='bpo-documents' and name like '%73110000-0000-4000-8000-000000000001%') then raise exception 'Cross-account PDF visible';end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('bpo.test.other'),'role','authenticated')::text,true);
do $$ begin
 if public.bpo_enabled() then raise exception 'Subscriber unexpectedly enabled';end if;
 begin insert into public.bpo_access(user_id) values(auth.uid());raise exception 'Self-grant permitted';exception when insufficient_privilege then null;end;
 begin insert into public.bpo_reports(user_id,address) values(auth.uid(),'Subscriber should not save');raise exception 'Subscriber save permitted';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name) values('bpo-documents',auth.uid()::text||'/73110000-0000-4000-8000-000000000001/test.pdf');raise exception 'Subscriber upload permitted';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.bpo_access set active=false where user_id=current_setting('bpo.test.owner')::uuid;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('bpo.test.owner'),'role','authenticated')::text,true);
do $$ begin if public.bpo_enabled() or exists(select 1 from public.bpo_reports where id='73110000-0000-4000-8000-000000000001') then raise exception 'Revoked access still allowed';end if;end $$;
reset role;
select 'PASS: owner CRUD, revision, cross-account isolation, subscriber denial, upload isolation, self-grant denial, revocation; all rolled back' as result;
rollback;
