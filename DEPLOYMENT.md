# Deploying to Vercel + Supabase

## 1. Supabase (hosted project)

1. Create/open a project at [supabase.com/dashboard](https://supabase.com/dashboard) → **Settings → API** → grab the **Project URL**, the **anon public key** and the **service_role secret key**. The service-role key bypasses RLS: never prefix it with `NEXT_PUBLIC_`, and never commit it.
2. Link the repo and push migrations:
   ```bash
   nvm use v24.13.0
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. Verify all migrations landed:
   ```bash
   npx supabase migration list
   ```
   The Local and Remote columns should match on every version.
4. In the dashboard, go to **Auth → URL Configuration** and set:
   - **Site URL** → your production Vercel URL (e.g. `https://your-app.vercel.app`)
   - **Redirect URLs** → add that same URL (plus any preview/custom domains)

   You can do this after step 2 once you know the domain. Supabase defaults **Site URL** to `http://localhost:3000` for every new project — if you skip this, confirmation/magic-link emails sent from prod will keep linking back to `localhost:3000` instead of your deployed app. This has to be updated per environment (local vs. prod both need their own Site URL), and only takes effect for emails sent *after* the change — anyone with an already-sent localhost link needs a fresh email.

5. In the dashboard, go to **Auth → Email Templates** and replace the default **"Confirm signup"** and **"Reset password"** templates with the contents of `supabase/templates/confirmation.html` and `supabase/templates/recovery.html`.

   `supabase/config.toml`'s `[auth.email.template.*]` entries only apply to the **local** CLI stack (`supabase start`) — they are not synced to a hosted project automatically. If this step is skipped, hosted Supabase falls back to its default template, whose link points straight at `<project-ref>.supabase.co/auth/v1/verify` instead of `{{ .SiteURL }}/auth/confirm?token_hash=...`. That bypasses the app's `/auth/confirm` route entirely, so `confirmSignup()` never runs — breaking both the `ADMIN_EMAIL` → `role: 'admin'` grant on signup confirmation and the recovery-flow redirect to `/restart-account/confirm`.

## 2. Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the repo from GitHub.
2. Framework preset auto-detects Next.js — defaults are fine (`next build`, no custom `next.config.ts` settings).
3. Add environment variables (Settings → Environment Variables, or during import):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 1.1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1.1 |
   | `YOUTUBE_API_KEY` | optional — enables YouTube duration auto-fetch |
   | `ADMIN_EMAIL` | account email to grant the `admin` role on email confirmation |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key from step 1.1 — server-only; used solely to promote the `ADMIN_EMAIL` account when it confirms its email (users can't change their own `role`, migration `0022`). If it's missing, that promotion fails with a logged error and the confirmation still succeeds |

4. Deploy.

## 3. Verify

1. Open the deployed URL and sign in as `test@linkvault.dev` / `password123` (seeded demo account), or your own account.
2. First login bootstraps the vault client-side; for the seeded test account it auto-populates demo links.
3. Confirm the dashboard loads, search/filter work, and there are no console errors.

## 4. Audit admins (once, after deploying migration `0022`)

Before migration `0022_lock_user_role.sql`, any signed-in user could set their own `users.role` to `admin`. The migration closes that, but can't tell which existing admins are legitimate. Run this once in the Supabase SQL editor:

```sql
select u.id, u.email, u.role, u.created_at
from public.users u
where u.role = 'admin'
order by u.created_at;
```

The only row should be the `ADMIN_EMAIL` account. Set any other row back to `user` in Supabase Studio (Table Editor → `users` → `role`), or with:

```sql
update public.users set role = 'user' where id = '<id>';
```
