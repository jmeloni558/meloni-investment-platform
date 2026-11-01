begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','8c3d1560-0eb7-4814-8f27-f24694b788a3',true);
insert into public.client_directory_keywords(name) values('Directory keyword rollback test');
do $$ begin
  if (select count(*) from public.client_directory_keywords where name in ('BPO Contacts','REO Contacts'))<>2 then raise exception 'Required groups missing'; end if;
  begin
    insert into public.client_directory_keywords(name) values('directory keyword rollback test');
    raise exception 'Case insensitive duplicate allowed';
  exception when unique_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','58d64acf-0e45-4490-8659-7bba164ec83e',true);
do $$ begin
  if not exists(select 1 from public.client_directory_keywords where name='Directory keyword rollback test') then raise exception 'Gmail keyword access denied'; end if;
end $$;
insert into public.client_directory_keywords(name) values('Gmail keyword rollback test');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
  if exists(select 1 from public.client_directory_keywords) then raise exception 'Unrelated user can read keywords'; end if;
  begin
    insert into public.client_directory_keywords(name) values('Forbidden keyword');
    raise exception 'Unrelated user can add keywords';
  exception when insufficient_privilege then null; end;
  if has_table_privilege('anon','public.client_directory_keywords','SELECT') or has_table_privilege('anon','public.client_directory_keywords','INSERT') then raise exception 'Anonymous access granted'; end if;
end $$;
rollback;
