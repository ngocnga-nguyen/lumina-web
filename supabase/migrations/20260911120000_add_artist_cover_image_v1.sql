begin;

alter table public.artists
  add column if not exists cover_image_url text null;

comment on column public.artists.cover_image_url is
  'Optional public cover image for the professional profile. This does not affect activation readiness.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'artists_cover_image_url_check'
      and conrelid = 'public.artists'::regclass
  ) then
    alter table public.artists
      add constraint artists_cover_image_url_check check (
        cover_image_url is null
        or (
          cover_image_url = btrim(cover_image_url)
          and char_length(cover_image_url) between 1 and 2048
          and cover_image_url ~ '^https?://'
        )
      );
  end if;
end;
$$;

-- Professional activation uses column-level privileges, so this new public
-- profile field must be granted explicitly. Existing artists RLS continues to
-- restrict writes to the authenticated owner.
grant select (cover_image_url) on table public.artists to anon, authenticated;
grant insert (cover_image_url) on table public.artists to authenticated;
grant update (cover_image_url) on table public.artists to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'artist-cover-images',
  'artist-cover-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Professionals can upload their own cover images"
  on storage.objects;
create policy "Professionals can upload their own cover images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'artist-cover-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
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
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.artists artist
    where artist.id = (select auth.uid())
  )
);

commit;
