begin;

-- This migration depends on 20260909140000_add_client_notes_workspace_v1.sql.
alter table public.artist_client_notes
  add column if not exists reminder_due_on date,
  add column if not exists reminder_due_time time without time zone,
  add column if not exists reminder_completed_at timestamptz;

comment on column public.artist_client_notes.reminder_due_on is
  'Optional local due date for Reminder notes. No scheduled notification is implied.';
comment on column public.artist_client_notes.reminder_due_time is
  'Optional local due time for Reminder notes; requires reminder_due_on.';
comment on column public.artist_client_notes.reminder_completed_at is
  'When present, the Reminder note is complete. Reminder status is otherwise derived at read time.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artist_client_notes_reminder_fields_check'
      and conrelid = 'public.artist_client_notes'::regclass
  ) then
    alter table public.artist_client_notes
      add constraint artist_client_notes_reminder_fields_check check (
        (
          note_type = 'reminder'
          and (reminder_due_time is null or reminder_due_on is not null)
        )
        or (
          note_type <> 'reminder'
          and reminder_due_on is null
          and reminder_due_time is null
          and reminder_completed_at is null
        )
      );
  end if;
end;
$$;

create index if not exists artist_client_notes_open_reminders_idx
  on public.artist_client_notes (artist_id, client_id, reminder_due_on, reminder_due_time)
  where note_type = 'reminder' and reminder_completed_at is null;

create table if not exists public.artist_client_note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.artist_client_notes(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  constraint artist_client_note_attachments_slot_check check (sort_order between 0 and 3),
  constraint artist_client_note_attachments_note_slot_key unique (note_id, sort_order),
  constraint artist_client_note_attachments_caption_check check (
    caption is null
    or (
      caption = btrim(caption)
      and char_length(caption) between 1 and 200
    )
  )
);

comment on table public.artist_client_note_attachments is
  'Professional-private Inspiration note images. Storage objects are authorized through these metadata rows.';

create index if not exists artist_client_note_attachments_note_idx
  on public.artist_client_note_attachments (note_id, sort_order);

create or replace function public.can_manage_artist_client_note(target_note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.artist_client_notes note
    where note.id = target_note_id
      and note.artist_id = (select auth.uid())
      and exists (
        select 1
        from public.client_requests request
        where request.artist_id = note.artist_id
          and request.client_id = note.client_id
      )
  );
$$;

revoke all on function public.can_manage_artist_client_note(uuid) from public;
grant execute on function public.can_manage_artist_client_note(uuid) to authenticated;
grant execute on function public.can_manage_artist_client_note(uuid) to service_role;

create or replace function public.validate_artist_client_note_attachment_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_note public.artist_client_notes%rowtype;
  expected_prefix text;
  file_name text;
begin
  if tg_op = 'UPDATE'
    and (
      new.note_id is distinct from old.note_id
      or new.storage_path is distinct from old.storage_path
      or new.sort_order is distinct from old.sort_order
    )
  then
    raise exception 'Note attachment identity, path, and position cannot be changed.'
      using errcode = '23514';
  end if;

  select * into parent_note
  from public.artist_client_notes note
  where note.id = new.note_id;

  if not found or parent_note.note_type <> 'inspiration' then
    raise exception 'Only Inspiration notes may own image attachments.'
      using errcode = '23514';
  end if;

  expected_prefix := parent_note.artist_id::text || '/'
    || parent_note.client_id::text || '/'
    || parent_note.id::text || '/';
  file_name := split_part(new.storage_path, '/', 4);

  if char_length(new.storage_path) > 512
    or array_length(string_to_array(new.storage_path, '/'), 1) <> 4
    or strpos(new.storage_path, expected_prefix) <> 1
    or lower(file_name) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  then
    raise exception 'Note attachment path must match its professional, client, and Inspiration note.'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    new.created_at = now();
  else
    new.created_at = old.created_at;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_artist_client_note_attachment_v1() from public;

drop trigger if exists validate_artist_client_note_attachment_v1_trigger
  on public.artist_client_note_attachments;
create trigger validate_artist_client_note_attachment_v1_trigger
before insert or update on public.artist_client_note_attachments
for each row execute function public.validate_artist_client_note_attachment_v1();

-- Extend the existing note guard without changing its ownership/request protections.
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

  if new.note_type <> 'reminder'
    and (
      new.reminder_due_on is not null
      or new.reminder_due_time is not null
      or new.reminder_completed_at is not null
    )
  then
    raise exception 'Reminder fields may only be used by Reminder notes.'
      using errcode = '23514';
  end if;

  if new.reminder_due_time is not null and new.reminder_due_on is null then
    raise exception 'A reminder due time requires a due date.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
    and old.note_type = 'inspiration'
    and new.note_type <> 'inspiration'
    and exists (
      select 1 from public.artist_client_note_attachments attachment
      where attachment.note_id = old.id
    )
  then
    raise exception 'Remove Inspiration images before changing this note type.'
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

alter table public.artist_client_note_attachments enable row level security;
alter table public.artist_client_note_attachments force row level security;

drop policy if exists "Professionals can read their own Client Note attachments"
  on public.artist_client_note_attachments;
create policy "Professionals can read their own Client Note attachments"
on public.artist_client_note_attachments
for select
to authenticated
using (public.can_manage_artist_client_note(note_id));

drop policy if exists "Professionals can create their own Client Note attachments"
  on public.artist_client_note_attachments;
create policy "Professionals can create their own Client Note attachments"
on public.artist_client_note_attachments
for insert
to authenticated
with check (public.can_manage_artist_client_note(note_id));

drop policy if exists "Professionals can update their own Client Note attachments"
  on public.artist_client_note_attachments;
create policy "Professionals can update their own Client Note attachments"
on public.artist_client_note_attachments
for update
to authenticated
using (public.can_manage_artist_client_note(note_id))
with check (public.can_manage_artist_client_note(note_id));

drop policy if exists "Professionals can delete their own Client Note attachments"
  on public.artist_client_note_attachments;
create policy "Professionals can delete their own Client Note attachments"
on public.artist_client_note_attachments
for delete
to authenticated
using (public.can_manage_artist_client_note(note_id));

revoke all on table public.artist_client_note_attachments from public;
revoke all on table public.artist_client_note_attachments from anon;
grant select, insert, update, delete on table public.artist_client_note_attachments to authenticated;
grant all on table public.artist_client_note_attachments to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'client-note-images',
  'client-note-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Professionals can upload registered Client Note images"
  on storage.objects;
create policy "Professionals can upload registered Client Note images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-note-images'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1
    from public.artist_client_note_attachments attachment
    where attachment.storage_path = name
      and public.can_manage_artist_client_note(attachment.note_id)
  )
);

drop policy if exists "Professionals can read registered Client Note images"
  on storage.objects;
create policy "Professionals can read registered Client Note images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-note-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.artist_client_note_attachments attachment
    where attachment.storage_path = name
      and public.can_manage_artist_client_note(attachment.note_id)
  )
);

drop policy if exists "Professionals can delete registered Client Note images"
  on storage.objects;
create policy "Professionals can delete registered Client Note images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-note-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.artist_client_note_attachments attachment
    where attachment.storage_path = name
      and public.can_manage_artist_client_note(attachment.note_id)
  )
);

commit;
