begin;

-- Client Cards become durable relationship records. Manual clients never need
-- fake Auth users or profiles rows.
alter table public.artist_client_cards
  add column if not exists id uuid,
  add column if not exists source text not null default 'lumina_request',
  add column if not exists manual_name text,
  add column if not exists manual_phone text,
  add column if not exists manual_email text;

update public.artist_client_cards set id = gen_random_uuid() where id is null;

alter table public.artist_client_cards
  alter column id set default gen_random_uuid(),
  alter column id set not null;

-- Create any card that was previously represented only by request history.
insert into public.artist_client_cards (artist_id, client_id, source)
select distinct request.artist_id, request.client_id, 'lumina_request'
from public.client_requests request
where request.artist_id is not null and request.client_id is not null
on conflict (artist_id, client_id) do nothing;

alter table public.artist_client_cards
  drop constraint if exists artist_client_cards_pkey;
alter table public.artist_client_cards
  alter column client_id drop not null,
  add constraint artist_client_cards_pkey primary key (id);

create unique index if not exists artist_client_cards_linked_client_key
  on public.artist_client_cards (artist_id, client_id)
  where client_id is not null;

alter table public.artist_client_cards
  add constraint artist_client_cards_source_check
    check (source in ('lumina_request', 'manual')),
  add constraint artist_client_cards_identity_check check (
    (source = 'lumina_request' and client_id is not null)
    or (
      source = 'manual'
      and manual_name is not null
      and manual_name = btrim(manual_name)
      and char_length(manual_name) between 1 and 120
    )
  ),
  add constraint artist_client_cards_manual_phone_check check (
    manual_phone is null
    or (manual_phone = btrim(manual_phone) and char_length(manual_phone) between 1 and 40)
  ),
  add constraint artist_client_cards_manual_email_check check (
    manual_email is null
    or (
      manual_email = btrim(manual_email)
      and char_length(manual_email) between 3 and 254
      and strpos(manual_email, '@') > 1
    )
  );

comment on column public.artist_client_cards.id is
  'Permanent professional/client relationship identifier used by Client Card routes and child records.';
comment on column public.artist_client_cards.source is
  'Immutable provenance: lumina_request or manual. Manual provenance remains manual after future linking.';
comment on column public.artist_client_cards.client_id is
  'Optional authenticated Lumina client identity. Null for an unlinked manual client.';
comment on column public.artist_client_cards.manual_name is
  'Professional-owned relationship name that never updates a client account or profile.';
comment on column public.artist_client_cards.manual_phone is
  'Professional-private contact detail that never updates a client account or profile.';
comment on column public.artist_client_cards.manual_email is
  'Professional-private contact detail that never updates a client account or profile.';

create or replace function public.can_manage_artist_client_card(target_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.artist_client_cards card
    where card.id = target_card_id
      and card.artist_id = (select auth.uid())
  );
$$;

revoke all on function public.can_manage_artist_client_card(uuid) from public;
grant execute on function public.can_manage_artist_client_card(uuid) to authenticated;
grant execute on function public.can_manage_artist_client_card(uuid) to service_role;

create or replace function public.validate_artist_client_card_relationship()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.artist_id is distinct from old.artist_id
    or new.source is distinct from old.source
    or new.client_id is distinct from old.client_id
  ) then
    raise exception 'Client Card identity and provenance cannot be changed.' using errcode = '23514';
  end if;

  if new.source = 'lumina_request' and not exists (
    select 1 from public.client_requests request
    where request.artist_id = new.artist_id and request.client_id = new.client_id
  ) then
    raise exception 'A Lumina Client Card requires an existing request relationship.' using errcode = '23514';
  end if;

  if new.source = 'manual' and tg_op = 'INSERT' and new.client_id is not null then
    raise exception 'Manual clients cannot be linked automatically.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_artist_client_card_relationship() from public;
drop trigger if exists validate_artist_client_card_relationship_trigger on public.artist_client_cards;
create trigger validate_artist_client_card_relationship_trigger
before insert or update on public.artist_client_cards
for each row execute function public.validate_artist_client_card_relationship();

