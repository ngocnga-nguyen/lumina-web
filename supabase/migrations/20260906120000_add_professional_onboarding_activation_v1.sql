begin;

alter table public.artists
  alter column is_active set default false;

create or replace function public.professional_activation_row_ready(
  p_artist_id uuid,
  p_name text,
  p_category text,
  p_location text,
  p_profile_image_url text,
  p_bio text,
  p_availability text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    char_length(btrim(coalesce(p_name, ''))) >= 2
    and lower(btrim(coalesce(p_name, ''))) not in (
      'professional account',
      'your artist profile'
    )
    and char_length(btrim(coalesce(p_category, ''))) >= 2
    and lower(btrim(coalesce(p_category, ''))) not in (
      'beauty professional',
      'service category'
    )
    and char_length(btrim(coalesce(p_location, ''))) >= 2
    and lower(btrim(coalesce(p_location, ''))) not in (
      'location',
      'location coming soon',
      'location unavailable',
      'travels to clients',
      'mobile salon'
    )
    and char_length(btrim(coalesce(p_profile_image_url, ''))) > 0
    and char_length(btrim(coalesce(p_bio, ''))) > 0
    and char_length(btrim(coalesce(p_availability, ''))) > 0
    and lower(btrim(coalesce(p_availability, ''))) <> 'availability coming soon.'
    and exists (
      select 1
      from public.services service
      where service.artist_id = p_artist_id
        and char_length(btrim(coalesce(service.service_name, ''))) >= 2
        and service.price is not null
        and service.price >= 0
    )
    and exists (
      select 1
      from public.portfolio_images image
      where image.artist_id = p_artist_id
        and char_length(btrim(coalesce(image.image_url, ''))) > 0
    )
    and exists (
      select 1
      from public.professional_license_verifications verification
      where verification.artist_id = p_artist_id
        and verification.status = 'verified'
    );
$$;

revoke all on function public.professional_activation_row_ready(
  uuid, text, text, text, text, text, text
) from public, anon, authenticated;

create or replace function public.professional_activation_readiness(
  p_artist_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  artist_record public.artists%rowtype;
  license_record public.professional_license_verifications%rowtype;
  profile_information_ready boolean;
  profile_photo_ready boolean;
  bio_ready boolean;
  location_ready boolean;
  services_ready boolean;
  portfolio_ready boolean;
  availability_ready boolean;
  license_verified boolean;
  activation_ready boolean;
begin
  select *
  into artist_record
  from public.artists
  where id = p_artist_id;

  if not found then
    return null;
  end if;

  select *
  into license_record
  from public.professional_license_verifications
  where artist_id = p_artist_id;

  profile_information_ready :=
    char_length(btrim(coalesce(artist_record.name, ''))) >= 2
    and lower(btrim(coalesce(artist_record.name, ''))) not in (
      'professional account',
      'your artist profile'
    )
    and char_length(btrim(coalesce(artist_record.category, ''))) >= 2
    and lower(btrim(coalesce(artist_record.category, ''))) not in (
      'beauty professional',
      'service category'
    );
  profile_photo_ready :=
    char_length(btrim(coalesce(artist_record.profile_image_url, ''))) > 0;
  bio_ready := char_length(btrim(coalesce(artist_record.bio, ''))) > 0;
  location_ready :=
    char_length(btrim(coalesce(artist_record.location, ''))) >= 2
    and lower(btrim(coalesce(artist_record.location, ''))) not in (
      'location',
      'location coming soon',
      'location unavailable',
      'travels to clients',
      'mobile salon'
    );
  services_ready := exists (
    select 1
    from public.services service
    where service.artist_id = p_artist_id
      and char_length(btrim(coalesce(service.service_name, ''))) >= 2
      and service.price is not null
      and service.price >= 0
  );
  portfolio_ready := exists (
    select 1
    from public.portfolio_images image
    where image.artist_id = p_artist_id
      and char_length(btrim(coalesce(image.image_url, ''))) > 0
  );
  availability_ready :=
    char_length(btrim(coalesce(artist_record.availability, ''))) > 0
    and lower(btrim(coalesce(artist_record.availability, ''))) <>
      'availability coming soon.';
  license_verified := coalesce(license_record.status = 'verified', false);
  activation_ready :=
    profile_information_ready
    and profile_photo_ready
    and bio_ready
    and location_ready
    and services_ready
    and portfolio_ready
    and availability_ready
    and license_verified;

  return jsonb_build_object(
    'artist_id', artist_record.id,
    'profile_information_ready', profile_information_ready,
    'profile_photo_ready', profile_photo_ready,
    'bio_ready', bio_ready,
    'location_ready', location_ready,
    'services_ready', services_ready,
    'portfolio_ready', portfolio_ready,
    'availability_ready', availability_ready,
    'license_status', coalesce(license_record.status, 'unverified'),
    'license_verified', license_verified,
    'license_decision_message', license_record.decision_message,
    'activation_ready', activation_ready,
    'is_active', coalesce(artist_record.is_active, false)
  );
end;
$$;

revoke all on function public.professional_activation_readiness(uuid)
  from public, anon, authenticated;

create or replace function public.get_my_professional_activation_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  readiness jsonb;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.artists where id = actor_id
  ) then
    raise exception 'Professional profile not found.' using errcode = '42501';
  end if;

  readiness := public.professional_activation_readiness(actor_id);
  return readiness;
end;
$$;

revoke all on function public.get_my_professional_activation_status()
  from public, anon;
grant execute on function public.get_my_professional_activation_status()
  to authenticated;

create or replace function public.protect_professional_activation_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  operation text := current_setting('lumina.profile_activation_operation', true);
begin
  if tg_op = 'INSERT' then
    if coalesce(new.is_active, false) and operation <> 'protected_activation' then
      raise exception 'Professional profiles must be activated through the protected activation flow.'
        using errcode = '42501';
    end if;
    new.is_active := coalesce(new.is_active, false);
    return new;
  end if;

  if coalesce(new.is_active, false)
    and not coalesce(old.is_active, false)
    and operation <> 'protected_activation'
  then
    raise exception 'Professional profiles must be activated through the protected activation flow.'
      using errcode = '42501';
  end if;

  if coalesce(new.is_active, false)
    and not public.professional_activation_row_ready(
      new.id,
      new.name,
      new.category,
      new.location,
      new.profile_image_url,
      new.bio,
      new.availability
    )
  then
    new.is_active := false;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_professional_activation_v1() from public;

drop trigger if exists protect_professional_activation_v1_trigger
  on public.artists;
create trigger protect_professional_activation_v1_trigger
before insert or update on public.artists
for each row execute function public.protect_professional_activation_v1();

create or replace function public.deactivate_professional_when_unready_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_artist_id uuid;
  new_artist_id uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_artist_id := old.artist_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_artist_id := new.artist_id;
  end if;

  if old_artist_id is not null then
    update public.artists artist
    set is_active = false
    where artist.id = old_artist_id
      and coalesce(artist.is_active, false)
      and not public.professional_activation_row_ready(
        artist.id,
        artist.name,
        artist.category,
        artist.location,
        artist.profile_image_url,
        artist.bio,
        artist.availability
      );
  end if;

  if new_artist_id is not null and new_artist_id is distinct from old_artist_id then
    update public.artists artist
    set is_active = false
    where artist.id = new_artist_id
      and coalesce(artist.is_active, false)
      and not public.professional_activation_row_ready(
        artist.id,
        artist.name,
        artist.category,
        artist.location,
        artist.profile_image_url,
        artist.bio,
        artist.availability
      );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.deactivate_professional_when_unready_v1()
  from public;

drop trigger if exists deactivate_professional_after_service_change_v1
  on public.services;
create trigger deactivate_professional_after_service_change_v1
after insert or update or delete on public.services
for each row execute function public.deactivate_professional_when_unready_v1();

drop trigger if exists deactivate_professional_after_portfolio_change_v1
  on public.portfolio_images;
create trigger deactivate_professional_after_portfolio_change_v1
after insert or update or delete on public.portfolio_images
for each row execute function public.deactivate_professional_when_unready_v1();

drop trigger if exists deactivate_professional_after_license_change_v1
  on public.professional_license_verifications;
create trigger deactivate_professional_after_license_change_v1
after insert or update or delete on public.professional_license_verifications
for each row execute function public.deactivate_professional_when_unready_v1();

create or replace function public.set_professional_profile_visibility(
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  readiness jsonb;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  perform 1
  from public.artists
  where id = actor_id
  for update;

  if not found then
    raise exception 'Professional profile not found.' using errcode = '42501';
  end if;

  readiness := public.professional_activation_readiness(actor_id);

  if coalesce(p_active, false)
    and not coalesce((readiness ->> 'activation_ready')::boolean, false)
  then
    raise exception 'Complete every activation requirement before activating your profile.'
      using errcode = '23514';
  end if;

  perform set_config(
    'lumina.profile_activation_operation',
    case when coalesce(p_active, false) then 'protected_activation' else 'protected_deactivation' end,
    true
  );

  update public.artists
  set is_active = coalesce(p_active, false)
  where id = actor_id;

  return public.professional_activation_readiness(actor_id);
end;
$$;

revoke all on function public.set_professional_profile_visibility(boolean)
  from public, anon;
grant execute on function public.set_professional_profile_visibility(boolean)
  to authenticated;

-- Remove direct browser access to the activation column while preserving the
-- professional's existing ability to edit every other artist-profile column.
revoke update on table public.artists from public;
revoke update on table public.artists from authenticated;
revoke update on table public.artists from anon;

do $$
declare
  editable_columns text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
  into editable_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'artists'
    and column_name <> 'is_active';

  if editable_columns is not null then
    execute format(
      'grant update (%s) on table public.artists to authenticated',
      editable_columns
    );
  end if;
end;
$$;

update public.artists artist
set is_active = false
where coalesce(artist.is_active, false)
  and not public.professional_activation_row_ready(
    artist.id,
    artist.name,
    artist.category,
    artist.location,
    artist.profile_image_url,
    artist.bio,
    artist.availability
  );

commit;
