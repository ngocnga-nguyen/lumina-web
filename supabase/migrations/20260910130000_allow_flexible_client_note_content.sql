begin;

-- Notes may be text-led, image-led, or reminder-led. Preserve the existing
-- columns and data while allowing either text field to be intentionally empty.
alter table public.artist_client_notes
  drop constraint if exists artist_client_notes_title_check;

alter table public.artist_client_notes
  add constraint artist_client_notes_title_check check (
    title = btrim(title)
    and char_length(title) <= 120
  );

alter table public.artist_client_notes
  drop constraint if exists artist_client_notes_body_nonempty_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artist_client_notes_minimum_content_check'
      and conrelid = 'public.artist_client_notes'::regclass
  ) then
    alter table public.artist_client_notes
      add constraint artist_client_notes_minimum_content_check check (
        btrim(title) <> ''
        or btrim(body) <> ''
        or reminder_due_on is not null
        -- Inspiration attachment metadata is created immediately after its
        -- parent note, so this note type must permit that secure two-step flow.
        or note_type = 'inspiration'
      );
  end if;
end;
$$;

commit;
