-- SPEC 15: an opened link moves to the end of the list after 30 s, and that
-- position is saved so unmoved links sort first after a refresh.

alter table public.links add column moved_to_end_at timestamptz null;

-- Setting a link back to Unread makes it "new" again.
create function public.clear_moved_to_end_on_unread() returns trigger
language plpgsql as $$
begin
  if new.status = 'unread' and old.status is distinct from 'unread' then
    new.moved_to_end_at := null;
  end if;
  return new;
end;
$$;

create trigger links_clear_moved_to_end_on_unread
  before update of status on public.links
  for each row execute function public.clear_moved_to_end_on_unread();

-- The return type changes (new moved_to_end_at column), so drop and recreate.
-- Parameters are identical to 0010_encryption.sql.
drop function if exists public.search_links(uuid, public.link_status[], uuid[], text, boolean, uuid[], text, int, int);
drop function if exists public.search_link_ids(uuid, public.link_status[], uuid[], text, boolean, uuid[], int);
drop function if exists public.filtered_links(uuid, public.link_status[], uuid[], text, boolean, uuid[]);

create function public.filtered_links(
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
  moved_to_end_at timestamptz,
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
      l.created_at, l.updated_at, l.deleted_at, l.moved_to_end_at, l.enc_payload, l.enc_iv,
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
    b.created_at, b.updated_at, b.deleted_at, b.moved_to_end_at, b.enc_payload, b.enc_iv, b.tags
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
  total_count bigint
)
language sql
stable
security invoker
as $$
  select
    f.id, f.user_id, f.category_id, f.status, f.is_favorite,
    f.created_at, f.updated_at, f.deleted_at, f.moved_to_end_at, f.enc_payload, f.enc_iv, f.tags,
    count(*) over() as total_count
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

create function public.search_link_ids(
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
  order by f.moved_to_end_at asc nulls first, f.created_at desc
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
