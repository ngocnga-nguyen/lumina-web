begin;

alter table public.client_requests
  add column if not exists expected_end_at timestamptz;

alter table public.request_updates
  add column if not exists expected_end_at timestamptz;

alter table public.client_requests
  drop constraint if exists client_requests_expected_end_at_check;
alter table public.client_requests
  add constraint client_requests_expected_end_at_check
  check (
    expected_end_at is null
    or (
      scheduled_for is not null
      and expected_end_at > scheduled_for
      and expected_end_at <= scheduled_for + interval '24 hours'
    )
  ) not valid;

alter table public.client_requests
  validate constraint client_requests_expected_end_at_check;

comment on column public.client_requests.scheduled_for is
  'Canonical agreed appointment start used by completion and exception safeguards.';
comment on column public.client_requests.expected_end_at is
  'Historical agreed expected service end. V3 review readiness begins after this time; older V3 appointments fall back to twelve hours after scheduled_for.';
comment on column public.request_updates.expected_end_at is
  'Expected service end preserved with an artist proposal or proposal revision.';

create index if not exists client_requests_booking_lite_expected_end_idx
  on public.client_requests (client_id, expected_end_at)
  where completion_protocol_version = 3
    and client_status = 'confirmed'
    and booking_status in ('booked', 'completed', 'needs_attention');

create or replace function public.parse_service_duration_minutes(p_duration text)
returns integer
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  normalized text := lower(btrim(p_duration));
  matched text[];
  parsed_minutes numeric;
begin
  matched := regexp_match(
    normalized,
    '^([0-9]+)[[:space:]]*(m|min|mins|minute|minutes)$'
  );
  if matched is not null then
    parsed_minutes := matched[1]::numeric;
  else
    matched := regexp_match(
      normalized,
      '^([0-9]+([.][0-9]+)?)[[:space:]]*(h|hr|hrs|hour|hours)$'
    );
    if matched is not null then
      parsed_minutes := matched[1]::numeric * 60;
    else
      matched := regexp_match(
        normalized,
        '^([0-9]+)[[:space:]]*(h|hr|hrs|hour|hours)[[:space:]]*([0-9]+)[[:space:]]*(m|min|mins|minute|minutes)$'
      );
      if matched is not null then
        parsed_minutes := matched[1]::numeric * 60 + matched[3]::numeric;
      end if;
    end if;
  end if;

  if parsed_minutes is null
    or parsed_minutes < 1
    or parsed_minutes > 1440
  then
    return null;
  end if;

  return round(parsed_minutes)::integer;
end;
$$;

revoke all on function public.parse_service_duration_minutes(text) from public;

create or replace function public.canonicalize_client_request_services()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_count integer;
  parsed_count integer;
  distinct_count integer;
  matched_count integer;
  canonical_services jsonb;
  readable_summary text;
begin
  if new.requested_services is null then
    return new;
  end if;

  if jsonb_typeof(new.requested_services) <> 'array'
    or jsonb_array_length(new.requested_services) = 0
  then
    raise exception 'A structured request must include at least one service.'
      using errcode = '23514';
  end if;

  requested_count := jsonb_array_length(new.requested_services);

  begin
    select
      count(service_id),
      count(distinct service_id)
    into parsed_count, distinct_count
    from (
      select (item.value ->> 'service_id')::uuid as service_id
      from jsonb_array_elements(new.requested_services) as item(value)
    ) parsed_services;
  exception
    when invalid_text_representation then
      raise exception 'Each requested service must include a valid service_id.'
        using errcode = '23514';
  end;

  if parsed_count <> requested_count then
    raise exception 'Each requested service must include a valid service_id.'
      using errcode = '23514';
  end if;

  if distinct_count <> requested_count then
    raise exception 'A service cannot be added to the same request more than once.'
      using errcode = '23514';
  end if;

  select
    count(*),
    jsonb_agg(
      jsonb_build_object(
        'service_id', service.id,
        'service_name', service.service_name,
        'listed_price', service.price
      ) || case
        when public.parse_service_duration_minutes(service.duration) is null
          then '{}'::jsonb
        else jsonb_build_object(
          'listed_duration_minutes',
          public.parse_service_duration_minutes(service.duration)
        )
      end
      order by requested.ordinality
    ),
    string_agg(service.service_name, ', ' order by requested.ordinality)
  into matched_count, canonical_services, readable_summary
  from jsonb_array_elements(new.requested_services)
    with ordinality as requested(value, ordinality)
  join public.services service
    on service.id = (requested.value ->> 'service_id')::uuid
   and service.artist_id = new.artist_id;

  if matched_count <> requested_count then
    raise exception 'Every requested service must belong to the selected professional.'
      using errcode = '23514';
  end if;

  new.requested_services := canonical_services;
  new.service_requested := readable_summary;

  return new;
