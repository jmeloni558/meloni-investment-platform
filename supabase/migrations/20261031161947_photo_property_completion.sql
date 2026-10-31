alter table public.photo_properties add column completed_at timestamptz;
grant update(completed_at) on public.photo_properties to authenticated;
create policy photo_properties_complete on public.photo_properties for update to authenticated
 using(user_id=(select auth.uid()) and (select public.photo_library_enabled()))
 with check(user_id=(select auth.uid()) and (select public.photo_library_enabled()));