alter table public.artist_client_cards enable row level security;
alter table public.artist_client_cards force row level security;
revoke all on table public.artist_client_cards from public;
revoke all on table public.artist_client_cards from anon;
grant select, insert, update, delete on table public.artist_client_cards to authenticated;
grant all on table public.artist_client_cards to service_role;

drop policy if exists "Professionals can read their own Client Cards" on public.artist_client_cards;
create policy "Professionals can read their own Client Cards"
on public.artist_client_cards for select to authenticated
using ((select auth.uid()) = artist_id);

drop policy if exists "Professionals can create their own Client Cards" on public.artist_client_cards;
create policy "Professionals can create their own Client Cards"
on public.artist_client_cards for insert to authenticated
with check (
  (select auth.uid()) = artist_id
  and (
    (source = 'manual' and client_id is null)
    or (
      source = 'lumina_request' and client_id is not null
      and exists (
        select 1 from public.client_requests request
        where request.artist_id = artist_client_cards.artist_id
          and request.client_id = artist_client_cards.client_id
      )
    )
  )
);

drop policy if exists "Professionals can update their own Client Cards" on public.artist_client_cards;
create policy "Professionals can update their own Client Cards"
on public.artist_client_cards for update to authenticated
using ((select auth.uid()) = artist_id)
with check ((select auth.uid()) = artist_id);

drop policy if exists "Professionals can delete their own Client Cards" on public.artist_client_cards;
create policy "Professionals can delete their own Client Cards"
on public.artist_client_cards for delete to authenticated
using ((select auth.uid()) = artist_id);

-- Notes now attach to the permanent card. Existing client_id values remain for
-- linked records; manual notes keep client_id null.
alter table public.artist_client_notes add column if not exists client_card_id uuid;

update public.artist_client_notes note
set client_card_id = card.id
from public.artist_client_cards card
where note.client_card_id is null
  and card.artist_id = note.artist_id
  and card.client_id = note.client_id;

do $$
begin
  if exists (select 1 from public.artist_client_notes where client_card_id is null) then
    raise exception 'Every existing Client Note must resolve to a Client Card before migration.';
  end if;
end $$;

alter table public.artist_client_notes
  alter column client_card_id set not null,
  alter column client_id drop not null,
  add constraint artist_client_notes_client_card_id_fkey
    foreign key (client_card_id) references public.artist_client_cards(id) on delete cascade;

create index if not exists artist_client_notes_card_feed_idx
  on public.artist_client_notes (client_card_id, is_pinned desc, updated_at desc);

alter table public.artist_client_notes enable row level security;
alter table public.artist_client_notes force row level security;

create or replace function public.validate_artist_client_note_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_card public.artist_client_cards%rowtype;
begin
  if tg_op = 'UPDATE' and (
    new.artist_id is distinct from old.artist_id
    or new.client_id is distinct from old.client_id
    or new.client_card_id is distinct from old.client_card_id
  ) then
    raise exception 'Client Note ownership cannot be changed.' using errcode = '23514';
  end if;

  select * into parent_card
  from public.artist_client_cards card
  where card.id = new.client_card_id;

  if not found
    or parent_card.artist_id is distinct from new.artist_id
    or parent_card.client_id is distinct from new.client_id
  then
    raise exception 'A Client Note must match its Client Card relationship.' using errcode = '23514';
  end if;

  if new.request_id is not null and not exists (
    select 1 from public.client_requests request
    where request.id = new.request_id
      and request.artist_id = parent_card.artist_id
      and request.client_id = parent_card.client_id
  ) then
    raise exception 'A Client Note may only link to a request for the same Client Card.' using errcode = '23514';
  end if;

  if new.note_type <> 'reminder' and (
    new.reminder_due_on is not null
    or new.reminder_due_time is not null
    or new.reminder_completed_at is not null
  ) then
    raise exception 'Reminder fields may only be used by Reminder notes.' using errcode = '23514';
  end if;

  if new.reminder_due_time is not null and new.reminder_due_on is null then
    raise exception 'A reminder due time requires a due date.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
    and old.note_type = 'inspiration'
    and new.note_type <> 'inspiration'
    and exists (
      select 1 from public.artist_client_note_attachments attachment
      where attachment.note_id = old.id
    )
  then
    raise exception 'Remove Inspiration images before changing this note type.' using errcode = '23514';
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
    join public.artist_client_cards card on card.id = note.client_card_id
    where note.id = target_note_id
      and card.artist_id = (select auth.uid())
  );
