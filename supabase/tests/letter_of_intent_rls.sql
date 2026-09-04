begin;
do $$
declare owner_id uuid; other_id uuid; record_id uuid;
begin
  select user_id into strict owner_id from public.account_access_overrides where active and access_role='owner' limit 1;
  select id into strict other_id from auth.users where id <> owner_id limit 1;
  insert into public.letters_of_intent (user_id,analysis_updated_at,address,recipient_email,sender_email,sender_from,terms,subject,letter_text,letter_html,document_hash,fingerprint,template_version)
  values (owner_id, now(), 'RLS TEST ONLY', 'test@example.com', 'test@example.com', 'Test <test@example.com>', '{}', 'TEST','TEST','TEST',repeat('a',64),repeat('b',64),'test') returning id into record_id;
  perform set_config('test.loi_owner',owner_id::text,true);
  perform set_config('test.loi_other',other_id::text,true);
  perform set_config('test.loi_record',record_id::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.loi_owner'),true);
do $$ begin
  if not exists(select 1 from public.letters_of_intent where id=current_setting('test.loi_record')::uuid) then raise exception 'Owner cannot read own record'; end if;
  if has_table_privilege('authenticated','public.letters_of_intent','INSERT') or has_table_privilege('authenticated','public.letters_of_intent','UPDATE') or has_table_privilege('authenticated','public.letters_of_intent','DELETE') then raise exception 'Client has write privilege'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.loi_other'),true);
do $$ begin
  if exists(select 1 from public.letters_of_intent where id=current_setting('test.loi_record')::uuid) then raise exception 'Cross-account leak'; end if;
end $$;
reset role;
update public.account_access_overrides set active=false where user_id=current_setting('test.loi_owner')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.loi_owner'),true);
do $$ begin
  if exists(select 1 from public.letters_of_intent where id=current_setting('test.loi_record')::uuid) then raise exception 'Revoked owner can read pilot records'; end if;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon','public.letters_of_intent','SELECT') then raise exception 'Guest has read privilege'; end if;
end $$;
rollback;
