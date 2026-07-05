-- ============================================================
-- Zero-knowledge encryption.
--
-- Content fields on links/tags/categories/category_domains move
-- from plaintext columns to a single `enc_payload`/`enc_iv` blob
-- per row, encrypted client-side with a per-user vault key (DEK)
-- that only ever exists in the browser. See ENCRYPTION.md.
--
-- Existing mock seed data (0003_seed_mock_links.sql, 0005) is
-- plaintext and cannot be encrypted from SQL -- the DEK never
-- touches the server. It's wiped here; the test user's default
-- categories/domains are reseeded automatically (now encrypted)
-- on next login via seedDefaultCategories.
-- ============================================================

-- ============================================================
-- Vault key storage
-- ============================================================

create table public.user_encryption_keys (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        references public.users(id) on delete cascade not null,
  salt           text        not null,
  wrapped_dek    text        not null,
  wrapped_dek_iv text        not null,
  kdf_iterations integer     not null default 600000,
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null,
  unique(user_id)
);

alter table public.user_encryption_keys enable row level security;

create policy "user_encryption_keys: select own" on public.user_encryption_keys
  for select using (auth.uid() = user_id);

create policy "user_encryption_keys: insert own" on public.user_encryption_keys
  for insert with check (auth.uid() = user_id);

create policy "user_encryption_keys: update own" on public.user_encryption_keys
  for update using (auth.uid() = user_id);

grant select, insert, update on public.user_encryption_keys to authenticated;

-- ============================================================
-- Wipe plaintext mock/seed content -- incompatible with encryption.
-- ============================================================

delete from public.link_tags;
delete from public.links;
delete from public.category_domains;
delete from public.tags;
delete from public.categories;

-- ============================================================
-- links: drop plaintext content columns, add encrypted payload
-- ============================================================

alter table public.links
  drop column url,
  drop column title,
  drop column description,
  drop column site_name,
  drop column notes,
  drop column image_url,
  drop column duration,
  add column enc_payload     text not null,
  add column enc_iv          text not null,
  add column url_fingerprint text not null;

create index links_url_fingerprint_idx on public.links(user_id, url_fingerprint);

-- ============================================================
-- tags: drop plaintext name/color, add encrypted payload
-- ============================================================

alter table public.tags
  drop column name,
  drop column color,
  add column enc_payload text not null,
  add column enc_iv      text not null;

-- ============================================================
-- categories: drop plaintext content, add encrypted payload
-- ============================================================

alter table public.categories
  drop column name,
  drop column description,
  drop column color,
  drop column emoticon,
  add column enc_payload text not null,
  add column enc_iv      text not null;

-- ============================================================
-- category_domains: drop plaintext domain, add encrypted payload
-- ============================================================

alter table public.category_domains
  drop column domain,
  add column enc_payload text not null,
  add column enc_iv      text not null;

-- ============================================================
-- Search RPCs: structural-only filtering. Free-text search and
-- alphabetical sort move entirely client-side (impossible against
-- ciphertext) -- see ENCRYPTION.md. Tag matching moves from tag
-- *names* to tag *ids*, matched directly against link_tags.tag_id,
-- so the server never needs to see a tag name either.
-- ============================================================

drop function if exists public.filtered_links(text, uuid, public.link_status[], text[], text, boolean, text[]);
drop function if exists public.search_links(text, uuid, public.link_status[], text[], text, boolean, text[], text, int, int);
drop function if exists public.search_link_ids(text, uuid, public.link_status[], text[], text, boolean, text[], int);

