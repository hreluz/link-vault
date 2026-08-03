create table public.user_preferences (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references public.users(id) on delete cascade,
  auto_fetch_enabled boolean     not null default true,
  accent_color_light text        not null default 'indigo'
    check (accent_color_light ~ '^(indigo|violet|blue|emerald|rose|amber|teal|#[0-9a-fA-F]{6})$'),
  accent_color_dark  text        not null default 'indigo'
    check (accent_color_dark ~ '^(indigo|violet|blue|emerald|rose|amber|teal|#[0-9a-fA-F]{6})$'),
  surface_family     text        not null default 'slate'
    check (surface_family ~ '^(slate|gray|zinc|neutral|stone|#[0-9a-fA-F]{6})$'),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique (user_id)
);

alter table public.user_preferences enable row level security;

create policy "Users manage own preferences"
  on public.user_preferences
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.user_preferences to authenticated;

-- Backfill: one row per existing user. Only auto_fetch_enabled (0013) has
-- ever shipped on main, so it's the only column worth carrying over — the
-- accent/surface columns never shipped anywhere, so new rows just take the
-- table's own defaults for those.
insert into public.user_preferences (user_id, auto_fetch_enabled)
select id, auto_fetch_enabled
from public.users;

-- Every new signup must also get a default preferences row (parity with the
-- old column-default behavior). Redefine the existing trigger function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;
