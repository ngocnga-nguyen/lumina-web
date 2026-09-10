begin;

create table if not exists public.artist_client_notes (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.client_requests(id) on delete set null,
  note_type text not null default 'general',
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_client_notes_type_check check (
    note_type in ('general', 'service_note', 'follow_up', 'inspiration', 'aftercare', 'reminder')
  ),
  constraint artist_client_notes_title_check check (
    title = btrim(title)
    and char_length(title) between 1 and 120
  ),
  constraint artist_client_notes_body_nonempty_check check (btrim(body) <> '')
);

comment on table public.artist_client_notes is
  'Professional-private notes for a client relationship. Notes are never client-visible.';

comment on column public.artist_client_notes.request_id is
  'Optional link to an existing request belonging to the same professional/client relationship.';

create index if not exists artist_client_notes_feed_idx
  on public.artist_client_notes (artist_id, client_id, is_pinned desc, updated_at desc);

create index if not exists artist_client_notes_request_idx
  on public.artist_client_notes (request_id)
  where request_id is not null;

create or replace function public.validate_artist_client_note_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
    and (
      new.artist_id is distinct from old.artist_id
      or new.client_id is distinct from old.client_id
    )
  then
    raise exception 'Client Note ownership cannot be changed.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.client_requests request
    where request.artist_id = new.artist_id
      and request.client_id = new.client_id
  ) then
    -- Allow a foreign-key unlink while the final request is being deleted.
    -- The existing request cleanup trigger removes the now-orphaned note row.
    if tg_op = 'UPDATE'
      and new.artist_id is not distinct from old.artist_id
      and new.client_id is not distinct from old.client_id
      and new.request_id is null
      and old.request_id is not null
    then
      new.created_at = old.created_at;
      new.updated_at = now();
      return new;
    end if;

    raise exception 'A Client Note requires an existing professional/client request relationship.'
      using errcode = '23514';
  end if;

  if new.request_id is not null
    and not exists (
      select 1
      from public.client_requests request
      where request.id = new.request_id
        and request.artist_id = new.artist_id
        and request.client_id = new.client_id
    )
  then
    raise exception 'A Client Note may only link to a request for the same professional and client.'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    new.created_at = now();
    new.updated_at = now();
  else
    new.created_at = old.created_at;
    new.updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.validate_artist_client_note_v1() from public;

create or replace function public.unlink_client_notes_from_changed_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.artist_id is not distinct from old.artist_id
    and new.client_id is not distinct from old.client_id
  then
    return null;
  end if;

  delete from public.artist_client_notes note
  where note.request_id = old.id
    and not exists (
      select 1
      from public.client_requests request
      where request.artist_id = note.artist_id
        and request.client_id = note.client_id
    );

  update public.artist_client_notes note
  set request_id = null
  where note.request_id = old.id;

  return null;
end;
$$;

revoke all on function public.unlink_client_notes_from_changed_request() from public;

drop trigger if exists unlink_client_notes_from_changed_request_trigger
  on public.client_requests;

create trigger unlink_client_notes_from_changed_request_trigger
after update of artist_id, client_id on public.client_requests
for each row execute function public.unlink_client_notes_from_changed_request();

create or replace function public.remove_orphaned_artist_client_card()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
    and old.artist_id is not distinct from new.artist_id
    and old.client_id is not distinct from new.client_id
  then
    return null;
  end if;

  if not exists (
    select 1
    from public.client_requests request
    where request.artist_id = old.artist_id
      and request.client_id = old.client_id
  ) then
    delete from public.artist_client_notes note
    where note.artist_id = old.artist_id
      and note.client_id = old.client_id;

    delete from public.artist_client_cards card
    where card.artist_id = old.artist_id
      and card.client_id = old.client_id;
  end if;

  return null;
end;
$$;

revoke all on function public.remove_orphaned_artist_client_card() from public;

alter table public.artist_client_notes enable row level security;
alter table public.artist_client_notes force row level security;

drop policy if exists "Professionals can read their own Client Notes"
  on public.artist_client_notes;
create policy "Professionals can read their own Client Notes"
on public.artist_client_notes
for select
to authenticated
using (
  (select auth.uid()) = artist_id
  and exists (
    select 1
    from public.client_requests request
    where request.artist_id = artist_client_notes.artist_id
      and request.client_id = artist_client_notes.client_id
  )
);

drop policy if exists "Professionals can create their own Client Notes"
  on public.artist_client_notes;
create policy "Professionals can create their own Client Notes"
on public.artist_client_notes
for insert
to authenticated
with check (
  (select auth.uid()) = artist_id
  and exists (
    select 1
    from public.client_requests request
    where request.artist_id = artist_client_notes.artist_id
      and request.client_id = artist_client_notes.client_id
  )
);

drop policy if exists "Professionals can update their own Client Notes"
  on public.artist_client_notes;
create policy "Professionals can update their own Client Notes"
on public.artist_client_notes
for update
to authenticated
using ((select auth.uid()) = artist_id)
with check (
  (select auth.uid()) = artist_id
  and exists (
    select 1
    from public.client_requests request
    where request.artist_id = artist_client_notes.artist_id
      and request.client_id = artist_client_notes.client_id
  )
);

drop policy if exists "Professionals can delete their own Client Notes"
  on public.artist_client_notes;
create policy "Professionals can delete their own Client Notes"
on public.artist_client_notes
for delete
to authenticated
using ((select auth.uid()) = artist_id);

revoke all on table public.artist_client_notes from public;
revoke all on table public.artist_client_notes from anon;
grant select, insert, update, delete on table public.artist_client_notes to authenticated;
grant all on table public.artist_client_notes to service_role;

-- Preserve the legacy field and copy it exactly once into the multi-note workspace.
-- A deterministic UUID makes this backfill safe to rerun without duplicate notes.
insert into public.artist_client_notes (
  id,
  artist_id,
  client_id,
  note_type,
  title,
  body,
  is_pinned,
  created_at,
  updated_at
)
select
  md5(card.artist_id::text || ':' || card.client_id::text || ':legacy-private-notes')::uuid,
  card.artist_id,
  card.client_id,
  'general',
  'Imported client note',
  card.private_notes,
  false,
  card.created_at,
  card.updated_at
from public.artist_client_cards card
where btrim(card.private_notes) <> ''
on conflict (id) do nothing;

-- The backfill must preserve every nonempty legacy note exactly, including any
-- note that predates the V1 input limit. NOT VALID keeps those rows intact while
-- enforcing the limit for all new and subsequently edited notes.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'artist_client_notes_body_length_check'
      and conrelid = 'public.artist_client_notes'::regclass
  ) then
    alter table public.artist_client_notes
      add constraint artist_client_notes_body_length_check
      check (char_length(body) <= 20000)
      not valid;
  end if;
end;
$$;

drop trigger if exists validate_artist_client_note_v1_trigger
  on public.artist_client_notes;

create trigger validate_artist_client_note_v1_trigger
before insert or update on public.artist_client_notes
for each row execute function public.validate_artist_client_note_v1();

commit;
