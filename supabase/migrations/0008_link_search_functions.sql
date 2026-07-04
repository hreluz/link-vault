-- ============================================================
-- Server-side filtering, sorting, and pagination for the links list.
--
-- filtered_links: shared base query (tag aggregation, private-tag
--   exclusion, category/status/favorite/tag/search filters). Not
--   sorted or paginated — reused by both functions below.
-- search_links:   paginated page of results + a windowed total_count,
--   for infinite scroll.
-- search_link_ids: ids-only projection (with the same total_count),
--   for "select all matching the current filter".
-- ============================================================

create or replace function public.filtered_links(
  p_search text default null,
  p_category_id uuid default null,
  p_statuses public.link_status[] default null,
  p_tag_names text[] default null,
  p_tag_mode text default 'any',
  p_favorites_only boolean default false,
  p_unlocked_tag_names text[] default null
)
returns table (
  id uuid,
  user_id uuid,
  url text,
  title text,
  description text,
  site_name text,
  image_url text,
  duration text,
  category_id uuid,
  notes text,
  status public.link_status,
  is_favorite boolean,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  tags text[]
)
language sql
stable
security invoker
as $$
  with hashtags as (
    select coalesce(array_agg(lower(m[1])), '{}'::text[]) as terms
    from regexp_matches(coalesce(p_search, ''), '#(\w+)', 'g') as m
  ),
  plain_query as (
    select nullif(trim(regexp_replace(coalesce(p_search, ''), '#\w+', '', 'g')), '') as q
  ),
  base as (
    select
      l.id, l.user_id, l.url, l.title, l.description, l.site_name, l.image_url,
      l.duration, l.category_id, l.notes, l.status, l.is_favorite,
      l.created_at, l.updated_at, l.deleted_at,
      coalesce(array_agg(t.name) filter (where t.name is not null), '{}'::text[]) as tags,
      bool_or(t.is_private and not (t.name = any(coalesce(p_unlocked_tag_names, '{}'::text[])))) as locked_private
    from public.links l
    left join public.link_tags lt on lt.link_id = l.id
    left join public.tags t on t.id = lt.tag_id
    where l.user_id = auth.uid()
      and l.deleted_at is null
    group by l.id
  )
  select
    b.id, b.user_id, b.url, b.title, b.description, b.site_name, b.image_url,
    b.duration, b.category_id, b.notes, b.status, b.is_favorite,
    b.created_at, b.updated_at, b.deleted_at, b.tags
  from base b, hashtags h, plain_query pq
  where not coalesce(b.locked_private, false)
    and (p_category_id is null or b.category_id = p_category_id)
    and (p_statuses is null or array_length(p_statuses, 1) is null or b.status = any(p_statuses))
    and (not p_favorites_only or b.is_favorite)
    and (
      p_tag_names is null or array_length(p_tag_names, 1) is null or
      case when p_tag_mode = 'all' then p_tag_names <@ b.tags else b.tags && p_tag_names end
    )
    and (array_length(h.terms, 1) is null or h.terms <@ b.tags)
    and (
      pq.q is null or
      b.title ilike '%' || pq.q || '%' or
      b.site_name ilike '%' || pq.q || '%' or
      b.notes ilike '%' || pq.q || '%' or
      exists (select 1 from unnest(b.tags) tg where tg ilike '%' || pq.q || '%')
    );
$$;

create or replace function public.search_links(
  p_search text default null,
  p_category_id uuid default null,
  p_statuses public.link_status[] default null,
  p_tag_names text[] default null,
  p_tag_mode text default 'any',
  p_favorites_only boolean default false,
  p_unlocked_tag_names text[] default null,
  p_sort_by text default 'newest',
  p_limit int default 40,
  p_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  url text,
  title text,
  description text,
  site_name text,
  image_url text,
  duration text,
  category_id uuid,
  notes text,
  status public.link_status,
  is_favorite boolean,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  tags text[],
  total_count bigint
)
language sql
stable
security invoker
as $$
  select
    f.id, f.user_id, f.url, f.title, f.description, f.site_name, f.image_url,
    f.duration, f.category_id, f.notes, f.status, f.is_favorite,
    f.created_at, f.updated_at, f.deleted_at, f.tags,
    count(*) over() as total_count
  from public.filtered_links(
    p_search, p_category_id, p_statuses, p_tag_names, p_tag_mode,
    p_favorites_only, p_unlocked_tag_names
  ) f
  order by
    case when p_sort_by = 'oldest' then f.created_at end asc,
    case when p_sort_by = 'alphabetical' then f.title end asc,
    case when p_sort_by = 'status' then
      case f.status
        when 'unread' then 0
        when 'watching' then 1
        when 'read' then 2
        when 'archived' then 3
      end
    end asc,
    case when p_sort_by not in ('oldest', 'alphabetical', 'status') then f.created_at end desc,
    f.id asc
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;

create or replace function public.search_link_ids(
  p_search text default null,
  p_category_id uuid default null,
  p_statuses public.link_status[] default null,
  p_tag_names text[] default null,
  p_tag_mode text default 'any',
  p_favorites_only boolean default false,
  p_unlocked_tag_names text[] default null,
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
    p_search, p_category_id, p_statuses, p_tag_names, p_tag_mode,
    p_favorites_only, p_unlocked_tag_names
  ) f
  limit greatest(p_limit, 0);
$$;

grant execute on function public.filtered_links(
  text, uuid, public.link_status[], text[], text, boolean, text[]
) to authenticated;

grant execute on function public.search_links(
  text, uuid, public.link_status[], text[], text, boolean, text[], text, int, int
) to authenticated;

grant execute on function public.search_link_ids(
  text, uuid, public.link_status[], text[], text, boolean, text[], int
) to authenticated;