end;
$$;

revoke all on function public.canonicalize_client_request_services() from public;

create or replace function public.booking_lite_review_ready_at(
  p_scheduled_for timestamptz,
  p_expected_end_at timestamptz
)
returns timestamptz
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_scheduled_for is null then null
    when p_expected_end_at > p_scheduled_for
      and p_expected_end_at <= p_scheduled_for + interval '24 hours'
      then p_expected_end_at
    else p_scheduled_for + interval '12 hours'
  end;
$$;

revoke all on function public.booking_lite_review_ready_at(timestamptz, timestamptz) from public;

create or replace function public.protect_expected_service_end_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  proposal_terms_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.expected_end_at is not null then
      raise exception 'A new request cannot include agreed appointment timing.'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if old.completion_protocol_version is distinct from 3 then
    if new.expected_end_at is distinct from old.expected_end_at then
      raise exception 'Expected service end is only used by Booking Lite V3.'
        using errcode = '23514';
    end if;
    return new;
  end if;

  proposal_terms_changed :=
    new.status is distinct from old.status
    or new.proposed_date is distinct from old.proposed_date
    or new.proposed_time is distinct from old.proposed_time
    or new.proposed_price is distinct from old.proposed_price
    or new.scheduled_for is distinct from old.scheduled_for
    or new.expected_end_at is distinct from old.expected_end_at;

  if new.expected_end_at is distinct from old.expected_end_at then
    if actor_id is null or actor_id is distinct from old.artist_id then
      raise exception 'Only the assigned professional may set the expected service end.'
        using errcode = '42501';
    end if;
    if old.client_status = 'confirmed' or old.appointment_confirmed_at is not null then
      raise exception 'Confirmed appointment timing is immutable.'
        using errcode = '23514';
    end if;
  end if;

  if new.status = 'accepted' and proposal_terms_changed then
    if new.scheduled_for is null or new.expected_end_at is null then
      raise exception 'A V3 proposal requires an appointment start and expected end.'
        using errcode = '23514';
    end if;
  end if;

  if new.client_status = 'confirmed'
    and old.client_status is distinct from 'confirmed'
    and (old.scheduled_for is null or old.expected_end_at is null)
  then
    raise exception 'This proposal needs an expected service end before confirmation.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_expected_service_end_v1() from public;

drop trigger if exists protect_expected_service_end_v1_trigger
  on public.client_requests;
create trigger protect_expected_service_end_v1_trigger
before insert or update of
  status,
  client_status,
  proposed_date,
  proposed_time,
  proposed_price,
  scheduled_for,
  expected_end_at
on public.client_requests
for each row
execute function public.protect_expected_service_end_v1();

create or replace function public.guard_booking_lite_review_time_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.completion_protocol_version = 3
    and current_setting('lumina.booking_lite_operation', true) = 'review_assertion'
    and public.booking_lite_review_ready_at(
      old.scheduled_for,
      old.expected_end_at
    ) > clock_timestamp()
  then
    raise exception 'A review cannot assert service before the expected service end.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_booking_lite_review_time_v1() from public;

drop trigger if exists guard_booking_lite_review_time_v1_trigger
  on public.client_requests;
create trigger guard_booking_lite_review_time_v1_trigger
before update of client_completion_response
on public.client_requests
for each row
execute function public.guard_booking_lite_review_time_v1();

create or replace function public.protect_request_update_expected_end_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  request_artist_id uuid;
  request_expected_end_at timestamptz;
begin
  if tg_op = 'UPDATE' then
    if new.expected_end_at is distinct from old.expected_end_at then
      raise exception 'Proposal history timing is immutable.'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.expected_end_at is null then
    return new;
  end if;

  select request.artist_id, request.expected_end_at
  into request_artist_id, request_expected_end_at
  from public.client_requests request
  where request.id = new.request_id;

  if actor_id is null
    or actor_id is distinct from request_artist_id
    or new.sender_type is distinct from 'artist'
  then
    raise exception 'Only the assigned professional may preserve proposal timing.'
      using errcode = '42501';
  end if;

  if new.expected_end_at is distinct from request_expected_end_at then
    raise exception 'Proposal history timing must match the current proposal.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_request_update_expected_end_v1() from public;

drop trigger if exists protect_request_update_expected_end_v1_trigger
  on public.request_updates;
create trigger protect_request_update_expected_end_v1_trigger
before insert or update of expected_end_at
on public.request_updates
for each row
execute function public.protect_request_update_expected_end_v1();

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
      or public.booking_lite_review_ready_at(
        request_record.scheduled_for,
        request_record.expected_end_at
      ) > clock_timestamp()
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

revoke all on function public.validate_review_completion_integrity_v1() from public;

commit;
