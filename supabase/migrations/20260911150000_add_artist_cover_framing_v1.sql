begin;

alter table public.artists
  add column if not exists cover_position_x numeric(4,3) not null default 0.5,
  add column if not exists cover_position_y numeric(4,3) not null default 0.5,
  add column if not exists cover_scale numeric(3,2) not null default 1.0;

alter table public.artists
  alter column cover_position_x set default 0.5,
  alter column cover_position_y set default 0.5,
  alter column cover_scale set default 1.0;

comment on column public.artists.cover_position_x is
  'Normalized horizontal focal position for the public profile cover image.';
comment on column public.artists.cover_position_y is
  'Normalized vertical focal position for the public profile cover image.';
comment on column public.artists.cover_scale is
  'Validated non-destructive scale used when presenting the public profile cover image.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artists_cover_position_x_check'
      and conrelid = 'public.artists'::regclass
  ) then
    alter table public.artists add constraint artists_cover_position_x_check
      check (cover_position_x between 0.0 and 1.0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'artists_cover_position_y_check'
      and conrelid = 'public.artists'::regclass
  ) then
    alter table public.artists add constraint artists_cover_position_y_check
      check (cover_position_y between 0.0 and 1.0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'artists_cover_scale_check'
      and conrelid = 'public.artists'::regclass
  ) then
    alter table public.artists add constraint artists_cover_scale_check
      check (cover_scale between 1.0 and 1.5);
  end if;
end;
$$;

-- Public presentation metadata; existing artists RLS remains authoritative.
grant select (cover_position_x, cover_position_y, cover_scale)
  on table public.artists to anon, authenticated;
grant insert (cover_position_x, cover_position_y, cover_scale)
  on table public.artists to authenticated;
grant update (cover_position_x, cover_position_y, cover_scale)
  on table public.artists to authenticated;

commit;
