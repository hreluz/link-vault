alter table public.users
  add column role text not null default 'user' check (role in ('user', 'admin'));

create table public.app_settings (
  id                     uuid        primary key default gen_random_uuid(),
  registrations_enabled  boolean     not null default true,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

insert into public.app_settings (registrations_enabled) values (true);

alter table public.app_settings enable row level security;

create policy "Anyone can read app settings"
  on public.app_settings
  for select
  using (true);

create policy "Authenticated users can update app settings"
  on public.app_settings
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
