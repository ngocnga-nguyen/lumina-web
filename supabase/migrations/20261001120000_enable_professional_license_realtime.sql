begin;

-- Enable live professional license/readiness synchronization through the existing
-- owner-readable table. Change only its Supabase Realtime publication membership.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'professional_license_verifications'
  ) then
    alter publication supabase_realtime
      add table public.professional_license_verifications;
  end if;
end;
$$;

commit;
