begin;

create table if not exists public.lumina_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

comment on table public.lumina_admins is
  'Protected allowlist for Lumina internal moderation access.';

alter table public.lumina_admins enable row level security;
revoke all on table public.lumina_admins from anon, authenticated;
grant all on table public.lumina_admins to service_role;

create or replace function public.is_lumina_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.lumina_admins admins
      where admins.user_id = auth.uid()
    );
$$;

revoke all on function public.is_lumina_admin() from public;
grant execute on function public.is_lumina_admin() to authenticated;

alter table public.reviews
  add column if not exists moderated_at timestamptz null,
  add column if not exists moderated_by uuid null references auth.users(id) on delete set null;

alter table public.reviews
  drop constraint if exists reviews_moderation_status_check;

alter table public.reviews
  add constraint reviews_moderation_status_check
  check (moderation_status in ('published', 'pending', 'removed')) not valid;

alter table public.reviews
  validate constraint reviews_moderation_status_check;

comment on column public.reviews.moderation_status is
  'Review visibility state. Only protected moderation functions may change it.';
comment on column public.reviews.moderated_at is
  'Timestamp of the latest Lumina moderation decision.';
comment on column public.reviews.moderated_by is
  'Lumina admin who made the latest moderation decision.';

create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete restrict,
  reporter_id uuid not null references public.artists(id) on delete restrict,
  reason text not null,
  explanation text null,
  created_at timestamptz not null default now(),
  resolution text null,
  resolved_at timestamptz null,
  resolved_by uuid null references auth.users(id) on delete set null,
  constraint review_reports_reason_check check (
    reason in (
      'spam',
      'harassment_abusive_language',
      'fake_or_manipulated',
      'personal_private_information',
      'not_about_service',
      'other'
    )
  ),
  constraint review_reports_explanation_length_check check (
    explanation is null or char_length(explanation) <= 1000
  ),
  constraint review_reports_other_explanation_check check (
    reason <> 'other' or nullif(btrim(explanation), '') is not null
  ),
  constraint review_reports_resolution_check check (
    (
      resolution is null
      and resolved_at is null
      and resolved_by is null
    )
    or
    (
      resolution in ('kept', 'removed')
      and resolved_at is not null
      and resolved_by is not null
    )
  ),
  constraint review_reports_one_per_professional unique (review_id, reporter_id)
);

create index if not exists review_reports_review_id_created_at_idx
  on public.review_reports (review_id, created_at desc);

create index if not exists review_reports_open_queue_idx
  on public.review_reports (created_at desc)
  where resolution is null;

comment on table public.review_reports is
  'Private moderation reports submitted only by the professional reviewed.';

alter table public.review_reports enable row level security;
revoke all on table public.review_reports from anon, authenticated;
grant select on table public.review_reports to authenticated;
grant all on table public.review_reports to service_role;

drop policy if exists "Professionals can read their own review reports"
  on public.review_reports;
create policy "Professionals can read their own review reports"
on public.review_reports
for select
to authenticated
using (reporter_id = auth.uid());

drop policy if exists "Lumina admins can read review reports"
  on public.review_reports;
create policy "Lumina admins can read review reports"
on public.review_reports
for select
to authenticated
using (public.is_lumina_admin());

create or replace function public.report_published_review(
  p_review_id uuid,
  p_reason text,
  p_explanation text default null
)
returns public.review_reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  target_review public.reviews%rowtype;
  normalized_reason text := lower(btrim(coalesce(p_reason, '')));
  normalized_explanation text := nullif(btrim(coalesce(p_explanation, '')), '');
  created_report public.review_reports%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication is required to report a review.' using errcode = '42501';
  end if;

  select *
  into target_review
  from public.reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'Review not found.' using errcode = 'P0002';
  end if;

  if target_review.artist_id <> actor_id then
    raise exception 'Only the professional reviewed may report this review.' using errcode = '42501';
  end if;

  if target_review.moderation_status <> 'published' then
    raise exception 'Only published reviews may be reported.' using errcode = '23514';
  end if;

  if normalized_reason not in (
    'spam',
    'harassment_abusive_language',
    'fake_or_manipulated',
    'personal_private_information',
    'not_about_service',
    'other'
  ) then
    raise exception 'Invalid review report reason.' using errcode = '23514';
  end if;

  if normalized_explanation is not null
    and char_length(normalized_explanation) > 1000 then
    raise exception 'Report explanation must be 1000 characters or fewer.' using errcode = '22001';
  end if;

  if normalized_reason = 'other' and normalized_explanation is null then
    raise exception 'An explanation is required when the reason is Other.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.review_reports reports
    where reports.review_id = p_review_id
      and reports.reporter_id = actor_id
  ) then
    raise exception 'This review has already been reported by this professional.' using errcode = '23505';
  end if;

  insert into public.review_reports (
    review_id,
    reporter_id,
    reason,
    explanation
  )
  values (
    p_review_id,
    actor_id,
    normalized_reason,
    normalized_explanation
  )
  returning * into created_report;

  -- Reporting deliberately does not alter review visibility.
  return created_report;
