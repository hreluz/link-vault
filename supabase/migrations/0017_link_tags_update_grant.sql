-- mergeTag() (lib/services/tags.ts) reassigns link_tags.tag_id from the merged-away
-- tag to the surviving tag, which needs both the table grant and an RLS policy that
-- 0009_table_grants.sql / 0001_initial_schema.sql never added since nothing
-- previously updated link_tags rows.

grant update on public.link_tags to authenticated;

create policy "link_tags: update own" on public.link_tags
  for update using (
    exists (
      select 1 from public.links
      where links.id = link_tags.link_id
        and links.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.links
      where links.id = link_tags.link_id
        and links.user_id = auth.uid()
    )
  );
