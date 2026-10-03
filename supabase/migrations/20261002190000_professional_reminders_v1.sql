begin;

-- Installation never arms existing rows or creates a cron job.
alter table public.artist_client_notes
  add column reminder_timezone text,
  add column reminder_due_at timestamptz,
  add column reminder_schedule_version bigint not null default 0,
  add column reminder_alert_armed boolean not null default false;

create function public.prepare_professional_reminder_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare changed boolean; wall_time timestamp;
begin
  if tg_op = 'INSERT' then
    changed := true;
    new.reminder_schedule_version := 0;
    new.reminder_due_at := null;
    new.reminder_alert_armed := false;
  else
    -- Protect current/former reminders, including untouched legacy reminders.
    -- INSERT still accepts its original client-supplied or generated ID.
    if new.id is distinct from old.id and
      (old.note_type = 'reminder' or new.note_type = 'reminder' or old.reminder_schedule_version > 0) then
      raise exception 'Reminder identity cannot be changed.' using errcode = '23514';
    end if;
    changed := new.note_type is distinct from old.note_type
      or new.reminder_due_on is distinct from old.reminder_due_on
      or new.reminder_due_time is distinct from old.reminder_due_time
      or new.reminder_timezone is distinct from old.reminder_timezone;
    -- These fields are server-owned, regardless of caller-supplied payloads.
    new.reminder_schedule_version := old.reminder_schedule_version;
    new.reminder_due_at := old.reminder_due_at;
    new.reminder_alert_armed := old.reminder_alert_armed;
  end if;
  if changed then
    new.reminder_due_at := null;
    new.reminder_alert_armed := false;
    if new.note_type <> 'reminder' or new.reminder_due_on is null then
      new.reminder_timezone := null;
    elsif new.reminder_timezone is not null then
      -- Older app clients may still save local-only, unarmed reminders.
      if not exists (
        select 1 from pg_catalog.pg_timezone_names where name = new.reminder_timezone
          and (name like '%/%' or name = 'UTC') and name not like 'posix/%' and name not like 'right/%'
      ) then
        raise exception 'Choose a valid IANA timezone for this reminder.' using errcode = '23514';
      end if;
      if new.reminder_due_time is not null then
        wall_time := new.reminder_due_on + new.reminder_due_time;
        new.reminder_due_at := wall_time at time zone new.reminder_timezone;
        -- Reject nonexistent spring-forward times instead of silently shifting them.
        if new.reminder_due_at at time zone new.reminder_timezone <> wall_time then
          raise exception 'This time does not exist in that timezone. Choose another time.' using errcode = '23514';
        end if;
        -- PostgreSQL resolves repeated fall-back times using standard time.
        new.reminder_alert_armed := new.reminder_completed_at is null;
      end if;
    end if;
    -- Ordinary Notes never acquire a reminder occurrence. Retain a former
    -- reminder's version so converting it back cannot reuse a delivered key.
    if new.note_type = 'reminder' then
      new.reminder_schedule_version := new.reminder_schedule_version + 1;
    end if;
  end if;
  -- Reopening cannot rearm an occurrence, including one completed before delivery.
  if new.reminder_completed_at is not null then
    if tg_op = 'INSERT' or old.reminder_completed_at is null then new.reminder_completed_at := now(); end if;
    new.reminder_alert_armed := false;
  end if;
  return new;
end $$;
revoke all on function public.prepare_professional_reminder_v1() from public, anon, authenticated, service_role;
create trigger prepare_professional_reminder_v1 before insert or update
  on public.artist_client_notes for each row execute function public.prepare_professional_reminder_v1();
create index professional_reminders_due_v1 on public.artist_client_notes (reminder_due_at, id)
  where note_type = 'reminder' and reminder_alert_armed
    and reminder_completed_at is null and reminder_due_at is not null;

-- Persistent ledger keeps retries idempotent even if notification history is removed.
create table public.professional_reminder_deliveries (
  note_id uuid not null,
  schedule_version bigint not null,
  user_id uuid not null,
  delivered_at timestamptz not null default now(),
  primary key (note_id, schedule_version, user_id)
);
alter table public.professional_reminder_deliveries enable row level security;
revoke all on public.professional_reminder_deliveries from public, anon, authenticated, service_role;

alter table public.notifications
  add column event_type text,
  add column reminder_id uuid,
  add column reminder_schedule_version bigint;
alter table public.notifications add constraint reminder_notification_identity_v1 check (
  (event_type is distinct from 'professional_reminder_due' and reminder_id is null and reminder_schedule_version is null)
  or (event_type is not null and event_type = 'professional_reminder_due'
    and reminder_id is not null and reminder_schedule_version is not null
    and reminder_schedule_version > 0 and request_id is null)
);

-- Do not rely on potentially permissive legacy INSERT policies for reminders.
create function public.guard_professional_reminder_notification_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.reminder_id is not null then
    if (to_jsonb(new) - 'is_read') is distinct from (to_jsonb(old) - 'is_read') then
      raise exception 'Reminder notification identity and content are immutable.' using errcode = '42501';
    end if;
  elsif new.reminder_id is not null or new.reminder_schedule_version is not null or new.event_type = 'professional_reminder_due' then
    if current_user in ('anon', 'authenticated') then
      raise exception 'Only the reminder worker may create reminder notifications.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_professional_reminder_notification_v1() from public, anon, authenticated, service_role;
create trigger guard_professional_reminder_notification_v1 before insert or update
  on public.notifications for each row execute function public.guard_professional_reminder_notification_v1();

create function public.deliver_professional_reminders_v1()
returns integer language plpgsql security definer set search_path = '' as $$
declare reminder record; delivered integer := 0; inserted_id public.notifications.id%TYPE;
begin
  for reminder in
    select n.id, n.artist_id, n.reminder_schedule_version
    from public.artist_client_notes n
    where n.note_type = 'reminder' and n.reminder_alert_armed
      and n.reminder_completed_at is null and n.reminder_due_at is not null and n.reminder_due_at <= now()
      and not exists (select 1 from public.professional_reminder_deliveries d
        where d.note_id = n.id and d.schedule_version = n.reminder_schedule_version and d.user_id = n.artist_id)
    order by n.reminder_due_at, n.id limit 200 for update of n skip locked
  loop
    insert into public.professional_reminder_deliveries (note_id, schedule_version, user_id)
    values (reminder.id, reminder.reminder_schedule_version, reminder.artist_id)
    on conflict do nothing;
    if found then
      inserted_id := null;
      insert into public.notifications (user_id, request_id, title, message, is_read, event_type, reminder_id, reminder_schedule_version)
      values (reminder.artist_id, null, 'Reminder due', 'Open your private client reminder.', false, 'professional_reminder_due',
        reminder.id, reminder.reminder_schedule_version) returning id into inserted_id;
      if inserted_id is null then raise exception 'Reminder notification insert was suppressed.'; end if;
      delivered := delivered + 1;
    end if;
  end loop;
  return delivered;
end $$;
-- Executable only by its database owner (the reviewed cron job role).
revoke all on function public.deliver_professional_reminders_v1() from public, anon, authenticated, service_role;
commit;
