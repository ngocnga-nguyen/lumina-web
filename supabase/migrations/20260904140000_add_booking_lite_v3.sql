begin;

alter table public.client_requests
  add column if not exists appointment_confirmed_at timestamptz,
  add column if not exists appointment_exception_reason text,
  add column if not exists appointment_exception_note text,
  add column if not exists client_exception_note text;

alter table public.reviews
  add column if not exists moderation_status text not null default 'published';

drop trigger if exists protect_request_completion_trigger
  on public.client_requests;

-- The existing V2 migration installed this constraint with only (1, 2).
-- Replace it before the backfill so PostgreSQL can accept protocol 3 rows.
-- NOT VALID still enforces the new rule for this update and all new writes;
-- existing V1/V2 rows are validated after the selective backfill below.
alter table public.client_requests
  drop constraint if exists client_requests_completion_protocol_version_check;
alter table public.client_requests
  add constraint client_requests_completion_protocol_version_check
  check (completion_protocol_version in (1, 2, 3)) not valid;

-- Move only untouched, unfinished V2 requests into Booking Lite. Any request
-- with completion evidence already underway keeps its original V2 protocol.
update public.client_requests
set completion_protocol_version = 3,
    appointment_confirmed_at = case
      when client_status = 'confirmed' and booking_status = 'booked'
        then coalesce(updated_at, created_at, now())
      else appointment_confirmed_at
    end
where completion_protocol_version = 2
  and booking_status is distinct from 'completed'
  and artist_completion_response is null
  and client_completion_response is null
  and (
    client_status is distinct from 'confirmed'
    or scheduled_for is not null
  );

alter table public.client_requests
  alter column completion_protocol_version set default 3;

alter table public.client_requests
  drop constraint if exists client_requests_v2_completed_requires_two_confirmations_check;
alter table public.client_requests
  drop constraint if exists client_requests_completed_protocol_integrity_check;
alter table public.client_requests
  add constraint client_requests_completed_protocol_integrity_check
  check (
    booking_status <> 'completed'
    or completion_protocol_version = 1
    or (
      completion_protocol_version = 2
      and artist_completion_response = 'confirmed'
      and client_completion_response = 'confirmed'
      and completed_at is not null
    )
    or (
      completion_protocol_version = 3
      and appointment_exception_reason is null
      and (
        artist_completion_response = 'confirmed'
        or client_completion_response = 'confirmed'
      )
      and completed_at is not null
    )
  ) not valid;

alter table public.client_requests
  drop constraint if exists client_requests_appointment_exception_reason_check;
alter table public.client_requests
  add constraint client_requests_appointment_exception_reason_check
  check (
    appointment_exception_reason is null
    or appointment_exception_reason in (
      'client_cancelled',
      'no_show',
      'did_not_take_place',
      'issue'
    )
  ) not valid;

alter table public.client_requests
  drop constraint if exists client_requests_appointment_exception_note_length_check;
alter table public.client_requests
  add constraint client_requests_appointment_exception_note_length_check
  check (
    appointment_exception_note is null
    or char_length(appointment_exception_note) <= 1000
  ) not valid;

alter table public.client_requests
  drop constraint if exists client_requests_client_exception_note_length_check;
alter table public.client_requests
  add constraint client_requests_client_exception_note_length_check
  check (
    client_exception_note is null
    or char_length(client_exception_note) <= 1000
  ) not valid;

alter table public.reviews
  drop constraint if exists reviews_moderation_status_check;
alter table public.reviews
  add constraint reviews_moderation_status_check
  check (moderation_status in ('published', 'pending')) not valid;

alter table public.client_requests
  validate constraint client_requests_completion_protocol_version_check;
alter table public.client_requests
  validate constraint client_requests_completed_protocol_integrity_check;
alter table public.client_requests
  validate constraint client_requests_appointment_exception_reason_check;
alter table public.client_requests
  validate constraint client_requests_appointment_exception_note_length_check;
alter table public.client_requests
  validate constraint client_requests_client_exception_note_length_check;
alter table public.reviews
  validate constraint reviews_moderation_status_check;

comment on column public.client_requests.appointment_confirmed_at is
  'Database-managed time when the client accepted the professional proposal in Lumina.';
comment on column public.client_requests.appointment_exception_reason is
  'Auditable professional-reported Booking Lite exception; it pauses normal review publication without erasing the client position.';
comment on column public.reviews.moderation_status is
  'Published reviews are public. Pending reviews are retained for participants and future moderation.';
