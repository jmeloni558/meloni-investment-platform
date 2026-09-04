-- Transaction-only regression checks. All fixtures and usage reservations are rolled back.
begin;
do $test$
declare
  v_owner uuid;
  v_customer uuid;
  v_owner_property uuid;
  v_other_property uuid;
  v_result jsonb;
begin
  select id into strict v_owner from auth.users where email = 'jamiemeloni2012@gmail.com';
  select id into strict v_customer from auth.users where email = 'jrmeloni@hotmail.com';
  insert into public.account_access_overrides(user_id) values(v_owner);
  insert into public.properties(user_id,name) values(v_owner,'Owner access rollback test') returning id into v_owner_property;
  insert into public.properties(user_id,name) values(v_customer,'Customer access rollback test') returning id into v_other_property;

  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
  set local role authenticated;
  if public.get_account_access()->>'owner' <> 'true' then raise exception 'Owner status missing'; end if;
  v_result := public.claim_property_access(v_owner_property);
  if v_result->>'source' <> 'owner' or v_result->>'allowed' <> 'true' then raise exception 'Owner blocked'; end if;
  begin
    perform public.claim_property_access(v_other_property);
    raise exception 'Cross-account access was allowed';
  exception when raise_exception then
    if sqlerrm <> 'Property not found' then raise; end if;
  end;
  begin
    update public.account_access_overrides set ai_daily_limit=1000 where user_id=v_owner;
    raise exception 'Owner could modify own permissions';
  exception when insufficient_privilege then null;
  end;

  reset role;
  v_result := public.consume_external_api_quota('rentcast','owner-rollback-check',v_owner,null,5,1000000);
  if (v_result->>'dailyLimit')::integer <> 500 then raise exception 'Owner listing quota failed'; end if;
  v_result := public.consume_external_api_quota('openai','owner-rollback-check',v_owner,null,50,1000000);
  if (v_result->>'dailyLimit')::integer <> 500 then raise exception 'Owner AI quota failed'; end if;
  v_result := public.consume_external_api_quota('openai','owner-rollback-check',v_owner,null,50,1);
  if v_result->>'reason' <> 'MONTHLY_LIMIT' then raise exception 'Monthly budget bypassed'; end if;
  v_result := public.consume_edge_rate_limit(v_owner,'rentcast-sales-comps',120,86400);
  if (v_result->>'limit')::integer <> 500 then raise exception 'Owner comps quota failed'; end if;
  v_result := public.consume_edge_rate_limit(v_owner,'rentcast-sales-comps',12,60);
  if (v_result->>'limit')::integer <> 12 then raise exception 'Burst protection changed'; end if;

  perform set_config('request.jwt.claim.sub',v_customer::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_customer,'role','authenticated','user_metadata',jsonb_build_object('owner',true))::text,true);
  set local role authenticated;
  if public.get_account_access()->>'owner' <> 'false' then raise exception 'Customer promoted by metadata'; end if;
  if exists(select 1 from public.account_access_overrides) then raise exception 'Other account owner row visible'; end if;
  if public.claim_property_access(v_other_property)->>'reason' <> 'payment_required' then raise exception 'Customer paywall bypassed'; end if;
  begin
    insert into public.account_access_overrides(user_id) values(v_customer);
    raise exception 'Customer could self-promote';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.consume_external_api_quota('openai','test',v_customer,null,1000,1000000);
    raise exception 'Customer could reserve custom quota';
  exception when insufficient_privilege then null;
  end;

  reset role;
  v_result := public.consume_external_api_quota('rentcast','owner-rollback-check',v_customer,null,5,1000000);
  if (v_result->>'dailyLimit')::integer <> 5 then raise exception 'Normal listing quota changed'; end if;
  v_result := public.consume_external_api_quota('openai','owner-rollback-check',null,'owner-rollback-guest',15,1000000);
  if (v_result->>'dailyLimit')::integer <> 15 then raise exception 'Guest quota changed'; end if;

  update public.account_access_overrides set active=false where user_id=v_owner;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
  set local role authenticated;
  if public.get_account_access()->>'owner' <> 'false' then raise exception 'Owner revocation not reflected'; end if;
  if public.claim_property_access(v_owner_property)->>'reason' <> 'payment_required' then raise exception 'Owner revocation left unlimited grants'; end if;

  reset role;
end;
$test$;
select 'PASS: owner access, customer paywall, account isolation, no self-promotion, quotas, budget protection, revocation' as result;
rollback;

