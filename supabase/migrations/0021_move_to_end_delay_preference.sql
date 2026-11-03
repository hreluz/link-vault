alter table public.user_preferences
  add column move_to_end_delay_seconds integer not null default 30
    check (move_to_end_delay_seconds between 5 and 600);
