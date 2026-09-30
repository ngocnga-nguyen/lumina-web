begin;

-- Records explicit owner intent only. No visibility backfill or automatic publication.
alter table public.artists add column activation_hidden_by_owner boolean not null default false;
comment on column public.artists.activation_hidden_by_owner is 'Set only by the protected visibility RPC; distinguishes manually hidden from never activated.';

-- Continuing marketplace requirements only; confirmation is checked at explicit activation.
-- Both reporting and BEFORE UPDATE guards evaluate the same proposed row.
create or replace function public.professional_activation_requirements_v2(a public.artists)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'name_ready', char_length(btrim(coalesce(a.name,''))) >= 2 and lower(btrim(coalesce(a.name,''))) not in ('professional account','your artist profile'),
    'category_ready', char_length(btrim(coalesce(a.category,''))) >= 2 and lower(btrim(coalesce(a.category,''))) not in ('beauty professional','service category'),
    'location_ready',
      a.location_type in ('salon','home_studio','mobile_salon','travels') and (
        (char_length(btrim(coalesce(a.city,''))) >= 2 and lower(btrim(coalesce(a.city,''))) not in ('city','location','unknown','n/a')
         and char_length(btrim(coalesce(a.region,''))) >= 2 and lower(btrim(coalesce(a.region,''))) not in ('region','state','unknown','n/a'))
        or (a.location_type in ('mobile_salon','travels') and char_length(btrim(coalesce(a.service_area,''))) >= 2
            and lower(btrim(coalesce(a.service_area,''))) not in ('service area','location','location coming soon','travels to clients','mobile salon','unknown','n/a'))
      ),
    'services_ready', exists (select 1 from public.services s where s.artist_id=a.id
      and char_length(btrim(coalesce(s.service_name,''))) >= 2
      and lower(btrim(coalesce(s.service_name,''))) not in ('service','service name','new service')
      and s.price >= 0 and s.price::text not in ('NaN','Infinity','-Infinity')),
    'license_verified', exists (select 1 from public.professional_license_verifications v where v.artist_id=a.id and v.status='verified')
  );
$$;
revoke all on function public.professional_activation_requirements_v2(public.artists) from public, anon, authenticated;

create or replace function public.professional_activation_row_ready_v2(a public.artists)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(bool_and(value='true'::jsonb),false)
  from jsonb_each(public.professional_activation_requirements_v2(a));
$$;
revoke all on function public.professional_activation_row_ready_v2(public.artists) from public, anon, authenticated;

create or replace function public.professional_activation_readiness(p_artist_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  a public.artists%rowtype;
  v public.professional_license_verifications%rowtype;
  requirements jsonb;
begin
  select * into a from public.artists where id=p_artist_id;
  if not found then return null; end if;
  select * into v from public.professional_license_verifications where artist_id=p_artist_id;
  requirements := public.professional_activation_requirements_v2(a);
  return requirements || jsonb_build_object(
    'artist_id',a.id,
    'profile_information_ready',(requirements->>'name_ready')::boolean and (requirements->>'category_ready')::boolean,
    -- Retain informational fields for compatibility; none is an activation gate.
    'profile_photo_ready',nullif(btrim(a.profile_image_url),'') is not null,
    'bio_ready',nullif(btrim(a.bio),'') is not null,
    'portfolio_ready',exists(select 1 from public.portfolio_images p where p.artist_id=a.id and nullif(btrim(p.image_url),'') is not null),
    'availability_ready',nullif(btrim(a.availability),'') is not null,
    'license_status',coalesce(v.status,'unverified'),
    'license_decision_message',v.decision_message,
    'activation_ready',public.professional_activation_row_ready_v2(a),
    'is_active',coalesce(a.is_active,false),
    'activation_hidden_by_owner',a.activation_hidden_by_owner
  );
end;
$$;
revoke all on function public.professional_activation_readiness(uuid) from public, anon, authenticated;

create or replace function public.protect_professional_activation_v1()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare operation text := current_setting('lumina.profile_activation_operation',true);
begin
  if tg_op='INSERT' then
    -- Profiles are created inactive. The existing activation RPC updates an owned row.
    if coalesce(new.is_active,false) or new.activation_hidden_by_owner then
      raise exception 'Create an inactive profile, then use the protected activation flow.' using errcode='42501';
    end if;
    new.is_active := false;
    return new;
  end if;
  if new.activation_hidden_by_owner is distinct from old.activation_hidden_by_owner
     and operation is distinct from 'protected_activation'
     and operation is distinct from 'protected_deactivation' then
    raise exception 'Visibility intent must use the protected flow.' using errcode='42501';
  end if;
  if coalesce(new.is_active,false) and not coalesce(old.is_active,false)
     and operation is distinct from 'protected_activation' then
    raise exception 'Use the protected activation flow.' using errcode='42501';
  end if;
  if coalesce(new.is_active,false) and not public.professional_activation_row_ready_v2(new) then
    new.is_active := false;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_professional_activation_v1() from public, anon, authenticated;

create or replace function public.deactivate_professional_when_unready_v1()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare old_id uuid; new_id uuid;
begin
  if tg_op in ('UPDATE','DELETE') then old_id := old.artist_id; end if;
  if tg_op in ('INSERT','UPDATE') then new_id := new.artist_id; end if;
  update public.artists a set is_active=false
  where a.id in (old_id,new_id) and a.is_active
    and not public.professional_activation_row_ready_v2(a);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.deactivate_professional_when_unready_v1() from public, anon, authenticated;
drop trigger if exists deactivate_professional_after_portfolio_change_v1 on public.portfolio_images;
-- All callers now use the structured proposed-row predicate.
drop function public.professional_activation_row_ready(uuid,text,text,text,text,text,text);

create or replace function public.set_professional_profile_visibility(p_active boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare actor_id uuid := auth.uid(); previous_operation text;
begin
  if actor_id is null then raise exception 'Authentication is required.' using errcode='42501'; end if;
  perform 1 from public.artists where id=actor_id for update;
  if not found then raise exception 'Professional profile not found.' using errcode='42501'; end if;
  -- Account confirmation gates every explicit Go Live, never ongoing visibility.
  if coalesce(p_active,false) and not exists (
    select 1 from auth.users u where u.id=actor_id and u.email_confirmed_at is not null
  ) then
    raise exception 'Confirm your email before going live.' using errcode='42501';
  end if;
  if coalesce(p_active,false) and not coalesce((public.professional_activation_readiness(actor_id)->>'activation_ready')::boolean,false) then
    raise exception 'Complete the required setup and verify your license before going live.' using errcode='23514';
  end if;
  previous_operation := current_setting('lumina.profile_activation_operation',true);
  perform set_config('lumina.profile_activation_operation',case when coalesce(p_active,false) then 'protected_activation' else 'protected_deactivation' end,true);
  update public.artists set is_active=coalesce(p_active,false),activation_hidden_by_owner=not coalesce(p_active,false) where id=actor_id;
  perform set_config('lumina.profile_activation_operation',coalesce(previous_operation,''),true);
  return public.professional_activation_readiness(actor_id);
end;
$$;
revoke all on function public.set_professional_profile_visibility(boolean) from public, anon;
-- Existing authenticated RPC grant, ownership RLS, inactive default and column grants remain unchanged.
-- Explicitly forbid direct writes to the newly introduced owner-intent field.
revoke insert(activation_hidden_by_owner), update(activation_hidden_by_owner) on public.artists from public, anon, authenticated;

commit;