end;
$$;

revoke all on function public.report_published_review(uuid, text, text) from public;
grant execute on function public.report_published_review(uuid, text, text) to authenticated;

create or replace function public.set_artist_review_response(
  p_review_id uuid,
  p_response text
)
returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  target_review public.reviews%rowtype;
  normalized_response text := nullif(btrim(coalesce(p_response, '')), '');
  updated_review public.reviews%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select *
  into target_review
  from public.reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'Review not found.' using errcode = 'P0002';
  end if;

  if target_review.artist_id <> actor_id then
    raise exception 'Only the reviewed professional may respond.' using errcode = '42501';
  end if;

  if target_review.moderation_status <> 'published' then
    raise exception 'Only published reviews may receive a professional response.' using errcode = '23514';
  end if;

  if normalized_response is not null and char_length(normalized_response) > 2000 then
    raise exception 'Response must be 2000 characters or fewer.' using errcode = '22001';
  end if;

  perform set_config('lumina.review_response_operation', 'artist', true);

  update public.reviews
  set artist_response = normalized_response,
      artist_response_at = case when normalized_response is null then null else now() end
  where id = p_review_id
  returning * into updated_review;

  return updated_review;
end;
$$;

revoke all on function public.set_artist_review_response(uuid, text) from public;
grant execute on function public.set_artist_review_response(uuid, text) to authenticated;

create or replace function public.get_review_moderation_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  queue jsonb;
begin
  if not public.is_lumina_admin() then
    raise exception 'Lumina admin access is required.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by action_rank, review_created_at desc), '[]'::jsonb)
  into queue
  from (
    select
      case
        when reviews.moderation_status = 'pending'
          or exists (
            select 1
            from public.review_reports open_reports
            where open_reports.review_id = reviews.id
              and open_reports.resolution is null
          ) then 0
        else 1
      end as action_rank,
      reviews.created_at as review_created_at,
      jsonb_build_object(
        'id', reviews.id,
        'artist_id', reviews.artist_id,
        'artist_name', artists.name,
        'client_id', reviews.client_id,
        'reviewer_name', reviews.reviewer_name,
        'request_id', reviews.request_id,
        'rating', reviews.rating,
        'comment', reviews.comment,
        'created_at', reviews.created_at,
        'artist_response', reviews.artist_response,
        'artist_response_at', reviews.artist_response_at,
        'moderation_status', reviews.moderation_status,
        'moderated_at', reviews.moderated_at,
        'moderated_by', reviews.moderated_by,
        'request', case
          when requests.id is null then null
          else jsonb_build_object(
            'id', requests.id,
            'service_requested', requests.service_requested,
            'requested_services', requests.requested_services,
            'proposed_date', requests.proposed_date,
            'proposed_time', requests.proposed_time,
            'proposed_price', requests.proposed_price,
            'scheduled_for', requests.scheduled_for,
            'expected_end_at', requests.expected_end_at,
            'booking_status', requests.booking_status,
            'completion_protocol_version', requests.completion_protocol_version,
            'appointment_exception_reason', requests.appointment_exception_reason,
            'appointment_exception_note', requests.appointment_exception_note,
            'client_exception_note', requests.client_exception_note
          )
        end,
        'reports', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', reports.id,
              'reporter_id', reports.reporter_id,
              'reason', reports.reason,
              'explanation', reports.explanation,
              'created_at', reports.created_at,
              'resolution', reports.resolution,
              'resolved_at', reports.resolved_at,
              'resolved_by', reports.resolved_by
            ) order by reports.created_at
          )
          from public.review_reports reports
          where reports.review_id = reviews.id
        ), '[]'::jsonb)
      ) as item
    from public.reviews reviews
    left join public.artists artists on artists.id = reviews.artist_id
    left join public.client_requests requests on requests.id = reviews.request_id
  ) moderation_items;

  return queue;
end;
$$;

