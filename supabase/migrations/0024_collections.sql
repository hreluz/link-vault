-- SPEC 40: link collections (playlists).
--
-- A collection is a named, manually ordered list of existing links. Its
-- name/emoji/description are encrypted client-side in enc_payload/enc_iv
-- (ENCRYPTION.md); collection_links is structural only.

create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  enc_payload text not null,   -- { name, emoji, description }
  enc_iv      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.collection_links (
  collection_id uuid not null references public.collections(id) on delete cascade,
  link_id       uuid not null references public.links(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  position      integer not null,
  added_at      timestamptz not null default now(),
  primary key (collection_id, link_id)
);
create index collection_links_link_id_idx on public.collection_links (link_id);

-- ============================================================
-- RLS
-- ============================================================

alter table public.collections enable row level security;
alter table public.collection_links enable row level security;

create policy "collections: select own" on public.collections
  for select using (auth.uid() = user_id);

create policy "collections: insert own" on public.collections
  for insert with check (auth.uid() = user_id);

create policy "collections: update own" on public.collections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "collections: delete own" on public.collections
  for delete using (auth.uid() = user_id);

create policy "collection_links: select own" on public.collection_links
  for select using (auth.uid() = user_id);

create policy "collection_links: insert own" on public.collection_links
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.collections c
      where c.id = collection_links.collection_id and c.user_id = auth.uid()
    )
    and exists (
      select 1 from public.links l
      where l.id = collection_links.link_id and l.user_id = auth.uid()
    )
  );

create policy "collection_links: update own" on public.collection_links
  for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.collections c
      where c.id = collection_links.collection_id and c.user_id = auth.uid()
    )
    and exists (
      select 1 from public.links l
      where l.id = collection_links.link_id and l.user_id = auth.uid()
    )
  );

create policy "collection_links: delete own" on public.collection_links
  for delete using (auth.uid() = user_id);

-- Tables created by migrations don't inherit the authenticated grants (see 0009).
grant select, insert, update, delete on public.collections to authenticated;
grant select, insert, update, delete on public.collection_links to authenticated;

-- ============================================================
-- updated_at moves forward on any change to a collection
-- ============================================================

create function public.collections_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger collections_touch_updated_at
  before update on public.collections
  for each row execute function public.collections_touch_updated_at();

-- Add, remove, Undo and reorder bump the parent collection. During a cascade
-- delete of the collection itself this updates zero rows.
create function public.collection_links_touch_collection() returns trigger
language plpgsql as $$
begin
  update public.collections
    set updated_at = now()
    where id = coalesce(new.collection_id, old.collection_id);
  if tg_op = 'UPDATE' and new.collection_id is distinct from old.collection_id then
    update public.collections set updated_at = now() where id = old.collection_id;
  end if;
  return null;
end;
$$;

create trigger collection_links_touch_collection
  after insert or update or delete on public.collection_links
  for each row execute function public.collection_links_touch_collection();

-- ============================================================
-- Reorder: renumber the collection 1..N (clears ties), then swap two rows.
-- ============================================================

create function public.swap_collection_link_positions(
  p_collection_id uuid,
  p_link_a uuid,
  p_link_b uuid
)
returns void
language plpgsql
security invoker
as $$
declare
  v_pos_a integer;
  v_pos_b integer;
begin
  if not exists (
    select 1 from public.collection_links
    where collection_id = p_collection_id and link_id = p_link_a
  ) or not exists (
    select 1 from public.collection_links
    where collection_id = p_collection_id and link_id = p_link_b
  ) then
    raise exception 'link not in collection';
  end if;

  with ordered as (
    select link_id, row_number() over (order by position, added_at, link_id) as rn
    from public.collection_links
    where collection_id = p_collection_id
  )
  update public.collection_links cl
    set position = ordered.rn
    from ordered
    where cl.collection_id = p_collection_id
      and cl.link_id = ordered.link_id
      and cl.position is distinct from ordered.rn;

  select position into v_pos_a from public.collection_links
    where collection_id = p_collection_id and link_id = p_link_a;
  select position into v_pos_b from public.collection_links
    where collection_id = p_collection_id and link_id = p_link_b;

  update public.collection_links set position = v_pos_b
    where collection_id = p_collection_id and link_id = p_link_a;
  update public.collection_links set position = v_pos_a
    where collection_id = p_collection_id and link_id = p_link_b;
end;
$$;

grant execute on function public.swap_collection_link_positions(uuid, uuid, uuid) to authenticated;
