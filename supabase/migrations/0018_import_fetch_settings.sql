alter table public.app_settings
  add column import_fetch_gap_seconds    integer not null default 2  check (import_fetch_gap_seconds between 0 and 30),
  add column import_retry_wait_seconds   integer not null default 60 check (import_retry_wait_seconds between 10 and 600),
  add column import_empty_streak_limit   integer not null default 3  check (import_empty_streak_limit between 1 and 10);

-- Only admins may change app-wide settings (previously any authenticated user could).
drop policy "Authenticated users can update app settings" on public.app_settings;
create policy "Admins can update app settings"
  on public.app_settings for update
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
