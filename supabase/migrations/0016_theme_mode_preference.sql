alter table public.user_preferences
  add column theme_mode text not null default 'system'
    check (theme_mode in ('light', 'dark', 'system'));
