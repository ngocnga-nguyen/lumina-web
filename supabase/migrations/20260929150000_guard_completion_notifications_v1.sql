begin;

-- Existing duplicate history must remain intact. A separate private key ledger
-- gives future INSERTs an atomic uniqueness boundary without rewriting that history.
-- Block concurrent notification writes until seeding and trigger installation finish.
lock table public.notifications in share row exclusive mode;

create table public.appointment_completed_notification_keys (
  request_id uuid not null,
  user_id uuid not null,
  primary key (request_id, user_id)
);

alter table public.appointment_completed_notification_keys enable row level security;
revoke all on table public.appointment_completed_notification_keys from public, anon, authenticated;

insert into public.appointment_completed_notification_keys (request_id, user_id)
select distinct request_id, user_id
from public.notifications
where title = 'Appointment Completed'
  and request_id is not null
  and user_id is not null
on conflict (request_id, user_id) do nothing;

create function public.guard_appointment_completed_notification_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Other event types and unlinked legacy notifications keep their existing behavior.
  if new.title is distinct from 'Appointment Completed'
    or new.request_id is null
    or new.user_id is null
  then
    return new;
  end if;

  -- The unique key arbitrates concurrent writers. The claim rolls back with the
  -- notification on any INSERT/RLS/transaction failure, so a valid retry can succeed.
  insert into public.appointment_completed_notification_keys (request_id, user_id)
  values (new.request_id, new.user_id)
  on conflict (request_id, user_id) do nothing;

  if not found then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_appointment_completed_notification_v1() from public, anon, authenticated;

create trigger guard_appointment_completed_notification_v1
before insert on public.notifications
for each row execute function public.guard_appointment_completed_notification_v1();

commit;
