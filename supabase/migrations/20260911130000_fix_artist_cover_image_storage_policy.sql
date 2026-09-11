begin;

-- A cover object is stored as <artist-id>/<random-filename>.<extension>.
-- storage.foldername(name) returns folder segments only, so this shape has
-- exactly one folder: the authenticated artist id.
drop policy if exists "Professionals can upload their own cover images"
  on storage.objects;
create policy "Professionals can upload their own cover images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'artist-cover-images'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1
    from public.artists artist
    where artist.id = (select auth.uid())
  )
);

-- Storage returns object metadata after an upload and resolves the object
-- before removal. Keep that visibility limited to the owning artist folder.
drop policy if exists "Professionals can select their own cover images"
  on storage.objects;
create policy "Professionals can select their own cover images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'artist-cover-images'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.artists artist
    where artist.id = (select auth.uid())
  )
);

drop policy if exists "Professionals can delete their own cover images"
  on storage.objects;
create policy "Professionals can delete their own cover images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'artist-cover-images'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.artists artist
    where artist.id = (select auth.uid())
  )
);

commit;
