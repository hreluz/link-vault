# SPEC 27 — Stop users from changing their own role

> **Status:** Approved
> **Depends on:** SPEC 08
> **Date:** 2026-11-02
> **Objective:** A signed-in user can no longer change `users.role`, so the admin checks and the admin-only `app_settings` policy become a real boundary. The `ADMIN_EMAIL` account still becomes admin when it confirms its email.

## Why this spec exists

`"users: update own"` (migration `0001`) lets any signed-in user update their own `users` row, including `role`. A user can call `supabase.from('users').update({ role: 'admin' })` from the browser and pass every admin check. SPEC 08 recorded this as out of scope.

The policy stays only because `confirmSignup` (`lib/services/auth.ts`) uses it to promote the `ADMIN_EMAIL` account. That is the only write to `users` in the app.

## Scope

**In:**

- A migration that drops `"users: update own"` and revokes `update` on `public.users` from `authenticated`.
- The same migration grants `select, update` on `public.users` to `service_role`, because tables created by migrations don't get those grants automatically.
- A new server-only client, `lib/supabase/admin.ts`, using a new `SUPABASE_SERVICE_ROLE_KEY` env var.
- `confirmSignup` promotes through that client, and logs an error if the update fails.
- `.env.local.example`, `DEPLOYMENT.md` and `CLAUDE.md` updated, including removing the "not yet a hard boundary" note from feature #16.
- A query in `DEPLOYMENT.md` that lists current admins, to run once after deploying.

**Out of scope (for future specs):**

- An admin screen for granting or removing the admin role.
- Removing the admin role from an account whose email is no longer `ADMIN_EMAIL`.
- Replacing `ADMIN_EMAIL` with several admin emails.

## Data model

```sql
drop policy "users: update own" on public.users;
revoke update on public.users from authenticated;
grant select, update on public.users to service_role;
```

`users.role` itself doesn't change. New env var: `SUPABASE_SERVICE_ROLE_KEY`.

## Implementation plan

1. **Add the migration**, using the next free number.
2. **Add `lib/supabase/admin.ts`.** It exports `createAdminClient()` and starts with `import 'server-only'`, so a client import fails the build.
3. **Update `confirmSignup`.** Only the promotion uses the admin client. The OTP check keeps the normal server client. If the key is missing, log an error and let the confirmation succeed.
4. **Add tests** to the `confirmSignup` tests: an admin email promotes through the admin client, another email never creates it, and a failed promotion doesn't fail the confirmation.
5. **Update the docs**, including the Vercel env var and the admin audit query.

## Acceptance criteria

- [ ] Signed in as a normal user, updating your own `role` from the browser client changes nothing, and the role stays `user`.
- [ ] After that attempt, Admin Settings still redirects that user to `/dashboard/config`, and `app_settings` updates are still refused.
- [ ] Confirming the email of a new `ADMIN_EMAIL` account makes it an admin.
- [ ] Confirming any other email leaves the role as `user`.
- [ ] An existing admin keeps their role and can still save Admin Settings.
- [ ] `lib/supabase/admin.ts` can't be imported into client code without failing the build.
- [ ] `supabase db reset` works.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes (please confirm):** a service-role client, because signup behaves exactly as it does today. **No:** promoting the admin by hand with SQL. It needs no new secret, but adds a manual step to every fresh setup. It is a fair choice for a one-admin app; if you prefer it, steps 2 and 3 go away and `ADMIN_EMAIL` can be removed.
- **Yes:** drop the update policy and the grant entirely, because the app writes nothing else to `users`. **No:** a column-level grant or a trigger protecting only `role`. They guard a permission nothing needs.
- **No:** an automatic reset of existing admins. The migration can't know who is legitimate, so the audit query is run by hand.

## Risks

| Risk | Mitigation |
| --- | --- |
| The service-role key bypasses RLS if it leaks | `server-only` import, no `NEXT_PUBLIC_` prefix, one call site. |
| The key is missing on Vercel, so the admin isn't promoted | Only affects a new `ADMIN_EMAIL` signup. The error is logged, and `DEPLOYMENT.md` lists the variable. |
| Someone already promoted themselves | The audit query finds them, and a role can be corrected in Supabase Studio. |
| A future feature needs to write to `users` | It adds a policy and a grant for the specific columns it needs. |

## What is **not** in this spec

- An admin management screen.
- Automatic removal of existing admins.
- Support for several admin emails.

Each one of those, if it lands, goes in its own spec.
