begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','8c3d1560-0eb7-4814-8f27-f24694b788a3',true);
do $$ begin
  if (select count(*) from public.client_directory) <> 81 then raise exception 'Owner cannot read all contacts'; end if;
  if (select count(*) from public.client_directory_members) <> 1 then raise exception 'Membership visibility is incorrect'; end if;
end $$;
select set_config('request.jwt.claim.sub','58d64acf-0e45-4490-8659-7bba164ec83e',true);
do $$ begin
  if (select count(*) from public.client_directory) <> 81 then raise exception 'Gmail account cannot read all contacts'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
  if exists(select 1 from public.client_directory) then raise exception 'Unrelated user can read contacts'; end if;
  if exists(select 1 from public.client_directory_members) then raise exception 'Unrelated user can read membership'; end if;
  if has_table_privilege('authenticated','public.client_directory','INSERT') or has_table_privilege('authenticated','public.client_directory_members','INSERT') then raise exception 'Unauthorized write grant'; end if;
end $$;
set local role anon;
do $$ begin
  if has_table_privilege('anon','public.client_directory','SELECT') then raise exception 'Anonymous access granted'; end if;
end $$;
rollback;
