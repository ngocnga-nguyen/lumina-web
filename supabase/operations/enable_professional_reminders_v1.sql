-- REVIEW CHECKPOINT: run only after fresh production preflight, schema rehearsal,
-- ownership tests, frontend readiness, and explicit scheduler approval.
-- This is intentionally separate from the schema migration.
begin;
do $$
begin
  if not exists (select 1 from pg_extension where extname='pg_cron') then
    raise exception 'pg_cron is not installed; stop for scheduler review.';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    raise exception 'Notification realtime publication must be reviewed before activation.';
  end if;
  if to_regprocedure('public.deliver_professional_reminders_v1()') is null then
    raise exception 'Reviewed reminder schema is not installed.';
  end if;
  if not has_function_privilege(current_user, 'public.deliver_professional_reminders_v1()', 'execute') then
    raise exception 'Cron job owner must be allowed to execute the private worker.';
  end if;
  if has_function_privilege('authenticated', 'public.deliver_professional_reminders_v1()', 'execute')
    or has_function_privilege('anon', 'public.deliver_professional_reminders_v1()', 'execute') then
    raise exception 'Reminder worker must not be callable by browser roles.';
  end if;
end $$;
select cron.schedule('lumina-professional-reminders-v1', '* * * * *', 'select public.deliver_professional_reminders_v1();');
commit;
-- Pause, if separately approved: select cron.unschedule('lumina-professional-reminders-v1');
-- Do not drop the deduplication ledger when pausing or rolling back the UI.
