begin;

create table if not exists public.artist_client_cards (
  artist_id uuid not null references public.artists(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  private_notes text not null default '',
  preferences text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (artist_id, client_id)
);

comment on table public.artist_client_cards is
  'Private professional-owned notes and simple preferences for clients with an existing Lumina request relationship.';

comment on column public.artist_client_cards.private_notes is
  'Visible only to the professional identified by artist_id.';

comment on column public.artist_client_cards.preferences is
  'Simple non-medical client preferences visible only to the professional identified by artist_id.';

create index if not exists client_requests_artist_client_idx
  on public.client_requests (artist_id, client_id);

create or replace function public.validate_artist_client_card_relationship()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.client_requests request
    where request.artist_id = new.artist_id
      and request.client_id = new.client_id
  ) then
    raise exception
      'A Client Card requires an existing request relationship between this professional and client.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_artist_client_card_relationship() from public;

drop trigger if exists validate_artist_client_card_relationship_trigger
  on public.artist_client_cards;

create trigger validate_artist_client_card_relationship_trigger
before insert or update of artist_id, client_id
on public.artist_client_cards
for each row
execute function public.validate_artist_client_card_relationship();

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
    delete from public.artist_client_cards card
    where card.artist_id = old.artist_id
      and card.client_id = old.client_id;
  end if;

  return null;
end;
$$;

revoke all on function public.remove_orphaned_artist_client_card() from public;

drop trigger if exists remove_orphaned_artist_client_card_trigger
  on public.client_requests;

create trigger remove_orphaned_artist_client_card_trigger
after delete or update of artist_id, client_id
on public.client_requests
for each row
execute function public.remove_orphaned_artist_client_card();

create or replace function public.set_artist_client_card_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_artist_client_card_updated_at() from public;

drop trigger if exists set_artist_client_card_updated_at_trigger
  on public.artist_client_cards;

create trigger set_artist_client_card_updated_at_trigger
before update
on public.artist_client_cards
for each row
execute function public.set_artist_client_card_updated_at();

alter table public.artist_client_cards enable row level security;
alter table public.artist_client_cards force row level security;

drop policy if exists "Professionals can read their own Client Cards"
  on public.artist_client_cards;
create policy "Professionals can read their own Client Cards"
on public.artist_client_cards
for select
to authenticated
using ((select auth.uid()) = artist_id);

drop policy if exists "Professionals can create their own Client Cards"
  on public.artist_client_cards;
create policy "Professionals can create their own Client Cards"
on public.artist_client_cards
for insert
to authenticated
with check (
  (select auth.uid()) = artist_id
  and exists (
    select 1
    from public.client_requests request
    where request.artist_id = artist_client_cards.artist_id
      and request.client_id = artist_client_cards.client_id
  )
);

drop policy if exists "Professionals can update their own Client Cards"
  on public.artist_client_cards;
create policy "Professionals can update their own Client Cards"
on public.artist_client_cards
for update
to authenticated
using ((select auth.uid()) = artist_id)
with check (
  (select auth.uid()) = artist_id
  and exists (
    select 1
    from public.client_requests request
    where request.artist_id = artist_client_cards.artist_id
      and request.client_id = artist_client_cards.client_id
  )
);

drop policy if exists "Professionals can delete their own Client Cards"
  on public.artist_client_cards;
create policy "Professionals can delete their own Client Cards"
on public.artist_client_cards
for delete
to authenticated
using ((select auth.uid()) = artist_id);

revoke all on table public.artist_client_cards from public;
revoke all on table public.artist_client_cards from anon;
grant select, insert, update, delete on table public.artist_client_cards to authenticated;
grant all on table public.artist_client_cards to service_role;

alter table public.portfolio_images
  add column if not exists request_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolio_images_request_id_fkey'
      and conrelid = 'public.portfolio_images'::regclass
  ) then
    alter table public.portfolio_images
      add constraint portfolio_images_request_id_fkey
      foreign key (request_id)
      references public.client_requests(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolio_images_request_requires_result_check'
      and conrelid = 'public.portfolio_images'::regclass
  ) then
    alter table public.portfolio_images
      add constraint portfolio_images_request_requires_result_check
      check (request_id is null or entry_type = 'before_after');
  end if;
end $$;

create index if not exists portfolio_images_request_id_idx
  on public.portfolio_images (request_id)
  where request_id is not null;

create or replace function public.validate_result_request_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.request_id is null then
    return new;
  end if;

  if new.entry_type <> 'before_after' then
    raise exception 'Only Before & After Results may be linked to a completed request.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.client_requests request
    where request.id = new.request_id
      and request.artist_id = new.artist_id
      and request.booking_status = 'completed'
  ) then
    raise exception
      'A Result may only link to a completed request belonging to the same professional.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_result_request_link() from public;

drop trigger if exists validate_result_request_link_trigger
  on public.portfolio_images;

create trigger validate_result_request_link_trigger
before insert or update of request_id, artist_id, entry_type
on public.portfolio_images
for each row
execute function public.validate_result_request_link();

create or replace function public.unlink_result_from_invalid_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.booking_status is distinct from 'completed'
    or new.artist_id is distinct from old.artist_id
  then
    update public.portfolio_images result
    set request_id = null
    where result.request_id = old.id;
  end if;

  return null;
end;
$$;

revoke all on function public.unlink_result_from_invalid_request() from public;

drop trigger if exists unlink_result_from_invalid_request_trigger
  on public.client_requests;

create trigger unlink_result_from_invalid_request_trigger
after update of booking_status, artist_id
on public.client_requests
for each row
execute function public.unlink_result_from_invalid_request();

comment on column public.portfolio_images.request_id is
  'Optional completed client request linked to a Before & After Result. Linking does not change evidence_level.';

commit;
