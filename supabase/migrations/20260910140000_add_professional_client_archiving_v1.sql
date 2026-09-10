begin;

alter table public.artist_client_cards
  add column if not exists archived_at timestamptz;

comment on column public.artist_client_cards.archived_at is
  'Professional-private presentation state. Null means active; a timestamp means archived. Archiving never deletes client history.';

create index if not exists artist_client_cards_artist_archived_idx
  on public.artist_client_cards (artist_id, archived_at, client_id);

create or replace function public.restore_archived_client_card_on_new_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.artist_id is not null and new.client_id is not null then
    update public.artist_client_cards card
    set archived_at = null
    where card.artist_id = new.artist_id
      and card.client_id = new.client_id
      and card.archived_at is not null;
  end if;

  return null;
end;
$$;

revoke all on function public.restore_archived_client_card_on_new_request()
  from public;

drop trigger if exists restore_archived_client_card_on_new_request_trigger
  on public.client_requests;

create trigger restore_archived_client_card_on_new_request_trigger
after insert on public.client_requests
for each row
execute function public.restore_archived_client_card_on_new_request();

commit;
