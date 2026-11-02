alter table public.photo_properties
  add column archived_at timestamptz,
  add constraint photo_archive_requires_completion check (archived_at is null or completed_at is not null);
grant update (archived_at) on public.photo_properties to authenticated;
