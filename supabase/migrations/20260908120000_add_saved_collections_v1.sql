begin;

create or replace function public.is_client_account_v1()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and not exists (
      select 1
      from public.artists artist
      where artist.id = (select auth.uid())
    );
$$;

revoke all on function public.is_client_account_v1() from public;
grant execute on function public.is_client_account_v1() to authenticated;

create table if not exists public.saved_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_collections_name_check check (
    name = btrim(name)
    and char_length(name) between 1 and 60
    and lower(name) <> 'all saved'
  ),
  constraint saved_collections_id_user_id_key unique (id, user_id)
);

comment on table public.saved_collections is
  'Client-owned labels for organizing canonical saved_artists rows. All saved remains a virtual view.';

create unique index if not exists saved_collections_user_name_key
  on public.saved_collections (user_id, lower(name));

create index if not exists saved_collections_user_created_idx
  on public.saved_collections (user_id, created_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.saved_artists'::regclass
      and conname = 'saved_artists_id_user_id_key'
  ) then
    alter table public.saved_artists
      add constraint saved_artists_id_user_id_key unique (id, user_id);
  end if;
end
$$;

create table if not exists public.saved_collection_memberships (
  collection_id uuid not null,
  saved_artist_id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint saved_collection_memberships_pkey
    primary key (collection_id, saved_artist_id),
  constraint saved_collection_memberships_collection_owner_fkey
    foreign key (collection_id, user_id)
    references public.saved_collections (id, user_id)
    on delete cascade,
  constraint saved_collection_memberships_saved_owner_fkey
    foreign key (saved_artist_id, user_id)
    references public.saved_artists (id, user_id)
    on delete cascade
);

comment on table public.saved_collection_memberships is
  'Many-to-many membership between a client collection and that client''s existing global save.';

create index if not exists saved_collection_memberships_user_saved_idx
  on public.saved_collection_memberships (user_id, saved_artist_id);

create index if not exists saved_collection_memberships_user_collection_idx
  on public.saved_collection_memberships (user_id, collection_id);

create or replace function public.set_saved_collection_updated_at_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_saved_collection_updated_at_v1
  on public.saved_collections;

create trigger set_saved_collection_updated_at_v1
before update on public.saved_collections
for each row
execute function public.set_saved_collection_updated_at_v1();

alter table public.saved_collections enable row level security;
alter table public.saved_collection_memberships enable row level security;

revoke all on table public.saved_collections from anon, authenticated;
revoke all on table public.saved_collection_memberships from anon, authenticated;

grant select, insert, delete on table public.saved_collections to authenticated;
grant update (name) on table public.saved_collections to authenticated;
grant select, insert, delete on table public.saved_collection_memberships to authenticated;

drop policy if exists "Clients can view their own saved collections"
  on public.saved_collections;
create policy "Clients can view their own saved collections"
  on public.saved_collections
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_client_account_v1()
  );

drop policy if exists "Clients can create their own saved collections"
  on public.saved_collections;
create policy "Clients can create their own saved collections"
  on public.saved_collections
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_client_account_v1()
  );

drop policy if exists "Clients can rename their own saved collections"
  on public.saved_collections;
create policy "Clients can rename their own saved collections"
  on public.saved_collections
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_client_account_v1()
  )
  with check (
    user_id = (select auth.uid())
    and public.is_client_account_v1()
  );

drop policy if exists "Clients can delete their own saved collections"
  on public.saved_collections;
create policy "Clients can delete their own saved collections"
  on public.saved_collections
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_client_account_v1()
  );

drop policy if exists "Clients can view their own saved collection memberships"
  on public.saved_collection_memberships;
create policy "Clients can view their own saved collection memberships"
  on public.saved_collection_memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_client_account_v1()
  );

drop policy if exists "Clients can add their own saved collection memberships"
  on public.saved_collection_memberships;
create policy "Clients can add their own saved collection memberships"
  on public.saved_collection_memberships
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_client_account_v1()
  );

drop policy if exists "Clients can remove their own saved collection memberships"
  on public.saved_collection_memberships;
create policy "Clients can remove their own saved collection memberships"
  on public.saved_collection_memberships
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_client_account_v1()
  );

commit;
