begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','8c3d1560-0eb7-4814-8f27-f24694b788a3',true);
insert into public.client_directory(source_id,name,source_text) values('test:directory-editing-rollback','Directory rollback test','');
select set_config('request.jwt.claim.sub','58d64acf-0e45-4490-8659-7bba164ec83e',true);
do $$ declare n integer; begin
  update public.client_directory set name='Edited',revision=2 where source_id='test:directory-editing-rollback' and revision=1;
  get diagnostics n=row_count; if n<>1 then raise exception 'Gmail edit failed'; end if;
  update public.client_directory set name='Stale overwrite' where source_id='test:directory-editing-rollback' and revision=1;
  get diagnostics n=row_count; if n<>0 then raise exception 'Stale update succeeded'; end if;
  update public.client_directory set deleted_at=now(),revision=3 where source_id='test:directory-editing-rollback';
  if not exists(select 1 from public.client_directory where source_id='test:directory-editing-rollback' and deleted_at is not null) then raise exception 'Trash failed'; end if;
  update public.client_directory set deleted_at=null,revision=4 where source_id='test:directory-editing-rollback';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ declare n integer; begin
  update public.client_directory set name='Unauthorized' where source_id='test:directory-editing-rollback';
  get diagnostics n=row_count; if n<>0 then raise exception 'Unauthorized update succeeded'; end if;
  begin
    insert into public.client_directory(source_id,name,source_text) values('test:forbidden','Forbidden','');
    raise exception 'Unauthorized insert succeeded';
  exception when insufficient_privilege then null;
  end;
  if has_table_privilege('authenticated','public.client_directory','DELETE') then raise exception 'Permanent delete available'; end if;
  if has_table_privilege('anon','public.client_directory','INSERT') or has_table_privilege('anon','public.client_directory','UPDATE') then raise exception 'Anonymous writes available'; end if;
end $$;
rollback;
