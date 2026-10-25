begin;
do $test$
declare u uuid; other_uid uuid; p uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); control uuid:=gen_random_uuid(); r jsonb;
begin
 select id into u from auth.users where email='jamie@melonirealty.com';
 select id into other_uid from auth.users where email='jamiemeloni2012+kappa@gmail.com';
 if u is null or other_uid is null then raise exception 'Test identities unavailable'; end if;
 insert into public.properties(id,user_id,name) values(p,u,'Disposable delete regression'),(control,u,'Disposable control');
 insert into public.analyses(id,user_id,property_id) values(a,u,p);
 insert into public.property_income_comparables(property_id,user_id,evidence) values(p,u,'{"version":1,"items":[],"reconciliation":null}');
 perform set_config('request.jwt.claim.sub',other_uid::text,true);
 begin perform public.website_shared_property_delete(p,1); raise exception 'Other owner unexpectedly succeeded'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',u::text,true);
 begin perform public.website_shared_property_delete(p,999); raise exception 'Stale revision unexpectedly succeeded'; exception when raise_exception then if sqlerrm not like 'Property changed.%' then raise; end if; end;
 insert into public.property_entitlements(user_id,property_id,source,stripe_payment_intent_id) values(u,p,'single_purchase','synthetic_only');
 begin perform public.website_shared_property_delete(p,1); raise exception 'Paid record unexpectedly deleted'; exception when raise_exception then if sqlerrm not like 'This property has a paid unlock.%' then raise; end if; end;
 delete from public.property_entitlements where property_id=p;
 r:=public.website_shared_property_delete(p,1);
 if r->>'deleted'<>'true' or exists(select 1 from public.properties where id=p) or exists(select 1 from public.analyses where id=a) or exists(select 1 from public.property_income_comparables where property_id=p) or not exists(select 1 from public.properties where id=control) then raise exception 'Deletion isolation/cascade failed'; end if;
 if has_function_privilege('anon','public.website_shared_property_delete(uuid,integer)','execute') or not has_function_privilege('authenticated','public.website_shared_property_delete(uuid,integer)','execute') then raise exception 'Bad function privileges'; end if;
end $test$;
select 'PASS: ownership, revision, paid-record guard, cascade, control preservation, grants; all fixtures rolled back' result;
rollback;
