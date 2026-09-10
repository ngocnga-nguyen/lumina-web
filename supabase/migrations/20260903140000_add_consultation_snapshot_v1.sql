begin;

alter table public.client_requests
  add column if not exists consultation_snapshot jsonb;

comment on column public.client_requests.consultation_snapshot is
  'Immutable V1 snapshot of the optional consultation details submitted with the original request. Later changes belong in request/proposal history.';

create or replace function public.validate_consultation_snapshot_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  snapshot_key text;
  image_path jsonb;
  image_count integer;
  distinct_image_count integer;
  expected_path_prefix text;
begin
  if tg_op = 'UPDATE'
    and new.consultation_snapshot is distinct from old.consultation_snapshot
  then
    raise exception 'The original Consultation Snapshot cannot be changed after submission.'
      using errcode = '23514';
  end if;

  if new.consultation_snapshot is null then
    return new;
  end if;

  if jsonb_typeof(new.consultation_snapshot) <> 'object' then
    raise exception 'Consultation Snapshot must be a JSON object.'
      using errcode = '23514';
  end if;

  for snapshot_key in
    select jsonb_object_keys(new.consultation_snapshot)
  loop
    if snapshot_key not in (
      'version',
      'goal',
      'avoid',
      'maintenance',
      'budget',
      'inspiration_paths'
    ) then
      raise exception 'Consultation Snapshot contains an unsupported field: %.', snapshot_key
        using errcode = '23514';
    end if;
  end loop;

  if not (new.consultation_snapshot ? 'version')
    or jsonb_typeof(new.consultation_snapshot -> 'version') <> 'number'
    or (new.consultation_snapshot -> 'version') <> '1'::jsonb
  then
    raise exception 'Consultation Snapshot version must be 1.'
      using errcode = '23514';
  end if;

  if new.consultation_snapshot ? 'goal'
    and (
      jsonb_typeof(new.consultation_snapshot -> 'goal') <> 'string'
      or char_length(btrim(new.consultation_snapshot ->> 'goal')) > 600
    )
  then
    raise exception 'Consultation goal must be text no longer than 600 characters.'
      using errcode = '23514';
  end if;

  if new.consultation_snapshot ? 'avoid'
    and (
      jsonb_typeof(new.consultation_snapshot -> 'avoid') <> 'string'
      or char_length(btrim(new.consultation_snapshot ->> 'avoid')) > 500
    )
  then
    raise exception 'Consultation avoidances must be text no longer than 500 characters.'
      using errcode = '23514';
  end if;

  if new.consultation_snapshot ? 'budget'
    and (
      jsonb_typeof(new.consultation_snapshot -> 'budget') <> 'string'
      or char_length(btrim(new.consultation_snapshot ->> 'budget')) > 100
    )
  then
    raise exception 'Consultation budget must be text no longer than 100 characters.'
      using errcode = '23514';
  end if;

  if new.consultation_snapshot ? 'maintenance'
    and (
      jsonb_typeof(new.consultation_snapshot -> 'maintenance') <> 'string'
      or (new.consultation_snapshot ->> 'maintenance') not in (
        'low',
        'moderate',
        'open',
        'not_sure'
      )
    )
  then
    raise exception 'Consultation maintenance preference is invalid.'
      using errcode = '23514';
  end if;

  if new.consultation_snapshot ? 'inspiration_paths' then
    if jsonb_typeof(new.consultation_snapshot -> 'inspiration_paths') <> 'array' then
      raise exception 'Consultation inspiration paths must be an array.'
        using errcode = '23514';
    end if;

    image_count := jsonb_array_length(
      new.consultation_snapshot -> 'inspiration_paths'
    );

    if image_count > 5 then
      raise exception 'A Consultation Snapshot may include at most 5 inspiration images.'
        using errcode = '23514';
    end if;

    select count(distinct value #>> '{}')
    into distinct_image_count
    from jsonb_array_elements(
      new.consultation_snapshot -> 'inspiration_paths'
    ) as inspiration(value);

    if distinct_image_count <> image_count then
      raise exception 'Consultation inspiration paths must be unique.'
        using errcode = '23514';
    end if;

    expected_path_prefix := new.client_id::text || '/' || new.id::text || '/';

    for image_path in
      select value
      from jsonb_array_elements(
        new.consultation_snapshot -> 'inspiration_paths'
      ) as inspiration(value)
    loop
      if jsonb_typeof(image_path) <> 'string'
        or btrim(image_path #>> '{}') = ''
        or char_length(image_path #>> '{}') > 512
        or strpos(image_path #>> '{}', expected_path_prefix) <> 1
        or lower(image_path #>> '{}') !~ '\.(jpg|jpeg|png|webp)$'
      then
        raise exception 'Every consultation image must belong to this client and request.'
          using errcode = '23514';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_consultation_snapshot_v1() from public;

drop trigger if exists validate_consultation_snapshot_v1_trigger
  on public.client_requests;

create trigger validate_consultation_snapshot_v1_trigger
before insert or update of consultation_snapshot
on public.client_requests
for each row
execute function public.validate_consultation_snapshot_v1();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'consultation-images',
  'consultation-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Clients can upload their consultation images"
  on storage.objects;
create policy "Clients can upload their consultation images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'consultation-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) >= 3
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
);

drop policy if exists "Request participants can read consultation images"
  on storage.objects;
create policy "Request participants can read consultation images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'consultation-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.client_requests request
      where request.id::text = (storage.foldername(name))[2]
        and request.client_id::text = (storage.foldername(name))[1]
        and request.artist_id = (select auth.uid())
    )
  )
);

drop policy if exists "Clients can delete their consultation images"
  on storage.objects;
create policy "Clients can delete their consultation images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'consultation-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
