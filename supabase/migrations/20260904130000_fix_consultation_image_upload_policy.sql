begin;

-- storage.foldername('client-id/request-id/file.jpg') returns only the two
-- folder segments. The original >= 3 check counted the filename as a folder
-- and rejected every correctly structured client upload.
drop policy if exists "Clients can upload their consultation images"
  on storage.objects;

create policy "Clients can upload their consultation images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'consultation-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
);

commit;