comment on column public.client_requests.completion_protocol_version is
  '1 preserves legacy completions; 2 uses two-party completion responses; 3 uses client-confirmed Booking Lite with exception safeguards.';
comment on column public.client_requests.scheduled_for is
  'Canonical agreed appointment instant used by V2 completion gates and V3 review readiness.';

create index if not exists client_requests_booking_lite_schedule_idx
  on public.client_requests (client_id, artist_id, booking_status, scheduled_for)
  where completion_protocol_version = 3
    and client_status = 'confirmed';

create index if not exists reviews_published_artist_created_idx
  on public.reviews (artist_id, created_at desc)
  where moderation_status = 'published';

create or replace function public.protect_request_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  booking_lite_operation text := current_setting('lumina.booking_lite_operation', true);
  artist_response_changed boolean;
  client_response_changed boolean;
  appointment_has_passed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.completion_protocol_version is distinct from 3 then
      raise exception 'New requests must use Booking Lite protocol V3.'
        using errcode = '23514';
    end if;

    if new.artist_completion_response is not null
      or new.artist_completion_responded_at is not null
      or new.client_completion_response is not null
      or new.client_completion_responded_at is not null
      or new.appointment_confirmed_at is not null
      or new.appointment_exception_reason is not null
      or new.booking_status = 'completed'
      or new.completed_at is not null
      or new.completed_by is not null
    then
      raise exception 'A new request cannot include booking completion data.'
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

  if old.completion_protocol_version = 3 then
    if old.booking_status = 'completed' then
      if booking_lite_operation = 'review_assertion'
        and actor_id is not null
        and actor_id = old.client_id
        and old.client_completion_response is null
        and old.status = 'accepted'
        and old.client_status = 'confirmed'
        and old.appointment_confirmed_at is not null
        and old.scheduled_for is not null
        and old.scheduled_for <= clock_timestamp()
        and old.appointment_exception_reason is null
      then
        new.client_completion_response := 'confirmed';
        new.client_completion_responded_at := clock_timestamp();
        return new;
      end if;

      if new.artist_completion_response is distinct from old.artist_completion_response
        or new.artist_completion_responded_at is distinct from old.artist_completion_responded_at
        or new.client_completion_response is distinct from old.client_completion_response
        or new.client_completion_responded_at is distinct from old.client_completion_responded_at
        or new.booking_status is distinct from old.booking_status
        or new.completed_at is distinct from old.completed_at
        or new.completed_by is distinct from old.completed_by
        or new.appointment_exception_reason is distinct from old.appointment_exception_reason
      then
        raise exception 'Completed Booking Lite integrity fields are immutable.'
          using errcode = '23514';
      end if;
      return new;
    end if;

    if old.client_status = 'confirmed' and (
      new.requested_services is distinct from old.requested_services
      or new.service_requested is distinct from old.service_requested
      or new.proposed_date is distinct from old.proposed_date
      or new.proposed_time is distinct from old.proposed_time
      or new.proposed_price is distinct from old.proposed_price
      or new.scheduled_for is distinct from old.scheduled_for
    ) then
      raise exception 'Confirmed appointment services and proposal terms are immutable.'
        using errcode = '23514';
    end if;

    if old.appointment_confirmed_at is not null
      and booking_lite_operation is null
      and (
        new.status is distinct from old.status
        or new.client_status is distinct from old.client_status
        or new.client_confirmed is distinct from old.client_confirmed
        or new.booking_status is distinct from old.booking_status
      )
    then
      raise exception 'Confirmed Booking Lite appointment state is database managed.'
        using errcode = '42501';
    end if;

    if booking_lite_operation = 'confirm_appointment' then
      if actor_id is null or actor_id is distinct from old.client_id then
        raise exception 'Only the request client may confirm this appointment.'
          using errcode = '42501';
      end if;
      if old.status is distinct from 'accepted'
        or old.client_status = 'confirmed'
        or old.booking_status = 'completed'
        or old.scheduled_for is null
        or old.proposed_date is null
        or old.proposed_time is null
        or old.proposed_price is null
      then
        raise exception 'A complete accepted proposal is required before confirmation.'
          using errcode = '23514';
      end if;
      if old.scheduled_for <= clock_timestamp() then
        raise exception 'A past appointment cannot be newly confirmed.'
          using errcode = '23514';
      end if;

      new.client_status := 'confirmed';
      new.client_confirmed := true;
      new.booking_status := 'booked';
      new.appointment_confirmed_at := clock_timestamp();
      return new;
    end if;

    if booking_lite_operation = 'artist_completed' then
      if actor_id is null or actor_id is distinct from old.artist_id then
        raise exception 'Only the assigned professional may record completion.'
          using errcode = '42501';
      end if;
      if old.status is distinct from 'accepted'
        or old.client_status is distinct from 'confirmed'
        or old.booking_status is distinct from 'booked'
        or old.appointment_confirmed_at is null
        or old.scheduled_for is null
        or old.scheduled_for > clock_timestamp()
        or old.appointment_exception_reason is not null
      then
        raise exception 'This appointment is not eligible for professional completion.'
          using errcode = '23514';
      end if;

      new.artist_completion_response := 'confirmed';
      new.artist_completion_responded_at := clock_timestamp();
      new.booking_status := 'completed';
      new.completed_at := clock_timestamp();
      new.completed_by := old.artist_id;
      return new;
    end if;

    if booking_lite_operation = 'artist_exception' then
      if actor_id is null or actor_id is distinct from old.artist_id then
        raise exception 'Only the assigned professional may report an appointment exception.'
          using errcode = '42501';
      end if;
      if old.status is distinct from 'accepted'
        or old.client_status is distinct from 'confirmed'
        or old.booking_status is distinct from 'booked'
        or old.appointment_confirmed_at is null
        or old.appointment_exception_reason is not null
        or old.artist_completion_response is not null
      then
        raise exception 'This appointment cannot receive another exception.'
          using errcode = '23514';
      end if;
      if new.appointment_exception_reason not in (
        'client_cancelled', 'no_show', 'did_not_take_place', 'issue'
      ) then
        raise exception 'Appointment exception reason is invalid.'
          using errcode = '23514';
      end if;
      if new.appointment_exception_reason in ('no_show', 'did_not_take_place')
        and (old.scheduled_for is null or old.scheduled_for > clock_timestamp())
      then
        raise exception 'This exception can only be reported after the appointment time.'
          using errcode = '23514';
      end if;

      new.artist_completion_response := 'disputed';
      new.artist_completion_responded_at := clock_timestamp();
      new.booking_status := 'needs_attention';
      new.completed_at := null;
      new.completed_by := null;
      return new;
    end if;

    if booking_lite_operation in ('client_exception_response', 'review_assertion') then
      if actor_id is null or actor_id is distinct from old.client_id then
        raise exception 'Only the request client may record this assertion.'
          using errcode = '42501';
      end if;
      if old.status is distinct from 'accepted'
        or old.client_status is distinct from 'confirmed'
        or old.appointment_confirmed_at is null
        or old.scheduled_for is null
        or old.client_completion_response is not null
      then
        raise exception 'This client assertion is not eligible yet.'
          using errcode = '23514';
      end if;

      if booking_lite_operation = 'client_exception_response'
        and old.appointment_exception_reason is null
      then
        raise exception 'There is no professional exception to dispute.'
          using errcode = '23514';
      end if;

      if booking_lite_operation = 'review_assertion'
        and old.scheduled_for > clock_timestamp()
      then
        raise exception 'A review cannot assert service before the appointment time.'
          using errcode = '23514';
      end if;

      new.client_completion_response := 'confirmed';
      new.client_completion_responded_at := clock_timestamp();

      if old.appointment_exception_reason is null then
        new.booking_status := 'completed';
        new.completed_at := clock_timestamp();
        new.completed_by := old.client_id;
      else
        new.booking_status := 'needs_attention';
        new.completed_at := null;
        new.completed_by := null;
      end if;
      return new;
    end if;

    if new.appointment_confirmed_at is distinct from old.appointment_confirmed_at
      or new.appointment_exception_reason is distinct from old.appointment_exception_reason
      or new.appointment_exception_note is distinct from old.appointment_exception_note
      or new.client_exception_note is distinct from old.client_exception_note
      or new.artist_completion_response is distinct from old.artist_completion_response
      or new.artist_completion_responded_at is distinct from old.artist_completion_responded_at
      or new.client_completion_response is distinct from old.client_completion_response
      or new.client_completion_responded_at is distinct from old.client_completion_responded_at
      or new.completed_at is distinct from old.completed_at
      or new.completed_by is distinct from old.completed_by
      or new.booking_status = 'completed'
      or new.booking_status = 'needs_attention'
      or new.client_status = 'confirmed' and old.client_status is distinct from 'confirmed'
    then
      raise exception 'Use the protected Booking Lite action for this transition.'
        using errcode = '42501';
    end if;

    if (
      new.proposed_date is distinct from old.proposed_date
      or new.proposed_time is distinct from old.proposed_time
      or new.proposed_price is distinct from old.proposed_price
      or new.scheduled_for is distinct from old.scheduled_for
    ) and (actor_id is null or actor_id is distinct from old.artist_id) then
      raise exception 'Only the assigned professional may change a proposal.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  -- Protocol V2 remains the original immutable two-party completion flow.
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

  artist_response_changed := new.artist_completion_response is distinct from old.artist_completion_response;
  client_response_changed := new.client_completion_response is distinct from old.client_completion_response;

  if artist_response_changed and client_response_changed then
    raise exception 'Each participant must submit their own completion response.' using errcode = '42501';
  end if;

  if not artist_response_changed
    and new.artist_completion_responded_at is distinct from old.artist_completion_responded_at
  then
    raise exception 'Professional completion timestamps are database managed.' using errcode = '42501';
  end if;

  if not client_response_changed
    and new.client_completion_responded_at is distinct from old.client_completion_responded_at
  then
    raise exception 'Client completion timestamps are database managed.' using errcode = '42501';
  end if;

  if not artist_response_changed and not client_response_changed then
    if new.booking_status = 'completed' and old.booking_status is distinct from 'completed' then
      raise exception 'V2 requests complete only after both participants confirm.' using errcode = '42501';
    end if;
    if new.completed_at is distinct from old.completed_at or new.completed_by is distinct from old.completed_by then
      raise exception 'Completion metadata is database managed.' using errcode = '42501';
    end if;
    if (
      old.artist_completion_response is not null
      or old.client_completion_response is not null
    ) and new.booking_status is distinct from old.booking_status then
      raise exception 'Booking status is locked after completion confirmation begins.' using errcode = '23514';
    end if;
    if (
      new.scheduled_for is distinct from old.scheduled_for
      or new.proposed_date is distinct from old.proposed_date
      or new.proposed_time is distinct from old.proposed_time
      or new.proposed_price is distinct from old.proposed_price
    ) then
      if actor_id is null or actor_id is distinct from old.artist_id then
        raise exception 'Only the assigned professional may set the proposed appointment terms.' using errcode = '42501';
      end if;
      if old.client_status = 'confirmed'
        or old.artist_completion_response is not null
        or old.client_completion_response is not null
      then
        raise exception 'The agreed appointment terms cannot change after confirmation.' using errcode = '23514';
      end if;
    end if;
    return new;
  end if;

  if old.status is distinct from 'accepted'
    or old.client_status is distinct from 'confirmed'
    or old.booking_status is distinct from 'booked'
  then
    raise exception 'Only a confirmed booked request may receive a completion response.' using errcode = '23514';
  end if;

  if old.scheduled_for is not null then
    appointment_has_passed := old.scheduled_for <= clock_timestamp();
  elsif old.proposed_date is not null then
    appointment_has_passed := old.proposed_date::date < (clock_timestamp() at time zone 'UTC')::date;
  end if;
  if not appointment_has_passed then
    raise exception 'Completion cannot be confirmed before the scheduled appointment time.' using errcode = '23514';
  end if;

  if old.artist_completion_response = 'disputed'
    or old.client_completion_response = 'disputed'
  then
    raise exception 'This completion already needs attention.' using errcode = '23514';
  end if;

  if artist_response_changed then
    if actor_id is null or actor_id is distinct from old.artist_id then
      raise exception 'Only the assigned professional may submit this response.' using errcode = '42501';
    end if;
    if old.artist_completion_response is not null or new.artist_completion_response not in ('confirmed', 'disputed') then
      raise exception 'The professional completion response is invalid or already set.' using errcode = '23514';
    end if;
    if new.client_completion_response is distinct from old.client_completion_response
      or new.client_completion_responded_at is distinct from old.client_completion_responded_at
    then
      raise exception 'A professional cannot change the client response.' using errcode = '42501';
    end if;
    new.artist_completion_responded_at := clock_timestamp();
  end if;

  if client_response_changed then
    if actor_id is null or actor_id is distinct from old.client_id then
      raise exception 'Only the request client may submit this response.' using errcode = '42501';
    end if;
    if old.client_completion_response is not null or new.client_completion_response not in ('confirmed', 'disputed') then
      raise exception 'The client completion response is invalid or already set.' using errcode = '23514';
    end if;
    if new.artist_completion_response is distinct from old.artist_completion_response
      or new.artist_completion_responded_at is distinct from old.artist_completion_responded_at
    then
      raise exception 'A client cannot change the professional response.' using errcode = '42501';
    end if;
    new.client_completion_responded_at := clock_timestamp();
  end if;

  if new.artist_completion_response = 'confirmed' and new.client_completion_response = 'confirmed' then
    new.booking_status := 'completed';
    new.completed_at := clock_timestamp();
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
  status,
  booking_status,
  client_status,
  client_confirmed,
  completed_at,
  completed_by,
  completion_protocol_version,
  scheduled_for,
  proposed_date,
  proposed_time,
  proposed_price,
  requested_services,
  service_requested,
  appointment_confirmed_at,
  appointment_exception_reason,
  appointment_exception_note,
  client_exception_note,
  artist_completion_response,
  artist_completion_responded_at,
  client_completion_response,
  client_completion_responded_at
