begin;

create table if not exists public.professional_license_verifications (
  artist_id uuid primary key references public.artists(id) on delete cascade,
  legal_professional_name text not null,
  license_number text not null,
  license_jurisdiction text not null,
  license_type text not null,
  business_name text null,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_reviewed_at timestamptz null,
  last_reviewed_by uuid null,
  decision_message text null,
  constraint professional_license_verifications_status_check check (
    status in ('pending', 'verified', 'rejected')
  ),
  constraint professional_license_verifications_legal_name_check check (
    char_length(btrim(legal_professional_name)) between 2 and 160
  ),
  constraint professional_license_verifications_license_number_check check (
    char_length(btrim(license_number)) between 2 and 100
  ),
  constraint professional_license_verifications_jurisdiction_check check (
    char_length(btrim(license_jurisdiction)) between 2 and 100
  ),
  constraint professional_license_verifications_license_type_check check (
    char_length(btrim(license_type)) between 2 and 120
  ),
  constraint professional_license_verifications_business_name_check check (
    business_name is null
    or char_length(btrim(business_name)) between 1 and 160
  ),
  constraint professional_license_verifications_decision_message_check check (
    decision_message is null or char_length(decision_message) <= 1000
  ),
  constraint professional_license_verifications_review_audit_check check (
    (last_reviewed_at is null and last_reviewed_by is null)
    or (last_reviewed_at is not null and last_reviewed_by is not null)
  ),
  constraint professional_license_verifications_decision_audit_check check (
    status = 'pending'
    or (last_reviewed_at is not null and last_reviewed_by is not null)
  ),
  constraint professional_license_verifications_correction_message_check check (
    status <> 'rejected'
    or nullif(btrim(decision_message), '') is not null
  )
);

create index if not exists professional_license_verifications_queue_idx
  on public.professional_license_verifications (status, submitted_at desc);

comment on table public.professional_license_verifications is
  'Private professional-license submissions. No row means unverified.';
comment on column public.professional_license_verifications.status is
  'License-review status only; it does not represent identity, insurance, background, or quality verification.';

alter table public.professional_license_verifications enable row level security;
revoke all on table public.professional_license_verifications from anon, authenticated;
grant select on table public.professional_license_verifications to authenticated;
grant all on table public.professional_license_verifications to service_role;

drop policy if exists "Professionals can read their own license submission"
  on public.professional_license_verifications;
create policy "Professionals can read their own license submission"
on public.professional_license_verifications
for select
to authenticated
using (artist_id = auth.uid());

drop policy if exists "Lumina admins can read license submissions"
  on public.professional_license_verifications;
create policy "Lumina admins can read license submissions"
on public.professional_license_verifications
for select
to authenticated
using (public.is_lumina_admin());

create or replace function public.protect_professional_license_verification_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  operation text := current_setting('lumina.license_verification_operation', true);
begin
  if tg_op = 'INSERT' then
    if operation is distinct from 'professional_submit'
      or auth.uid() is distinct from new.artist_id
      or new.status is distinct from 'pending'
      or new.last_reviewed_at is not null
      or new.last_reviewed_by is not null
      or new.decision_message is not null then
      raise exception 'License submissions must use the protected professional submission function.' using errcode = '42501';
    end if;

    return new;
  end if;

  if new.artist_id is distinct from old.artist_id then
    raise exception 'License verification ownership is immutable.' using errcode = '42501';
  end if;

  if operation = 'professional_submit' then
    if auth.uid() is distinct from old.artist_id
      or new.status is distinct from 'pending'
      or new.last_reviewed_at is distinct from old.last_reviewed_at
      or new.last_reviewed_by is distinct from old.last_reviewed_by
      or new.decision_message is distinct from old.decision_message then
      raise exception 'Professionals cannot change verification decisions or audit fields.' using errcode = '42501';
    end if;

    return new;
  end if;

  if operation = 'admin_review' then
    if not public.is_lumina_admin()
      or new.legal_professional_name is distinct from old.legal_professional_name
      or new.license_number is distinct from old.license_number
      or new.license_jurisdiction is distinct from old.license_jurisdiction
      or new.license_type is distinct from old.license_type
      or new.business_name is distinct from old.business_name
      or new.submitted_at is distinct from old.submitted_at
      or new.status not in ('verified', 'rejected') then
      raise exception 'Only Lumina admins may record a verification decision.' using errcode = '42501';
    end if;

    return new;
  end if;

  raise exception 'License verification changes must use a protected function.' using errcode = '42501';
end;
$$;

revoke all on function public.protect_professional_license_verification_v1() from public;

drop trigger if exists protect_professional_license_verification_v1_trigger
  on public.professional_license_verifications;
create trigger protect_professional_license_verification_v1_trigger
before insert or update on public.professional_license_verifications
for each row execute function public.protect_professional_license_verification_v1();

