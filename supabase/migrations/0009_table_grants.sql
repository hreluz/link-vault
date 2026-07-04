-- ============================================================
-- Base table grants for the `authenticated` role.
--
-- Tables created via migrations run as `postgres` only pick up
-- `postgres`'s own default privileges (TRUNCATE/REFERENCES/TRIGGER),
-- not the broader grants Supabase Cloud project provisioning applies
-- automatically. Without these, PostgREST returns "permission denied"
-- for every query regardless of RLS policies. Grants below mirror
-- exactly what each table's RLS policies already allow.
-- ============================================================

grant select, update on public.users to authenticated;

grant select, insert, update, delete on public.links to authenticated;

grant select, insert, update, delete on public.tags to authenticated;

grant select, insert, delete on public.link_tags to authenticated;

grant select, insert, update, delete on public.categories to authenticated;

grant select, insert, delete on public.category_domains to authenticated;

grant select, insert, update, delete on public.private_tag_settings to authenticated;

grant select, update on public.app_settings to authenticated;
grant select on public.app_settings to anon;
