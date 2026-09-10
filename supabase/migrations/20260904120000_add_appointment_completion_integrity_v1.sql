begin;

alter table public.client_requests
  add column if not exists scheduled_for timestamptz,
  add column if not exists completion_protocol_version smallint,
  add column if not exists artist_completion_response text,
  add column if not exists artist_completion_responded_at timestamptz,
  add column if not exists client_completion_response text,
  add column if not exists client_completion_responded_at timestamptz;

-- Replace the existing completion trigger transactionally. Dropping it before
-- the version backfill prevents legacy trigger logic from treating that
-- migration-only update as a user completion attempt.
drop trigger if exists protect_request_completion_trigger
  on public.client_requests;

-- Preserve completed rows as legacy completions. All other requests enter the
-- two-party protocol without inventing a historical response for either side.
update public.client_requests
set completion_protocol_version = case
  when booking_status = 'completed' then 1
  else 2
end
where completion_protocol_version is null;

alter table public.client_requests
  alter column completion_protocol_version set default 2,
  alter column completion_protocol_version set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_requests_completion_protocol_version_check'
      and conrelid = 'public.client_requests'::regclass
  ) then
    alter table public.client_requests
      add constraint client_requests_completion_protocol_version_check
      check (completion_protocol_version in (1, 2)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_requests_artist_completion_response_check'
      and conrelid = 'public.client_requests'::regclass
  ) then
    alter table public.client_requests
      add constraint client_requests_artist_completion_response_check
      check (
        artist_completion_response is null
        or artist_completion_response in ('confirmed', 'disputed')
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_requests_client_completion_response_check'
      and conrelid = 'public.client_requests'::regclass
  ) then
    alter table public.client_requests
      add constraint client_requests_client_completion_response_check
      check (
        client_completion_response is null
        or client_completion_response in ('confirmed', 'disputed')
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_requests_artist_completion_time_pair_check'
      and conrelid = 'public.client_requests'::regclass
  ) then
    alter table public.client_requests
      add constraint client_requests_artist_completion_time_pair_check
      check (
        (artist_completion_response is null and artist_completion_responded_at is null)
        or
        (artist_completion_response is not null and artist_completion_responded_at is not null)
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_requests_client_completion_time_pair_check'
      and conrelid = 'public.client_requests'::regclass
  ) then
    alter table public.client_requests
      add constraint client_requests_client_completion_time_pair_check
      check (
        (client_completion_response is null and client_completion_responded_at is null)
        or
        (client_completion_response is not null and client_completion_responded_at is not null)
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_requests_v2_completed_requires_two_confirmations_check'
      and conrelid = 'public.client_requests'::regclass
  ) then
    alter table public.client_requests
      add constraint client_requests_v2_completed_requires_two_confirmations_check
      check (
        booking_status <> 'completed'
        or completion_protocol_version = 1
        or (
          completion_protocol_version = 2
          and artist_completion_response = 'confirmed'
          and client_completion_response = 'confirmed'
          and completed_at is not null
        )
      ) not valid;
  end if;
end $$;

alter table public.client_requests
  validate constraint client_requests_completion_protocol_version_check;
alter table public.client_requests
  validate constraint client_requests_artist_completion_response_check;
alter table public.client_requests
  validate constraint client_requests_client_completion_response_check;
alter table public.client_requests
  validate constraint client_requests_artist_completion_time_pair_check;
alter table public.client_requests
  validate constraint client_requests_client_completion_time_pair_check;
alter table public.client_requests
  validate constraint client_requests_v2_completed_requires_two_confirmations_check;

create index if not exists client_requests_completion_pending_idx
  on public.client_requests (
    artist_id,
    client_id,
    booking_status,
    scheduled_for
  )
  where completion_protocol_version = 2
    and booking_status = 'booked';

