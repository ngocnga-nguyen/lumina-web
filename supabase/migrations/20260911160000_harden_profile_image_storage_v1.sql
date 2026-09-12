begin;

-- Profile images are intentionally public media, but writes must be constrained
-- to a single authenticated user's folder: <auth.uid()>/<random-file>.<ext>.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Replace the existing bucket-only policies. They allow every authenticated
-- account to write or remove every object in this shared public bucket.
drop policy if exists "Anyone can upload profile images"
  on storage.objects;
drop policy if exists "Anyone can view profile images"
  on storage.objects;
drop policy if exists "Artists can update profile images"
  on storage.objects;
drop policy if exists "Artists can delete profile images"
  on storage.objects;

drop policy if exists "Public can view profile images"
  on storage.objects;
create policy "Public can view profile images"
on storage.objects
for select
to public
using (bucket_id = 'profile-images');

drop policy if exists "Users can upload their own profile images"
  on storage.objects;
create policy "Users can upload their own profile images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and cardinality(storage.foldername(name)) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
);

drop policy if exists "Users can update their own profile images"
  on storage.objects;
create policy "Users can update their own profile images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-images'
  and cardinality(storage.foldername(name)) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-images'
  and cardinality(storage.foldername(name)) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
);

drop policy if exists "Users can delete their own profile images"
  on storage.objects;
create policy "Users can delete their own profile images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (
    (
      cardinality(storage.foldername(name)) = 1
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
    or (
      -- Older application versions stored files at the bucket root as
      -- <user-id>-<timestamp>.<extension>. Only that exact owner prefix is
      -- accepted for legacy cleanup; new root-level writes remain forbidden.
      cardinality(storage.foldername(name)) = 0
      and name like (select auth.uid())::text || '-%'
    )
  )
);

commit;
