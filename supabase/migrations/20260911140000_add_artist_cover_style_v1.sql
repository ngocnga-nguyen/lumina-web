begin;

alter table public.artists
  add column if not exists cover_style text not null default 'natural';

alter table public.artists
  alter column cover_style set default 'natural';

update public.artists
set cover_style = 'natural'
where cover_style is null;

alter table public.artists
  alter column cover_style set not null;

comment on column public.artists.cover_style is
  'Allowlisted presentation style for the resolved mobile public-profile cover image.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'artists_cover_style_check'
      and conrelid = 'public.artists'::regclass
  ) then
    alter table public.artists
      add constraint artists_cover_style_check check (
        cover_style in ('natural', 'soft_blur', 'softened')
      );
  end if;
end;
$$;

-- Cover style is public presentation data. Existing artists RLS continues to
-- limit writes to the authenticated owner and public reads to visible rows.
grant select (cover_style) on table public.artists to anon, authenticated;
grant insert (cover_style) on table public.artists to authenticated;
grant update (cover_style) on table public.artists to authenticated;

commit;
