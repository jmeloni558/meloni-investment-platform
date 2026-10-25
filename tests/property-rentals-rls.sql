begin;

select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='jamie@melonirealty.com'),true);
select set_config('test.other',(select id::text from auth.users where email='jamiemeloni2012+kappa@gmail.com'),true);
select set_config('test.subject',gen_random_uuid()::text,true),set_config('test.other_subject',gen_random_uuid()::text,true);
insert into public.properties(id,user_id,name) values(current_setting('test.subject')::uuid,auth.uid(),'Synthetic release RLS test'),(current_setting('test.other_subject')::uuid,current_setting('test.other')::uuid,'Synthetic other owner');
set local role authenticated;
do $$
declare evid jsonb:='{"version":1,"comparables":[]}'; n integer;
begin
insert into public.property_rental_comparables(property_id,user_id,evidence) values(current_setting('test.subject')::uuid,auth.uid(),evid);
update public.property_rental_comparables set revision=2,evidence=evid where property_id=current_setting('test.subject')::uuid and revision=1;
get diagnostics n=row_count;if n<>1 then raise exception 'Owner save failed';end if;
update public.property_rental_comparables set revision=2,evidence=evid where property_id=current_setting('test.subject')::uuid and revision=1;
get diagnostics n=row_count;if n<>0 then raise exception 'Stale revision accepted';end if;
begin
insert into public.property_rental_comparables(property_id,user_id,evidence) values(current_setting('test.other_subject')::uuid,auth.uid(),evid);
raise exception 'Other property accepted';exception when insufficient_privilege then null;end;
perform set_config('request.jwt.claim.sub',current_setting('test.other'),true);
if exists(select 1 from public.property_rental_comparables where property_id=current_setting('test.subject')::uuid) then raise exception 'Other account read evidence';end if;
update public.property_rental_comparables set revision=3 where property_id=current_setting('test.subject')::uuid;
get diagnostics n=row_count;if n<>0 then raise exception 'Other account changed evidence';end if;
begin perform public.website_shared_property_delete(current_setting('test.subject')::uuid,1);raise exception 'Other account deleted subject';exception when insufficient_privilege then null;end;
end $$;
reset role;
delete from public.properties where id=current_setting('test.subject')::uuid;
do $$begin if exists(select 1 from public.property_rental_comparables where property_id=current_setting('test.subject')::uuid) then raise exception 'Delete cascade failed';end if;end $$;
select 'PASS: authenticated RLS owner save, cross-owner block, stale revision, private delete wrapper' as result;

rollback;