create or replace function public.protect_request_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  artist_response_changed boolean;
  client_response_changed boolean;
  appointment_has_passed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.completion_protocol_version is distinct from 2 then
      raise exception 'New requests must use completion protocol V2.'
        using errcode = '23514';
    end if;

    if new.artist_completion_response is not null
      or new.artist_completion_responded_at is not null
      or new.client_completion_response is not null
      or new.client_completion_responded_at is not null
      or new.booking_status = 'completed'
      or new.completed_at is not null
      or new.completed_by is not null
    then
      raise exception 'A new request cannot include completion data.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if new.completion_protocol_version is distinct from old.completion_protocol_version then
    raise exception 'Completion protocol version is immutable.'
      using errcode = '23514';
  end if;

  if old.completion_protocol_version = 1 then
    if new.artist_completion_response is distinct from old.artist_completion_response
      or new.artist_completion_responded_at is distinct from old.artist_completion_responded_at
      or new.client_completion_response is distinct from old.client_completion_response
      or new.client_completion_responded_at is distinct from old.client_completion_responded_at
      or new.booking_status is distinct from old.booking_status
      or new.completed_at is distinct from old.completed_at
      or new.completed_by is distinct from old.completed_by
    then
      raise exception 'Legacy completion records are immutable.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if old.booking_status = 'completed' then
    if new.artist_completion_response is distinct from old.artist_completion_response
      or new.artist_completion_responded_at is distinct from old.artist_completion_responded_at
      or new.client_completion_response is distinct from old.client_completion_response
      or new.client_completion_responded_at is distinct from old.client_completion_responded_at
      or new.booking_status is distinct from old.booking_status
      or new.completed_at is distinct from old.completed_at
      or new.completed_by is distinct from old.completed_by
    then
      raise exception 'Completed request integrity fields are immutable.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  artist_response_changed :=
    new.artist_completion_response is distinct from old.artist_completion_response;
  client_response_changed :=
    new.client_completion_response is distinct from old.client_completion_response;

  if artist_response_changed and client_response_changed then
    raise exception 'Each participant must submit their own completion response.'
      using errcode = '42501';
  end if;

  if not artist_response_changed
    and new.artist_completion_responded_at is distinct from old.artist_completion_responded_at
  then
    raise exception 'Professional completion timestamps are database managed.'
      using errcode = '42501';
  end if;

  if not client_response_changed
    and new.client_completion_responded_at is distinct from old.client_completion_responded_at
  then
    raise exception 'Client completion timestamps are database managed.'
      using errcode = '42501';
  end if;

  if not artist_response_changed and not client_response_changed then
    if new.booking_status is distinct from old.booking_status
      and new.booking_status = 'completed'
    then
      raise exception 'V2 requests complete only after both participants confirm.'
        using errcode = '42501';
    end if;

    if new.completed_at is distinct from old.completed_at
      or new.completed_by is distinct from old.completed_by
    then
      raise exception 'Completion metadata is database managed.'
        using errcode = '42501';
    end if;

    if (
      old.artist_completion_response is not null
      or old.client_completion_response is not null
    ) and new.booking_status is distinct from old.booking_status then
      raise exception 'Booking status is locked after completion confirmation begins.'
        using errcode = '23514';
    end if;

    if (
      new.scheduled_for is distinct from old.scheduled_for
      or new.proposed_date is distinct from old.proposed_date
      or new.proposed_time is distinct from old.proposed_time
    ) then
      if actor_id is null or actor_id is distinct from old.artist_id then
        raise exception 'Only the assigned professional may set the proposed appointment time.'
          using errcode = '42501';
      end if;

      if old.client_status = 'confirmed'
        or old.artist_completion_response is not null
        or old.client_completion_response is not null
      then
        raise exception 'The agreed appointment time cannot change after confirmation.'
          using errcode = '23514';
      end if;
    end if;

    return new;
  end if;

  if old.status is distinct from 'accepted'
    or old.client_status is distinct from 'confirmed'
    or old.booking_status is distinct from 'booked'
  then
    raise exception 'Only a confirmed booked request may receive a completion response.'
      using errcode = '23514';
  end if;

  if old.artist_completion_response = 'disputed'
    or old.client_completion_response = 'disputed'
  then
    raise exception 'This completion already needs attention.'
      using errcode = '23514';
  end if;

  if old.scheduled_for is not null then
    appointment_has_passed := old.scheduled_for <= clock_timestamp();
  elsif old.proposed_date is not null then
    -- Legacy unfinished requests do not have a trustworthy timezone. Requiring
    -- the whole proposed date to have passed is the conservative fallback.
    appointment_has_passed :=
      old.proposed_date::date < (clock_timestamp() at time zone 'UTC')::date;
  end if;

  if not appointment_has_passed then
    raise exception 'Completion cannot be confirmed before the scheduled appointment time.'
      using errcode = '23514';
  end if;

  if artist_response_changed then
    if actor_id is null or actor_id is distinct from old.artist_id then
      raise exception 'Only the assigned professional may submit this response.'
        using errcode = '42501';
    end if;

    if old.artist_completion_response is not null then
      raise exception 'The professional completion response is immutable.'
        using errcode = '23514';
    end if;

    if new.artist_completion_response not in ('confirmed', 'disputed') then
      raise exception 'Completion response must be confirmed or disputed.'
        using errcode = '23514';
    end if;

    if new.client_completion_response is distinct from old.client_completion_response
      or new.client_completion_responded_at is distinct from old.client_completion_responded_at
    then
      raise exception 'A professional cannot change the client response.'
        using errcode = '42501';
    end if;

    new.artist_completion_responded_at := clock_timestamp();
  end if;

  if client_response_changed then
    if actor_id is null or actor_id is distinct from old.client_id then
      raise exception 'Only the request client may submit this response.'
        using errcode = '42501';
    end if;

    if old.client_completion_response is not null then
      raise exception 'The client completion response is immutable.'
        using errcode = '23514';
    end if;

    if new.client_completion_response not in ('confirmed', 'disputed') then
      raise exception 'Completion response must be confirmed or disputed.'
        using errcode = '23514';
    end if;

    if new.artist_completion_response is distinct from old.artist_completion_response
      or new.artist_completion_responded_at is distinct from old.artist_completion_responded_at
    then
      raise exception 'A client cannot change the professional response.'
        using errcode = '42501';
    end if;

    new.client_completion_responded_at := clock_timestamp();
  end if;

  if new.artist_completion_response = 'confirmed'
    and new.client_completion_response = 'confirmed'
  then
    new.booking_status := 'completed';
    new.completed_at := clock_timestamp();
    -- Keep completed_by compatible with existing Result and history behavior.
    -- Both participant responses remain the authoritative V2 evidence.
    new.completed_by := old.artist_id;
  else
    new.booking_status := 'booked';
    new.completed_at := null;
    new.completed_by := null;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_request_completion() from public;

