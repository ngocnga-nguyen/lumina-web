-- Read-only catalog inspection. Do not substitute historical audit exports.
begin transaction read only;
select current_database(), current_user, now();
select tablename, policyname, roles, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename in ('artist_client_notes','artist_client_cards','notifications','client_requests');
select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('artist_client_notes','artist_client_cards','notifications','client_requests');
select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns
where table_schema='public' and table_name in ('artist_client_notes','notifications') order by table_name,ordinal_position;
select event_object_table,trigger_name,action_statement from information_schema.triggers
where event_object_schema='public' and event_object_table in ('artist_client_notes','notifications');
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in ('artist_client_notes','notifications');
select pubname,schemaname,tablename from pg_publication_tables where pubname='supabase_realtime';
select name,default_version,installed_version from pg_available_extensions where name='pg_cron';
select to_regclass('cron.job') as cron_job_catalog, to_regclass('cron.job_run_details') as cron_run_catalog;
select count(*) as old_reminders from public.artist_client_notes where note_type='reminder';
rollback;
-- Only if cron catalogs exist: inspect jobname, active, schedule, username,
-- and recent statuses for the reviewed reminder job (avoid exporting unrelated job secrets).
