-- ============================================================
-- Enums
-- ============================================================

create type public.link_status as enum (
  'unread',
  'watching',
  'read',
  'archived'
);

-- ============================================================
-- Tables
-- ============================================================

create table public.users (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.links (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references public.users(id) on delete cascade not null,
  url          text        not null,
  title        text,
  description  text,
  image_url    text,
  site_name    text,
  notes        text,
  status       public.link_status  default 'unread' not null,
  is_favorite  boolean     default false not null,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

create table public.tags (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.users(id) on delete cascade not null,
  name       text        not null,
  color      text,
  created_at timestamptz default now() not null,
  unique(user_id, name)
);

create table public.link_tags (
  id      uuid default gen_random_uuid() primary key,
  link_id uuid references public.links(id) on delete cascade not null,
  tag_id  uuid references public.tags(id)  on delete cascade not null,
  unique(link_id, tag_id)
);

create table public.categories (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references public.users(id) on delete cascade not null,
  name        text        not null,
  description text,
  color       text,
  emoticon    text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique(user_id, name)
);

-- ============================================================
-- Indexes
-- ============================================================

alter table public.links
  add column category_id uuid references public.categories(id) on delete set null;

create index links_user_id_idx       on public.links(user_id);
create index links_status_idx        on public.links(status);
create index links_category_id_idx   on public.links(category_id);
create index tags_user_id_idx        on public.tags(user_id);
create index link_tags_link_id_idx   on public.link_tags(link_id);
create index link_tags_tag_id_idx    on public.link_tags(tag_id);
create index categories_user_id_idx  on public.categories(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users       enable row level security;
alter table public.links       enable row level security;
alter table public.tags        enable row level security;
alter table public.link_tags   enable row level security;
alter table public.categories  enable row level security;

-- users
create policy "users: select own" on public.users
  for select using (auth.uid() = id);

create policy "users: update own" on public.users
  for update using (auth.uid() = id);

-- links
create policy "links: select own" on public.links
  for select using (auth.uid() = user_id);

create policy "links: insert own" on public.links
  for insert with check (auth.uid() = user_id);

create policy "links: update own" on public.links
  for update using (auth.uid() = user_id);

create policy "links: delete own" on public.links
  for delete using (auth.uid() = user_id);

-- tags
create policy "tags: select own" on public.tags
  for select using (auth.uid() = user_id);

create policy "tags: insert own" on public.tags
  for insert with check (auth.uid() = user_id);

create policy "tags: update own" on public.tags
  for update using (auth.uid() = user_id);

create policy "tags: delete own" on public.tags
  for delete using (auth.uid() = user_id);

-- categories
create policy "categories: select own" on public.categories
  for select using (auth.uid() = user_id);

create policy "categories: insert own" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "categories: update own" on public.categories
  for update using (auth.uid() = user_id);

create policy "categories: delete own" on public.categories
  for delete using (auth.uid() = user_id);

-- link_tags (access is derived from the owning link)
create policy "link_tags: select own" on public.link_tags
  for select using (
    exists (
      select 1 from public.links
      where links.id = link_tags.link_id
        and links.user_id = auth.uid()
    )
  );

create policy "link_tags: insert own" on public.link_tags
  for insert with check (
    exists (
      select 1 from public.links
      where links.id = link_tags.link_id
        and links.user_id = auth.uid()
    )
  );

create policy "link_tags: delete own" on public.link_tags
  for delete using (
    exists (
      select 1 from public.links
      where links.id = link_tags.link_id
        and links.user_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger: auto-create user profile on sign-up
-- ============================================================

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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
