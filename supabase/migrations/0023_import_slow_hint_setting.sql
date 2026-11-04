-- Seconds an import metadata fetch runs before the progress modal switches
-- from "Fetching <host>…" to "Still waiting on <host>…" (SPEC 29).
alter table public.app_settings
  add column import_slow_hint_seconds integer not null default 10
  check (import_slow_hint_seconds between 5 and 60);