create or replace function public.submit_professional_license_verification(
  p_legal_professional_name text,
  p_license_number text,
  p_license_jurisdiction text,
  p_license_type text,
  p_business_name text default null
)
returns public.professional_license_verifications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  normalized_legal_name text := btrim(coalesce(p_legal_professional_name, ''));
  normalized_license_number text := btrim(coalesce(p_license_number, ''));
  normalized_jurisdiction text := btrim(coalesce(p_license_jurisdiction, ''));
  normalized_license_type text := btrim(coalesce(p_license_type, ''));
  normalized_business_name text := nullif(btrim(coalesce(p_business_name, '')), '');
  submission public.professional_license_verifications%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.artists artists where artists.id = actor_id
  ) then
    raise exception 'Only a Lumina professional can submit license information.' using errcode = '42501';
  end if;

  if char_length(normalized_legal_name) not between 2 and 160 then
    raise exception 'Professional name must be between 2 and 160 characters.' using errcode = '23514';
  end if;
  if char_length(normalized_license_number) not between 2 and 100 then
    raise exception 'License number must be between 2 and 100 characters.' using errcode = '23514';
  end if;
  if char_length(normalized_jurisdiction) not between 2 and 100 then
    raise exception 'License jurisdiction must be between 2 and 100 characters.' using errcode = '23514';
  end if;
  if char_length(normalized_license_type) not between 2 and 120 then
    raise exception 'License type must be between 2 and 120 characters.' using errcode = '23514';
  end if;
  if normalized_business_name is not null
    and char_length(normalized_business_name) > 160 then
    raise exception 'Business name must be 160 characters or fewer.' using errcode = '23514';
  end if;

  perform set_config('lumina.license_verification_operation', 'professional_submit', true);

  insert into public.professional_license_verifications (
    artist_id,
    legal_professional_name,
    license_number,
    license_jurisdiction,
    license_type,
    business_name,
    status,
    submitted_at,
    updated_at
  )
  values (
    actor_id,
    normalized_legal_name,
    normalized_license_number,
    normalized_jurisdiction,
    normalized_license_type,
    normalized_business_name,
    'pending',
    now(),
    now()
  )
  on conflict (artist_id) do update
  set legal_professional_name = excluded.legal_professional_name,
      license_number = excluded.license_number,
      license_jurisdiction = excluded.license_jurisdiction,
      license_type = excluded.license_type,
      business_name = excluded.business_name,
      status = 'pending',
      submitted_at = now(),
      updated_at = now()
  returning * into submission;

  return submission;
end;
$$;

revoke all on function public.submit_professional_license_verification(text, text, text, text, text) from public;
grant execute on function public.submit_professional_license_verification(text, text, text, text, text) to authenticated;

create or replace function public.moderate_professional_license_verification(
  p_artist_id uuid,
  p_decision text,
  p_correction_message text default null
)
returns public.professional_license_verifications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  normalized_decision text := lower(btrim(coalesce(p_decision, '')));
  normalized_message text := nullif(btrim(coalesce(p_correction_message, '')), '');
  target_record public.professional_license_verifications%rowtype;
  updated_record public.professional_license_verifications%rowtype;
begin
  if not public.is_lumina_admin() then
    raise exception 'Lumina admin access is required.' using errcode = '42501';
  end if;

  if normalized_decision not in ('verify', 'reject') then
    raise exception 'Decision must be verify or reject.' using errcode = '23514';
  end if;

  if normalized_decision = 'reject' and normalized_message is null then
    raise exception 'A correction message is required.' using errcode = '23514';
  end if;

  if normalized_message is not null and char_length(normalized_message) > 1000 then
    raise exception 'Correction message must be 1000 characters or fewer.' using errcode = '22001';
  end if;

  select *
  into target_record
  from public.professional_license_verifications
  where artist_id = p_artist_id
  for update;

  if not found then
    raise exception 'License verification submission not found.' using errcode = 'P0002';
  end if;

  perform set_config('lumina.license_verification_operation', 'admin_review', true);

  update public.professional_license_verifications
  set status = case when normalized_decision = 'verify' then 'verified' else 'rejected' end,
      last_reviewed_at = now(),
      last_reviewed_by = actor_id,
      decision_message = case when normalized_decision = 'reject' then normalized_message else null end,
      updated_at = now()
  where artist_id = p_artist_id
  returning * into updated_record;

  return updated_record;
end;
$$;

revoke all on function public.moderate_professional_license_verification(uuid, text, text) from public;
grant execute on function public.moderate_professional_license_verification(uuid, text, text) to authenticated;

create or replace function public.get_professional_license_verification_queue()
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

  select coalesce(
    jsonb_agg(item order by status_rank, submitted_at desc),
    '[]'::jsonb
  )
  into queue
  from (
    select
      case verification.status when 'pending' then 0 else 1 end as status_rank,
      verification.submitted_at,
      jsonb_build_object(
        'artist_id', verification.artist_id,
        'professional_name', artists.name,
        'legal_professional_name', verification.legal_professional_name,
        'business_name', verification.business_name,
        'license_number', verification.license_number,
        'license_jurisdiction', verification.license_jurisdiction,
        'license_type', verification.license_type,
        'status', verification.status,
        'submitted_at', verification.submitted_at,
        'updated_at', verification.updated_at,
        'last_reviewed_at', verification.last_reviewed_at,
        'last_reviewed_by', verification.last_reviewed_by,
        'decision_message', verification.decision_message
      ) as item
    from public.professional_license_verifications verification
    join public.artists artists on artists.id = verification.artist_id
  ) verification_items;

  return queue;
end;
$$;

revoke all on function public.get_professional_license_verification_queue() from public;
grant execute on function public.get_professional_license_verification_queue() to authenticated;

create or replace function public.is_professional_license_verified(
  p_artist_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.professional_license_verifications verification
    where verification.artist_id = p_artist_id
      and verification.status = 'verified'
  );
$$;

revoke all on function public.is_professional_license_verified(uuid) from public;
grant execute on function public.is_professional_license_verified(uuid) to anon, authenticated;

commit;