on public.client_requests
for each row
execute function public.protect_request_completion();

create or replace function public.confirm_booking_lite_appointment(p_request_id uuid)
returns public.client_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  confirmed_request public.client_requests;
begin
  perform set_config('lumina.booking_lite_operation', 'confirm_appointment', true);

  update public.client_requests
  set client_status = 'confirmed',
      client_confirmed = true,
      booking_status = 'booked',
      updated_at = clock_timestamp()
  where id = p_request_id
  returning * into confirmed_request;

  if not found then
    raise exception 'Request not found.' using errcode = 'P0002';
  end if;
  return confirmed_request;
end;
$$;

create or replace function public.record_booking_lite_artist_outcome(
  p_request_id uuid,
  p_outcome text,
  p_note text default null
)
returns public.client_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_request public.client_requests;
begin
  if p_outcome = 'completed' then
    perform set_config('lumina.booking_lite_operation', 'artist_completed', true);
    update public.client_requests
    set artist_completion_response = 'confirmed',
        updated_at = clock_timestamp()
    where id = p_request_id
    returning * into updated_request;
  else
    perform set_config('lumina.booking_lite_operation', 'artist_exception', true);
    update public.client_requests
    set appointment_exception_reason = p_outcome,
        appointment_exception_note = nullif(btrim(p_note), ''),
        artist_completion_response = 'disputed',
        booking_status = 'needs_attention',
        updated_at = clock_timestamp()
    where id = p_request_id
    returning * into updated_request;
  end if;

  if not found then
    raise exception 'Request not found.' using errcode = 'P0002';
  end if;

  if p_outcome <> 'completed' then
    insert into public.notifications (user_id, request_id, title, message)
    values (
      updated_request.client_id,
      updated_request.id,
      'Appointment Needs Attention',
      'Your professional reported an appointment exception. Review it and share your side in My Requests.'
    );
  end if;

  return updated_request;
