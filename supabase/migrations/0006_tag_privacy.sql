alter table public.tags
  add column is_private    boolean default false not null,
  add column password_hash text;
