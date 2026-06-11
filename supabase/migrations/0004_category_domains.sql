-- ============================================================
-- Table: category_domains
-- Maps URL hostnames to categories for auto-assignment.
-- A domain can belong to at most one category per user.
-- ============================================================

create table public.category_domains (
  id          uuid        default gen_random_uuid() primary key,
  category_id uuid        references public.categories(id) on delete cascade not null,
  user_id     uuid        references public.users(id) on delete cascade not null,
  domain      text        not null,
  created_at  timestamptz default now() not null,
  unique(user_id, domain)
);

create index category_domains_category_id_idx on public.category_domains(category_id);
create index category_domains_user_id_idx     on public.category_domains(user_id);
create index category_domains_domain_idx      on public.category_domains(user_id, domain);

alter table public.category_domains enable row level security;

create policy "category_domains: select own" on public.category_domains
  for select using (auth.uid() = user_id);

create policy "category_domains: insert own" on public.category_domains
  for insert with check (auth.uid() = user_id);

create policy "category_domains: delete own" on public.category_domains
  for delete using (auth.uid() = user_id);
