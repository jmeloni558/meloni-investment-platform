-- Staging-only candidate. Privileged transaction is required because direct table DELETE is intentionally revoked.
create or replace function public.website_shared_property_delete(p_id uuid,p_revision integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); prop public.properties;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into prop from public.properties where id=p_id and user_id=uid for update;
 if not found then raise exception 'Property unavailable' using errcode='42501'; end if;
 if p_revision is distinct from prop.revision then raise exception 'Property changed. Refresh and review it before deleting.'; end if;
 perform 1 from public.analyses where property_id=p_id for update;
 if exists(select 1 from public.analyses where property_id=p_id and user_id is distinct from uid)
 or exists(select 1 from public.analysis_versions where (property_id=p_id or analysis_id in(select id from public.analyses where property_id=p_id)) and user_id is distinct from uid)
 or exists(select 1 from public.scenarios where analysis_id in(select id from public.analyses where property_id=p_id) and user_id is distinct from uid)
 or exists(select 1 from public.property_income_comparables where property_id=p_id and user_id is distinct from uid)
 or exists(select 1 from public.property_entitlements where property_id=p_id and user_id is distinct from uid)
 or exists(select 1 from public.letters_of_intent where (property_id=p_id or analysis_id in(select id from public.analyses where property_id=p_id)) and user_id is distinct from uid)
 then raise exception 'Related records need review' using errcode='42501'; end if;
 if exists(select 1 from public.property_entitlements where property_id=p_id and (stripe_checkout_session_id is not null or stripe_payment_intent_id is not null or stripe_subscription_id is not null)) then
 raise exception 'This property has a paid unlock. Archive it to preserve its purchase record.'; end if;
 delete from public.properties where id=p_id and user_id=uid;
 return jsonb_build_object('deleted',true,'id',p_id);
end $$;
revoke all on function public.website_shared_property_delete(uuid,integer) from public,anon;
grant execute on function public.website_shared_property_delete(uuid,integer) to authenticated;
