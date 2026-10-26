-- SPEC 19: the "Your Links" header shows how many matching links are unread.
-- search_links gains a windowed unread_count next to total_count, over the
-- same filtered set.

-- The return type changes, so drop and recreate. Parameters and body are
-- identical to 0019_link_moved_to_end.sql.
drop function if exists public.search_links(uuid, public.link_status[], uuid[], text, boolean, uuid[], text, int, int);

create function public.search_links(
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
  moved_to_end_at timestamptz,
  enc_payload text,
  enc_iv text,
  tags uuid[],
  total_count bigint,
  unread_count bigint
)
language sql
stable
security invoker
as $$
  select
    f.id, f.user_id, f.category_id, f.status, f.is_favorite,
    f.created_at, f.updated_at, f.deleted_at, f.moved_to_end_at, f.enc_payload, f.enc_iv, f.tags,
    count(*) over() as total_count,
    count(*) filter (where f.status = 'unread') over() as unread_count
  from public.filtered_links(
    p_category_id, p_statuses, p_tag_ids, p_tag_mode,
    p_favorites_only, p_unlocked_tag_ids
  ) f
  order by
    f.moved_to_end_at asc nulls first,
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

grant execute on function public.search_links(
  uuid, public.link_status[], uuid[], text, boolean, uuid[], text, int, int
) to authenticated;
