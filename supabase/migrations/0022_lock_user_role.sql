-- Signed-in users can no longer update their own users row (which included `role`),
-- so the admin checks and the admin-only app_settings policy become a real boundary.
-- The only write to users in the app (promoting ADMIN_EMAIL in confirmSignup) now
-- goes through the service-role client.
drop policy "users: update own" on public.users;
revoke update on public.users from authenticated;

-- Tables created by migrations don't get service_role grants automatically.
grant select, update on public.users to service_role;
