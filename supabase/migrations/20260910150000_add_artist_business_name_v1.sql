begin;

alter table public.artists
  add column if not exists business_name text null;

comment on column public.artists.business_name is
  'Optional public business, salon, or studio name. This is profile display data and is not a verified legal identity claim.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'artists_business_name_check'
      and conrelid = 'public.artists'::regclass
  ) then
    alter table public.artists
      add constraint artists_business_name_check check (
        business_name is null
        or char_length(btrim(business_name)) between 1 and 160
      );
  end if;
end;
$$;

-- Activation V1 grants profile updates by column, so new editable columns must
-- be granted explicitly. Existing artists RLS continues to restrict writes to
-- the authenticated owner and public reads to profiles already visible there.
grant select (business_name) on table public.artists to anon, authenticated;
grant insert (business_name) on table public.artists to authenticated;
grant update (business_name) on table public.artists to authenticated;

commit;