end;
$$;

create or replace function public.respond_to_booking_lite_exception(
  p_request_id uuid,
  p_note text default null
)
returns public.client_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_request public.client_requests;
begin
  perform set_config('lumina.booking_lite_operation', 'client_exception_response', true);
  update public.client_requests
  set client_completion_response = 'confirmed',
      client_exception_note = nullif(btrim(p_note), ''),
      updated_at = clock_timestamp()
  where id = p_request_id
  returning * into updated_request;

  if not found then
    raise exception 'Request not found.' using errcode = 'P0002';
  end if;
  return updated_request;
end;
$$;

revoke all on function public.confirm_booking_lite_appointment(uuid) from public;
revoke all on function public.record_booking_lite_artist_outcome(uuid, text, text) from public;
revoke all on function public.respond_to_booking_lite_exception(uuid, text) from public;
grant execute on function public.confirm_booking_lite_appointment(uuid) to authenticated;
grant execute on function public.record_booking_lite_artist_outcome(uuid, text, text) to authenticated;
grant execute on function public.respond_to_booking_lite_exception(uuid, text) to authenticated;

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
    raise exception 'Authentication is required to create a review.' using errcode = '42501';
  end if;
  if new.request_id is null then
    raise exception 'A review must reference a Lumina request.' using errcode = '23514';
  end if;

  select request.* into request_record
  from public.client_requests request
  where request.id = new.request_id;
  if not found then
    raise exception 'The reviewed request does not exist.' using errcode = '23503';
  end if;

  if new.client_id is distinct from actor_id
    or request_record.client_id is distinct from actor_id
    or new.artist_id is distinct from request_record.artist_id
    or new.artist_id is not distinct from actor_id
  then
    raise exception 'Review identity does not match the request.' using errcode = '42501';
  end if;

  if request_record.completion_protocol_version = 1 then
    if request_record.booking_status is distinct from 'completed' then
      raise exception 'A legacy verified review requires a completed appointment.' using errcode = '42501';
    end if;
    new.moderation_status := 'published';
  elsif request_record.completion_protocol_version = 2 then
    if request_record.booking_status is distinct from 'completed'
      or request_record.artist_completion_response is distinct from 'confirmed'
      or request_record.client_completion_response is distinct from 'confirmed'
    then
      raise exception 'A V2 verified review requires both completion confirmations.' using errcode = '42501';
    end if;
    new.moderation_status := 'published';
  elsif request_record.completion_protocol_version = 3 then
    if request_record.status is distinct from 'accepted'
      or request_record.client_status is distinct from 'confirmed'
      or request_record.appointment_confirmed_at is null
      or request_record.scheduled_for is null
      or request_record.scheduled_for > clock_timestamp()
      or request_record.client_completion_response is distinct from 'confirmed'
      or request_record.booking_status not in ('completed', 'needs_attention')
    then
      raise exception 'This Booking Lite appointment is not review eligible.' using errcode = '42501';
    end if;
    new.moderation_status := case
      when request_record.appointment_exception_reason is null then 'published'
      else 'pending'
    end;
  else
    raise exception 'Unsupported completion protocol.' using errcode = '23514';
  end if;

  if exists (select 1 from public.reviews review where review.request_id = new.request_id) then
    raise exception 'This appointment already has a review.' using errcode = '23505';
  end if;
  return new;
