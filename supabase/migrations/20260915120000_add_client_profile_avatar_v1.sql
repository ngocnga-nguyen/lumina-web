begin;

do $$
declare
  profiles_rls_enabled boolean;
begin
  select c.relrowsecurity
  into profiles_rls_enabled
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profiles';

  if profiles_rls_enabled is distinct from true then
    raise exception 'public.profiles must exist with row level security enabled before adding client avatar identity';
  end if;

  if to_regclass('auth.users') is null then
    raise exception 'auth.users is required to backfill existing client avatars safely';
  end if;
end
$$;

alter table public.profiles
  add column if not exists avatar_url text null;

alter table public.profiles
  drop constraint if exists profiles_avatar_url_check;

alter table public.profiles
  add constraint profiles_avatar_url_check
  check (
    avatar_url is null
    or (
      avatar_url = btrim(avatar_url)
      and char_length(avatar_url) between 1 and 2048
      and avatar_url ~* '^https://[^[:space:]]+$'
    )
  );

-- Existing Lumina client uploads are intentionally public objects in the
-- profile-images bucket. Copy only that explicit public-media URL from the
-- matching auth user, and never infer identity from unrelated metadata.
update public.profiles as profile
set avatar_url = nullif(btrim(auth_user.raw_user_meta_data ->> 'avatar_url'), '')
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.avatar_url is null
  and not exists (
    select 1
    from public.artists as artist
    where artist.id = profile.id
  )
  and jsonb_typeof(auth_user.raw_user_meta_data -> 'avatar_url') = 'string'
  and nullif(btrim(auth_user.raw_user_meta_data ->> 'avatar_url'), '') is not null
  and btrim(auth_user.raw_user_meta_data ->> 'avatar_url') ~* '^https://[^[:space:]]+/storage/v1/object/public/profile-images/[^[:space:]]+$';

comment on column public.profiles.avatar_url is
  'Current basic client avatar URL for authenticated relationship views; public profile-images media only.';

create or replace function public.get_related_client_identities(
  p_client_ids uuid[]
)
returns table (
  id uuid,
  full_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select profile.id, profile.full_name, profile.avatar_url
  from public.profiles as profile
  where profile.id = any(coalesce(p_client_ids, array[]::uuid[]))
    and (
      profile.id = (select auth.uid())
      or exists (
        select 1
        from public.client_requests as request
        where request.client_id = profile.id
          and request.artist_id = (select auth.uid())
      )
    );
$$;

revoke all on function public.get_related_client_identities(uuid[]) from public;
grant execute on function public.get_related_client_identities(uuid[]) to authenticated;

-- Column grants do not bypass the existing profiles row policies. No anon or
-- public privilege is added by this migration.
grant select (avatar_url) on table public.profiles to authenticated;
grant insert (avatar_url), update (avatar_url) on table public.profiles to authenticated;

commit;
