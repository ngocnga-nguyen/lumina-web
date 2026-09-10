begin;

alter table public.artist_client_cards
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists workspace_preferences jsonb;

comment on column public.artist_client_cards.tags is
  'Professional-private workflow tags for this client relationship.';

comment on column public.artist_client_cards.workspace_preferences is
  'Versioned presentation-only Client Card module preferences. Never authoritative client or appointment data.';

create or replace function public.validate_artist_client_card_workspace_v2()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  raw_tag text;
  clean_tag text;
  clean_tags text[] := '{}'::text[];
  pref_key text;
  section_value jsonb;
  section_name text;
  seen_sections text[];
  allowed_sections constant text[] := array[
    'service_history',
    'results',
    'consultation',
    'notes',
    'preferences'
  ];
  optional_sections constant text[] := array[
    'results',
    'consultation',
    'notes',
    'preferences'
  ];
begin
  if tg_op = 'UPDATE'
     and (new.artist_id is distinct from old.artist_id
       or new.client_id is distinct from old.client_id) then
    raise exception 'Client Card ownership cannot be changed';
  end if;

  if coalesce(cardinality(new.tags), 0) > 20 then
    raise exception 'A Client Card can have at most 20 tags';
  end if;

  foreach raw_tag in array coalesce(new.tags, '{}'::text[])
  loop
    if raw_tag is null then
      raise exception 'Client Card tags cannot be empty';
    end if;

    clean_tag := regexp_replace(btrim(raw_tag), '\s+', ' ', 'g');

    if clean_tag is null or clean_tag = '' then
      raise exception 'Client Card tags cannot be empty';
    end if;

    if char_length(clean_tag) > 48 then
      raise exception 'Client Card tags must be 48 characters or fewer';
    end if;

    if exists (
      select 1
      from unnest(clean_tags) as existing_tag
      where lower(existing_tag) = lower(clean_tag)
    ) then
      raise exception 'Client Card tags must be unique, ignoring case';
    end if;

    clean_tags := array_append(clean_tags, clean_tag);
  end loop;

  new.tags := clean_tags;

  if new.workspace_preferences is null then
    return new;
  end if;

  if jsonb_typeof(new.workspace_preferences) is distinct from 'object' then
    raise exception 'Client Card workspace preferences must be an object';
  end if;

  if pg_column_size(new.workspace_preferences) > 8192 then
    raise exception 'Client Card workspace preferences are too large';
  end if;

  for pref_key in
    select jsonb_object_keys(new.workspace_preferences)
  loop
    if pref_key <> all (array['version', 'template', 'order', 'collapsed', 'hidden']) then
      raise exception 'Unsupported Client Card workspace preference: %', pref_key;
    end if;
  end loop;

  if jsonb_typeof(new.workspace_preferences -> 'version') is distinct from 'number'
     or coalesce((new.workspace_preferences ->> 'version')::integer, 0) <> 1 then
    raise exception 'Unsupported Client Card workspace preference version';
  end if;

  if jsonb_typeof(new.workspace_preferences -> 'template') is distinct from 'string'
     or coalesce(new.workspace_preferences ->> 'template', 'general')
     <> all (array['general', 'lashes', 'nails', 'hair', 'brows', 'facial']) then
    raise exception 'Unsupported Client Card template key';
  end if;

  if jsonb_typeof(new.workspace_preferences -> 'order') is distinct from 'array' then
    raise exception 'Client Card section order must be an array';
  end if;

  seen_sections := '{}'::text[];
  for section_value in
    select value from jsonb_array_elements(new.workspace_preferences -> 'order')
  loop
    if jsonb_typeof(section_value) <> 'string' then
      raise exception 'Client Card section IDs must be strings';
    end if;
    section_name := section_value #>> '{}';
    if section_name <> all (allowed_sections) or section_name = any (seen_sections) then
      raise exception 'Invalid or duplicate Client Card section ID';
    end if;
    seen_sections := array_append(seen_sections, section_name);
  end loop;

  if cardinality(seen_sections) <> cardinality(allowed_sections)
     or not (seen_sections @> allowed_sections) then
    raise exception 'Client Card section order must include every supported section exactly once';
  end if;

  foreach pref_key in array array['collapsed', 'hidden']
  loop
    if jsonb_typeof(new.workspace_preferences -> pref_key) is distinct from 'array' then
      raise exception 'Client Card % sections must be an array', pref_key;
    end if;

    seen_sections := '{}'::text[];
    for section_value in
      select value from jsonb_array_elements(new.workspace_preferences -> pref_key)
    loop
      if jsonb_typeof(section_value) <> 'string' then
        raise exception 'Client Card section IDs must be strings';
      end if;
      section_name := section_value #>> '{}';
      if section_name = any (seen_sections) then
        raise exception 'Client Card % sections cannot contain duplicates', pref_key;
      end if;
      if pref_key = 'hidden' and section_name <> all (optional_sections) then
        raise exception 'Only optional Client Card sections may be hidden';
      elsif pref_key = 'collapsed' and section_name <> all (allowed_sections) then
        raise exception 'Invalid collapsed Client Card section';
      end if;
      seen_sections := array_append(seen_sections, section_name);
    end loop;
  end loop;

  return new;
exception
  when invalid_text_representation then
    raise exception 'Client Card workspace preference version must be numeric';
end;
$$;

drop trigger if exists validate_artist_client_card_workspace_v2
  on public.artist_client_cards;

create trigger validate_artist_client_card_workspace_v2
before insert or update on public.artist_client_cards
for each row execute function public.validate_artist_client_card_workspace_v2();

commit;