end;
$$;

create or replace function public.submit_booking_lite_review(
  p_request_id uuid,
  p_reviewer_name text,
  p_rating integer,
  p_comment text
)
returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  request_record public.client_requests%rowtype;
  inserted_review public.reviews;
begin
  if actor_id is null then
    raise exception 'Authentication is required to create a review.' using errcode = '42501';
  end if;

  if nullif(btrim(p_reviewer_name), '') is null
    or char_length(btrim(p_reviewer_name)) > 200
    or p_rating not between 1 and 5
    or nullif(btrim(p_comment), '') is null
    or char_length(btrim(p_comment)) > 5000
  then
    raise exception 'Review name, rating, or comment is invalid.' using errcode = '23514';
  end if;

  select request.* into request_record
  from public.client_requests request
  where request.id = p_request_id
  for update;
  if not found then
    raise exception 'Request not found.' using errcode = 'P0002';
  end if;

  if request_record.completion_protocol_version = 3
    and request_record.client_completion_response is null
  then
    perform set_config('lumina.booking_lite_operation', 'review_assertion', true);
    update public.client_requests
    set client_completion_response = 'confirmed',
        updated_at = clock_timestamp()
    where id = p_request_id
    returning * into request_record;
  end if;

  insert into public.reviews (
    artist_id,
    client_id,
    request_id,
    reviewer_name,
    rating,
    comment
  ) values (
    request_record.artist_id,
    actor_id,
    request_record.id,
    btrim(p_reviewer_name),
    p_rating,
    btrim(p_comment)
  )
  returning * into inserted_review;

  return inserted_review;
end;
$$;

revoke all on function public.submit_booking_lite_review(uuid, text, integer, text) from public;
grant execute on function public.submit_booking_lite_review(uuid, text, integer, text) to authenticated;

drop trigger if exists validate_review_completion_integrity_v1_trigger on public.reviews;
create trigger validate_review_completion_integrity_v1_trigger
before insert on public.reviews
for each row execute function public.validate_review_completion_integrity_v1();

create or replace function public.protect_review_moderation_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.moderation_status is distinct from old.moderation_status then
    raise exception 'Review moderation status is database managed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_review_moderation_status_trigger on public.reviews;
create trigger protect_review_moderation_status_trigger
before update of moderation_status on public.reviews
for each row execute function public.protect_review_moderation_status();

alter table public.reviews enable row level security;
drop policy if exists "Pending reviews are private to request participants" on public.reviews;
create policy "Pending reviews are private to request participants"
on public.reviews
as restrictive
for select
to public
using (
  moderation_status = 'published'
  or (select auth.uid()) = client_id
  or (select auth.uid()) = artist_id
);

commit;
