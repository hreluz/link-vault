alter table public.tags
  add column is_private boolean default false not null;

create table public.private_tag_settings (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users(id) on delete cascade,
  password_hash   text        not null,
  hint            text,
  failed_attempts integer     not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id)
);

alter table public.private_tag_settings enable row level security;

create policy "Users manage own private tag settings"
  on public.private_tag_settings
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