$$;

revoke all on function public.can_manage_artist_client_note(uuid) from public;
grant execute on function public.can_manage_artist_client_note(uuid) to authenticated;
grant execute on function public.can_manage_artist_client_note(uuid) to service_role;

drop policy if exists "Professionals can read their own Client Notes" on public.artist_client_notes;
create policy "Professionals can read their own Client Notes"
on public.artist_client_notes for select to authenticated
using (public.can_manage_artist_client_card(client_card_id));

drop policy if exists "Professionals can create their own Client Notes" on public.artist_client_notes;
create policy "Professionals can create their own Client Notes"
on public.artist_client_notes for insert to authenticated
with check (public.can_manage_artist_client_card(client_card_id));

drop policy if exists "Professionals can update their own Client Notes" on public.artist_client_notes;
create policy "Professionals can update their own Client Notes"
on public.artist_client_notes for update to authenticated
using (public.can_manage_artist_client_card(client_card_id))
with check (public.can_manage_artist_client_card(client_card_id));

drop policy if exists "Professionals can delete their own Client Notes" on public.artist_client_notes;
create policy "Professionals can delete their own Client Notes"
on public.artist_client_notes for delete to authenticated
using (public.can_manage_artist_client_card(client_card_id));

create or replace function public.validate_artist_client_note_attachment_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_note public.artist_client_notes%rowtype;
  card_prefix text;
  legacy_prefix text;
  file_name text;
begin
  if tg_op = 'UPDATE' and (
    new.note_id is distinct from old.note_id
    or new.storage_path is distinct from old.storage_path
    or new.sort_order is distinct from old.sort_order
  ) then
    raise exception 'Note attachment identity, path, and position cannot be changed.' using errcode = '23514';
  end if;

  select * into parent_note from public.artist_client_notes note where note.id = new.note_id;
  if not found or parent_note.note_type <> 'inspiration' then
    raise exception 'Only Inspiration notes may own image attachments.' using errcode = '23514';
  end if;

  card_prefix := parent_note.artist_id::text || '/'
    || parent_note.client_card_id::text || '/' || parent_note.id::text || '/';
  legacy_prefix := case when parent_note.client_id is null then null else
    parent_note.artist_id::text || '/' || parent_note.client_id::text || '/'
    || parent_note.id::text || '/' end;
  file_name := split_part(new.storage_path, '/', 4);

  if char_length(new.storage_path) > 512
    or array_length(string_to_array(new.storage_path, '/'), 1) <> 4
    or (
      strpos(new.storage_path, card_prefix) <> 1
      and (legacy_prefix is null or strpos(new.storage_path, legacy_prefix) <> 1)
    )
    or lower(file_name) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  then
    raise exception 'Note attachment path must match its professional, Client Card, and Inspiration note.' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then new.created_at = now();
  else new.created_at = old.created_at;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_artist_client_note_attachment_v1() from public;

-- These rows represent completed off-platform services only. They never create
-- request lifecycle state or verified-review eligibility.
create table public.artist_client_service_entries (
  id uuid primary key default gen_random_uuid(),
  client_card_id uuid not null references public.artist_client_cards(id) on delete cascade,
  service_name text not null,
  service_date date not null,
  price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_client_service_entries_name_check check (
    service_name = btrim(service_name)
    and char_length(service_name) between 1 and 120
  ),
  constraint artist_client_service_entries_price_check check (
    price is null or (price >= 0 and price <= 999999.99)
  )
);

comment on table public.artist_client_service_entries is
  'Professional-private completed off-platform service history, independent from requests and reviews.';

create index artist_client_service_entries_card_date_idx
  on public.artist_client_service_entries (client_card_id, service_date desc, created_at desc);

create or replace function public.validate_artist_client_service_entry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.client_card_id is distinct from old.client_card_id then
    raise exception 'Service history ownership cannot be changed.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.artist_client_cards card
    where card.id = new.client_card_id and card.source = 'manual'
  ) then
    raise exception 'Manual service history requires a manual-origin Client Card.' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then new.created_at = now();
  else new.created_at = old.created_at;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.validate_artist_client_service_entry() from public;
