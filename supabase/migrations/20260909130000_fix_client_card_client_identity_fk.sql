begin;

-- Client request identity is the authenticated user ID. A public profiles row is
-- optional and must not prevent a valid professional/client relationship card.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'artist_client_cards_client_id_fkey'
      and conrelid = 'public.artist_client_cards'::regclass
      and confrelid <> 'auth.users'::regclass
  ) then
    alter table public.artist_client_cards
      drop constraint artist_client_cards_client_id_fkey;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'artist_client_cards_client_id_fkey'
      and conrelid = 'public.artist_client_cards'::regclass
      and confrelid = 'auth.users'::regclass
  ) then
    alter table public.artist_client_cards
      add constraint artist_client_cards_client_id_fkey
      foreign key (client_id)
      references auth.users(id)
      on delete cascade;
  end if;
end;
$$;

comment on column public.artist_client_cards.client_id is
  'Authenticated client user ID. A matching professional/client request relationship remains required by trigger and RLS.';

commit;
