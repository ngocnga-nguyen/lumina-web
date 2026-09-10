begin;

-- Marketplace visibility and authenticated account identity are separate concerns.
-- The existing public SELECT policy intentionally exposes active profiles only;
-- this policy additionally lets a signed-in professional read their own row so
-- role resolution continues to work while their profile is inactive.
alter table public.artists enable row level security;

drop policy if exists "Professionals can read their own artist account"
  on public.artists;

create policy "Professionals can read their own artist account"
  on public.artists
  for select
  to authenticated
  using (id = (select auth.uid()));

-- Table privileges and RLS are both required by PostgREST. RLS still limits
-- authenticated users to active public profiles plus their own artist row.
grant select on table public.artists to authenticated;

commit;
