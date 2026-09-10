alter table public.portfolio_images
  add column if not exists entry_type text not null default 'single_photo',
  add column if not exists before_image_url text,
  add column if not exists service_name text,
  add column if not exists result_date date,
  add column if not exists evidence_level text not null default 'professional_submitted';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolio_images_entry_type_check'
      and conrelid = 'public.portfolio_images'::regclass
  ) then
    alter table public.portfolio_images
      add constraint portfolio_images_entry_type_check
      check (entry_type in ('single_photo', 'before_after'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolio_images_evidence_level_check'
      and conrelid = 'public.portfolio_images'::regclass
  ) then
    alter table public.portfolio_images
      add constraint portfolio_images_evidence_level_check
      check (
        evidence_level in (
          'professional_submitted',
          'completed_service',
          'client_confirmed'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolio_images_before_after_fields_check'
      and conrelid = 'public.portfolio_images'::regclass
  ) then
    alter table public.portfolio_images
      add constraint portfolio_images_before_after_fields_check
      check (
        entry_type <> 'before_after'
        or (before_image_url is not null and service_name is not null)
      );
  end if;
end $$;

comment on column public.portfolio_images.evidence_level is
  'professional_submitted is not Lumina-verified. Stronger levels require completed-service and client-confirmation evidence.';