create trigger validate_artist_client_service_entry_trigger
before insert or update on public.artist_client_service_entries
for each row execute function public.validate_artist_client_service_entry();

alter table public.artist_client_service_entries enable row level security;
alter table public.artist_client_service_entries force row level security;
create policy "Professionals can read their own manual service history"
on public.artist_client_service_entries for select to authenticated
using (public.can_manage_artist_client_card(client_card_id));
create policy "Professionals can create their own manual service history"
on public.artist_client_service_entries for insert to authenticated
with check (public.can_manage_artist_client_card(client_card_id));
create policy "Professionals can update their own manual service history"
on public.artist_client_service_entries for update to authenticated
using (public.can_manage_artist_client_card(client_card_id))
with check (public.can_manage_artist_client_card(client_card_id));
create policy "Professionals can delete their own manual service history"
on public.artist_client_service_entries for delete to authenticated
using (public.can_manage_artist_client_card(client_card_id));

revoke all on table public.artist_client_service_entries from public;
revoke all on table public.artist_client_service_entries from anon;
grant select, insert, update, delete on table public.artist_client_service_entries to authenticated;
grant all on table public.artist_client_service_entries to service_role;

-- This mapping is private. portfolio_images and its storage retain their current
-- public visibility and contain no manual-client identity.
create table public.artist_client_result_links (
  client_card_id uuid not null references public.artist_client_cards(id) on delete cascade,
  portfolio_image_id uuid not null references public.portfolio_images(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_card_id, portfolio_image_id)
);

comment on table public.artist_client_result_links is
  'Professional-private association between a manual-origin Client Card and existing professional-owned public work.';

create index artist_client_result_links_image_idx
  on public.artist_client_result_links (portfolio_image_id);

create or replace function public.validate_artist_client_result_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and (
    new.client_card_id is distinct from old.client_card_id
    or new.portfolio_image_id is distinct from old.portfolio_image_id
  ) then
    raise exception 'Client Card result-link identity cannot be changed.' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.artist_client_cards card
    join public.portfolio_images image on image.id = new.portfolio_image_id
    where card.id = new.client_card_id
      and card.source = 'manual'
      and image.artist_id = card.artist_id
  ) then
    raise exception 'Client Card media must belong to the same professional and a manual-origin card.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_artist_client_result_link() from public;
create trigger validate_artist_client_result_link_trigger
before insert or update on public.artist_client_result_links
for each row execute function public.validate_artist_client_result_link();

alter table public.artist_client_result_links enable row level security;
alter table public.artist_client_result_links force row level security;
create policy "Professionals can read their own Client Card result links"
on public.artist_client_result_links for select to authenticated
using (public.can_manage_artist_client_card(client_card_id));
create policy "Professionals can create their own Client Card result links"
on public.artist_client_result_links for insert to authenticated
with check (public.can_manage_artist_client_card(client_card_id));
create policy "Professionals can delete their own Client Card result links"
on public.artist_client_result_links for delete to authenticated
using (public.can_manage_artist_client_card(client_card_id));

revoke all on table public.artist_client_result_links from public;
revoke all on table public.artist_client_result_links from anon;
grant select, insert, delete on table public.artist_client_result_links to authenticated;
grant all on table public.artist_client_result_links to service_role;

-- New Lumina requests create or restore exactly one linked card. Existing manual
-- cards are never matched by contact details or linked automatically.
create or replace function public.restore_archived_client_card_on_new_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.artist_id is not null and new.client_id is not null then
    insert into public.artist_client_cards (artist_id, client_id, source, archived_at)
    values (new.artist_id, new.client_id, 'lumina_request', null)
    on conflict (artist_id, client_id) where client_id is not null
    do update set archived_at = null;
  end if;
  return null;
end;
$$;

revoke all on function public.restore_archived_client_card_on_new_request() from public;

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

  delete from public.artist_client_cards card
  where card.artist_id = old.artist_id
    and card.client_id = old.client_id
    and card.source = 'lumina_request'
    and not exists (
      select 1 from public.client_requests request
      where request.artist_id = old.artist_id and request.client_id = old.client_id
    );
  return null;
end;
$$;

revoke all on function public.remove_orphaned_artist_client_card() from public;

commit;
