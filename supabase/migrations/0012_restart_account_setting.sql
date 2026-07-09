alter table public.app_settings
  add column restart_account_enabled boolean not null default true;