create or replace function public.filtered_links(
  p_category_id uuid default null,
  p_statuses public.link_status[] default null,
  p_tag_ids uuid[] default null,
  p_tag_mode text default 'any',
  p_favorites_only boolean default false,
  p_unlocked_tag_ids uuid[] default null
)
returns table (
  id uuid,
  user_id uuid,
  category_id uuid,
  status public.link_status,
  is_favorite boolean,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  enc_payload text,
  enc_iv text,
  tags uuid[]
)
language sql
stable
security invoker
as $$
  with base as (
    select
      l.id, l.user_id, l.category_id, l.status, l.is_favorite,
      l.created_at, l.updated_at, l.deleted_at, l.enc_payload, l.enc_iv,
      coalesce(array_agg(lt.tag_id) filter (where lt.tag_id is not null), '{}'::uuid[]) as tags,
      bool_or(t.is_private and not (t.id = any(coalesce(p_unlocked_tag_ids, '{}'::uuid[])))) as locked_private
    from public.links l
    left join public.link_tags lt on lt.link_id = l.id
    left join public.tags t on t.id = lt.tag_id
    where l.user_id = auth.uid()
      and l.deleted_at is null
    group by l.id
  )
  select
    b.id, b.user_id, b.category_id, b.status, b.is_favorite,
    b.created_at, b.updated_at, b.deleted_at, b.enc_payload, b.enc_iv, b.tags
  from base b
  where not coalesce(b.locked_private, false)
    and (p_category_id is null or b.category_id = p_category_id)
    and (p_statuses is null or array_length(p_statuses, 1) is null or b.status = any(p_statuses))
    and (not p_favorites_only or b.is_favorite)
    and (
      p_tag_ids is null or array_length(p_tag_ids, 1) is null or
      case when p_tag_mode = 'all' then p_tag_ids <@ b.tags else b.tags && p_tag_ids end
    );
$$;

create or replace function public.search_links(
  p_category_id uuid default null,
  p_statuses public.link_status[] default null,
  p_tag_ids uuid[] default null,
  p_tag_mode text default 'any',
  p_favorites_only boolean default false,
  p_unlocked_tag_ids uuid[] default null,
  p_sort_by text default 'newest',
  p_limit int default 40,
  p_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  category_id uuid,
  status public.link_status,
  is_favorite boolean,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  enc_payload text,
  enc_iv text,
  tags uuid[],
  total_count bigint
)
language sql
stable
security invoker
as $$
  select
    f.id, f.user_id, f.category_id, f.status, f.is_favorite,
    f.created_at, f.updated_at, f.deleted_at, f.enc_payload, f.enc_iv, f.tags,
    count(*) over() as total_count
  from public.filtered_links(
    p_category_id, p_statuses, p_tag_ids, p_tag_mode,
    p_favorites_only, p_unlocked_tag_ids
  ) f
  order by
    case when p_sort_by = 'oldest' then f.created_at end asc,
    case when p_sort_by = 'status' then
      case f.status
        when 'unread' then 0
        when 'watching' then 1
        when 'read' then 2
        when 'archived' then 3
      end
    end asc,
    case when p_sort_by not in ('oldest', 'status') then f.created_at end desc,
    f.id asc
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;

create or replace function public.search_link_ids(
  p_category_id uuid default null,
  p_statuses public.link_status[] default null,
  p_tag_ids uuid[] default null,
  p_tag_mode text default 'any',
  p_favorites_only boolean default false,
  p_unlocked_tag_ids uuid[] default null,
  p_limit int default 2000
)
returns table (
  id uuid,
  total_count bigint
)
language sql
stable
security invoker
as $$
  select f.id, count(*) over() as total_count
  from public.filtered_links(
    p_category_id, p_statuses, p_tag_ids, p_tag_mode,
    p_favorites_only, p_unlocked_tag_ids
  ) f
  order by f.created_at desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.filtered_links(
  uuid, public.link_status[], uuid[], text, boolean, uuid[]
) to authenticated;

grant execute on function public.search_links(
  uuid, public.link_status[], uuid[], text, boolean, uuid[], text, int, int
) to authenticated;

grant execute on function public.search_link_ids(
  uuid, public.link_status[], uuid[], text, boolean, uuid[], int
) to authenticated;
