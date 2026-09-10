begin;

alter table public.client_requests
  add column if not exists requested_services jsonb;

comment on column public.client_requests.requested_services is
  'Immutable service snapshots selected for this request. Null identifies legacy requests that use service_requested only.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_requests_requested_services_array_check'
      and conrelid = 'public.client_requests'::regclass
  ) then
    alter table public.client_requests
      add constraint client_requests_requested_services_array_check
      check (
        requested_services is null
        or case
          when jsonb_typeof(requested_services) = 'array'
            then jsonb_array_length(requested_services) > 0
          else false
        end
      ) not valid;
  end if;
end $$;

alter table public.client_requests
  validate constraint client_requests_requested_services_array_check;

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
      )
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

drop trigger if exists canonicalize_client_request_services_trigger
  on public.client_requests;

create trigger canonicalize_client_request_services_trigger
before insert or update of requested_services, artist_id
on public.client_requests
for each row
execute function public.canonicalize_client_request_services();

commit;
