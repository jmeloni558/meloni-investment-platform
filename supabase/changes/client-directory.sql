-- Private, shared BPO directory for the two explicitly authorized accounts.
create table public.client_directory_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.client_directory_members enable row level security;
revoke all on public.client_directory_members from anon, authenticated;
grant select on public.client_directory_members to authenticated;
create policy "Members can check their own access" on public.client_directory_members
  for select to authenticated using (user_id = (select auth.uid()));
insert into public.client_directory_members(user_id)
select id from auth.users where lower(email) in ('jamie@melonirealty.com','jamiemeloni2012@gmail.com') and email_confirmed_at is not null;

create table public.client_directory (
  source_id text primary key,
  name text not null,
  company text not null default '',
  job_title text not null default '',
  address text not null default '',
  emails jsonb not null default '[]',
  phones jsonb not null default '[]',
  keywords text not null default '',
  notes text not null default '',
  source_text text not null,
  source_fields jsonb not null default '{}',
  imported_at timestamptz not null default now()
);
alter table public.client_directory enable row level security;
revoke all on public.client_directory from anon, authenticated;
grant select on public.client_directory to authenticated;
create policy "Only directory members may read contacts" on public.client_directory
  for select to authenticated using (
    exists (select 1 from public.client_directory_members where user_id = (select auth.uid()))
  );
