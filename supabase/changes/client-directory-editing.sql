alter table public.client_directory add column revision integer not null default 1;
alter table public.client_directory add column deleted_at timestamptz;
alter table public.client_directory add constraint client_directory_name_required check (length(btrim(name)) > 0);
grant insert, update on public.client_directory to authenticated;
create policy "Directory members can add contacts" on public.client_directory
for insert to authenticated with check (
  exists(select 1 from public.client_directory_members where user_id=(select auth.uid()))
);
create policy "Directory members can edit and trash contacts" on public.client_directory
for update to authenticated using (
  exists(select 1 from public.client_directory_members where user_id=(select auth.uid()))
) with check (
  exists(select 1 from public.client_directory_members where user_id=(select auth.uid()))
);
-- Deletion is recoverable: clients update deleted_at; no DELETE grant is added.