revoke all on function public.get_review_moderation_queue() from public;
grant execute on function public.get_review_moderation_queue() to authenticated;

create or replace function public.moderate_review(
  p_review_id uuid,
  p_decision text
)
returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  normalized_decision text := lower(btrim(coalesce(p_decision, '')));
  target_review public.reviews%rowtype;
  updated_review public.reviews%rowtype;
begin
  if not public.is_lumina_admin() then
    raise exception 'Lumina admin access is required.' using errcode = '42501';
  end if;

  if normalized_decision not in ('publish', 'remove') then
    raise exception 'Moderation decision must be publish or remove.' using errcode = '23514';
  end if;

  select *
  into target_review
  from public.reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'Review not found.' using errcode = 'P0002';
  end if;

  perform set_config('lumina.review_moderation_operation', 'admin', true);

  update public.reviews
  set moderation_status = case
        when normalized_decision = 'publish' then 'published'
        else 'removed'
      end,
      moderated_at = now(),
      moderated_by = actor_id
  where id = p_review_id
  returning * into updated_review;

  update public.review_reports
  set resolution = case
        when normalized_decision = 'publish' then 'kept'
        else 'removed'
      end,
      resolved_at = now(),
      resolved_by = actor_id
  where review_id = p_review_id
    and resolution is null;

  return updated_review;
end;
$$;

revoke all on function public.moderate_review(uuid, text) from public;
grant execute on function public.moderate_review(uuid, text) to authenticated;

create or replace function public.protect_review_integrity_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  moderation_operation text := current_setting('lumina.review_moderation_operation', true);
  response_operation text := current_setting('lumina.review_response_operation', true);
begin
  if tg_op = 'DELETE' then
    raise exception 'Reviews are preserved for integrity and cannot be deleted.' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.artist_id is distinct from old.artist_id
    or new.client_id is distinct from old.client_id
    or new.request_id is distinct from old.request_id
    or new.reviewer_name is distinct from old.reviewer_name
    or new.rating is distinct from old.rating
    or new.comment is distinct from old.comment
    or new.created_at is distinct from old.created_at then
    raise exception 'Review identity and submitted content are immutable.' using errcode = '42501';
  end if;

  if new.moderation_status is distinct from old.moderation_status
    or new.moderated_at is distinct from old.moderated_at
    or new.moderated_by is distinct from old.moderated_by then
    if moderation_operation is distinct from 'admin' or not public.is_lumina_admin() then
      raise exception 'Only Lumina moderation may change review visibility.' using errcode = '42501';
    end if;
  end if;

  if new.artist_response is distinct from old.artist_response
    or new.artist_response_at is distinct from old.artist_response_at then
    if response_operation is distinct from 'artist' or auth.uid() is distinct from old.artist_id then
      raise exception 'Only the reviewed professional may change their response.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_review_integrity_v1() from public;

drop trigger if exists protect_review_moderation_status_trigger on public.reviews;
drop trigger if exists protect_review_integrity_v1_trigger on public.reviews;
create trigger protect_review_integrity_v1_trigger
before update or delete on public.reviews
for each row execute function public.protect_review_integrity_v1();

revoke insert, update, delete on table public.reviews from anon, authenticated;
grant select on table public.reviews to anon, authenticated;

drop policy if exists "Pending reviews are private to request participants"
  on public.reviews;
drop policy if exists "Published reviews are readable"
  on public.reviews;
drop policy if exists "Review participants can read private reviews"
  on public.reviews;
drop policy if exists "Lumina admins can read moderation reviews"
  on public.reviews;
drop policy if exists "Public review visibility boundary"
  on public.reviews;
drop policy if exists "Authenticated review visibility boundary"
  on public.reviews;

create policy "Published reviews are readable"
on public.reviews
as permissive
for select
to anon, authenticated
using (moderation_status = 'published');

create policy "Review participants can read private reviews"
on public.reviews
as permissive
for select
to authenticated
using (auth.uid() = client_id or auth.uid() = artist_id);

create policy "Lumina admins can read moderation reviews"
on public.reviews
as permissive
for select
to authenticated
using (public.is_lumina_admin());

create policy "Public review visibility boundary"
on public.reviews
as restrictive
for select
to anon
using (moderation_status = 'published');

create policy "Authenticated review visibility boundary"
on public.reviews
as restrictive
for select
to authenticated
using (
  moderation_status = 'published'
  or auth.uid() = client_id
  or auth.uid() = artist_id
  or public.is_lumina_admin()
);

commit;
