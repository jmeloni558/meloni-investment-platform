create policy property_photos_delete on storage.objects for delete to authenticated using(
 bucket_id='property-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 and (select public.photo_library_enabled())
 and exists(select 1 from public.photo_properties p where p.id::text=(storage.foldername(name))[2] and p.user_id=(select auth.uid()))
);