create trigger protect_request_completion_trigger
before insert or update of
  booking_status,
  completed_at,
  completed_by,
  completion_protocol_version,
  scheduled_for,
  proposed_date,
  proposed_time,
  artist_completion_response,
  artist_completion_responded_at,
  client_completion_response,
  client_completion_responded_at
on public.client_requests
for each row
execute function public.protect_request_completion();

create or replace function public.validate_review_completion_integrity_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  request_record public.client_requests%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication is required to create a review.'
      using errcode = '42501';
  end if;

  if new.request_id is null then
    raise exception 'A review must reference a completed Lumina request.'
      using errcode = '23514';
  end if;

  select request.*
  into request_record
  from public.client_requests request
  where request.id = new.request_id;

  if not found then
    raise exception 'The reviewed request does not exist.'
      using errcode = '23503';
  end if;

  if new.client_id is distinct from actor_id
    or request_record.client_id is distinct from actor_id
    or new.artist_id is distinct from request_record.artist_id
    or new.artist_id is not distinct from actor_id
  then
    raise exception 'Review identity does not match the completed request.'
      using errcode = '42501';
  end if;

  if request_record.booking_status is distinct from 'completed'
    or not (
      request_record.completion_protocol_version = 1
      or (
        request_record.completion_protocol_version = 2
        and request_record.artist_completion_response = 'confirmed'
        and request_record.client_completion_response = 'confirmed'
      )
    )
  then
    raise exception 'A verified review requires a valid completed appointment.'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.reviews review
    where review.request_id = new.request_id
  ) then
    raise exception 'This appointment already has a review.'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_review_completion_integrity_v1() from public;

drop trigger if exists validate_review_completion_integrity_v1_trigger
  on public.reviews;

create trigger validate_review_completion_integrity_v1_trigger
before insert
on public.reviews
for each row
execute function public.validate_review_completion_integrity_v1();

create unique index if not exists reviews_one_per_request_idx
  on public.reviews (request_id)
  where request_id is not null;

comment on column public.client_requests.scheduled_for is
  'Canonical appointment instant used to gate V2 completion responses. Legacy unfinished requests fall back conservatively to the day after proposed_date.';
comment on column public.client_requests.completion_protocol_version is
  '1 preserves historical professional-completed requests; 2 requires immutable responses from both participants.';
comment on column public.client_requests.artist_completion_response is
  'Immutable V2 professional response: confirmed or disputed.';
comment on column public.client_requests.client_completion_response is
  'Immutable V2 client response: confirmed or disputed.';

commit;
