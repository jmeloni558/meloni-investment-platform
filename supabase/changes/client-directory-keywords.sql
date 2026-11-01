create table public.client_directory_keywords (
  name text primary key check (name=btrim(name) and length(name) between 1 and 80 and name !~ '[;\n\r]'),
  created_at timestamptz not null default now()
);
create unique index client_directory_keyword_name_ci on public.client_directory_keywords(lower(name));
alter table public.client_directory_keywords enable row level security;
revoke all on public.client_directory_keywords from anon, authenticated;
grant select, insert on public.client_directory_keywords to authenticated;
create policy "Directory members can read keywords" on public.client_directory_keywords
for select to authenticated using(exists(select 1 from public.client_directory_members where user_id=(select auth.uid())));
create policy "Directory members can add keywords" on public.client_directory_keywords
for insert to authenticated with check(exists(select 1 from public.client_directory_members where user_id=(select auth.uid())));
insert into public.client_directory_keywords(name) values ('BPO Contacts'),('REO Contacts');
