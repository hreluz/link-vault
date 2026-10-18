# SPEC 08 — Admin-configurable import fetch guard

> **Status:** Approved
> **Depends on:** SPEC 07
> **Date:** 2026-10-18
> **Objective:** Let the admin edit the import auto-fetch guard's same-host gap, retry wait and empty-streak limit from Admin Settings, instead of the hardcoded 2 s / 60 s / 3.

## Why this spec exists

SPEC 07 hardcoded three guard values: `FETCH_GAP_MS = 2000` and `EMPTY_STREAK_LIMIT = 3` in `lib/services/importExport/fetchGuard.ts`, and `HOST_BLOCK_RETRY_MS = 60_000` in `lib/hooks/importExport/useLinkImport.ts`. SPEC 07 listed "a configurable gap, wait length or streak limit" as out of scope. Tuning them now needs a deploy. The admin should be able to tune them from the running app, for example lowering the gap when imports feel slow, or raising it when a host keeps blocking.

The settings live in the shared `app_settings` row. Today its RLS update policy lets **any** authenticated user update that row, and only the server action's role check stops them. This spec narrows that policy to admins.

## Scope

**In:**

- Three new app-wide settings on `app_settings`, all whole numbers:
  - **Same-host gap:** seconds, 0–30, default 2. 0 turns the throttle off.
  - **Retry wait:** seconds, 10–600, default 60.
  - **Empty-streak limit:** fetches, 1–10, default 3.
- A new "Import auto-fetch" card on `/dashboard/config/admin-settings`:
  - three labeled number inputs, each showing its unit and allowed range;
  - one Save button that validates and saves all three together;
  - a `Saved` success toast (Sonner), and an inline error in the card on failure (design-system error style).
- Validation on the client (form), in the server action, and in the database (`check` constraints).
- **Snapshot at import start.**
  - The Import/Export page loads the settings on mount for the pre-import estimate.
  - Each import re-reads them at start and uses that snapshot for its whole run: throttle, breaker, retry countdown, pre-import estimate and live ETA.
  - Changing the settings mid-import affects only the next import.
- **Fallback.** If reading the settings fails, or the row/columns are missing, the defaults (2 s / 60 s / 3) are used and the import is never blocked.
- **Dynamic modal copy** in `ImportProgressModal`:
  - `Wait <duration> and retry`. The duration reads `45 s`, `1 minute`, `2 minutes` or `1 min 30 s`, and the default reads exactly `Wait 1 minute and retry`, as today;
  - `The last N links from it came back empty.`, or `The last link from it came back empty.` when N is 1;
  - the countdown's clamp uses the configured wait instead of `HOST_BLOCK_RETRY_MS`.
- **RLS hardening.** Migration replaces the `"Authenticated users can update app settings"` policy with an admin-only update policy (`role = 'admin'` on the caller's `public.users` row). It covers the two existing switches too.
- Tests for the service, the server action's validation, the guard, the estimate, the hook, the modal and the admin form.

**Out of scope (for future specs):**

- **Locking `users.role`.** Users can still update their own `role` through `"users: update own"`, so the admin-only policy can be bypassed by self-promotion. Fixing it requires replacing the `ADMIN_EMAIL` promotion in `confirmSignup` (`lib/services/auth.ts`), which relies on that same self-update.
- Per-user guard settings.
- Per-host overrides (e.g. a longer gap only for `instagram.com`).
- Escalating waits, auto-fallback, or "Retry now" (still out, as in SPEC 07).
- Making the Add Link form's single fetch use these settings.
- Fractional seconds.

## Data model

Migration `supabase/migrations/0018_import_fetch_settings.sql`:

```sql
alter table public.app_settings
  add column import_fetch_gap_seconds    integer not null default 2  check (import_fetch_gap_seconds between 0 and 30),
  add column import_retry_wait_seconds   integer not null default 60 check (import_retry_wait_seconds between 10 and 600),
  add column import_empty_streak_limit   integer not null default 3  check (import_empty_streak_limit between 1 and 10);

drop policy "Authenticated users can update app settings" on public.app_settings;
create policy "Admins can update app settings"
  on public.app_settings for update
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
```

No new grants are needed: `0009_table_grants.sql` already grants `select, update` on `app_settings` to `authenticated`. The `select` policy stays `using (true)`, so the browser client can read the values during import.

`lib/types/database.ts`: add the three columns to `app_settings` `Row` / `Insert` / `Update`.

```ts
// lib/services/importExport/fetchGuard.ts
export type FetchGuardConfig = { gapMs: number; emptyStreakLimit: number }
export const FETCH_GAP_MS = 2000        // kept: now the default
export const EMPTY_STREAK_LIMIT = 3     // kept: now the default
export function createFetchGuard(deps?: { now?; sleep?; config?: FetchGuardConfig })  // config defaults to the constants
```

```ts
// lib/services/appSettings.ts
export type ImportFetchSettings = {
  fetchGapSeconds: number      // 0–30
  retryWaitSeconds: number     // 10–600
  emptyStreakLimit: number     // 1–10
}
export const DEFAULT_IMPORT_FETCH_SETTINGS: ImportFetchSettings = { fetchGapSeconds: 2, retryWaitSeconds: 60, emptyStreakLimit: 3 }
export const IMPORT_FETCH_LIMITS = { fetchGapSeconds: [0, 30], retryWaitSeconds: [10, 600], emptyStreakLimit: [1, 10] } as const
export function validateImportFetchSettings(s: ImportFetchSettings): string | null   // null = valid; whole numbers in range
export async function getImportFetchSettings(supabase): Promise<ImportFetchSettings>  // defaults on error / missing row
export async function setImportFetchSettings(supabase, s: ImportFetchSettings): Promise<AppSettingsResult>
```

Other signature changes:

- `ImportLinksOptions` gains `guardConfig?: FetchGuardConfig`, passed to `createFetchGuard`.
- `EstimateOptions` (`simulateImportMs`) gains `gapMs?: number`, defaulting to `FETCH_GAP_MS`.
- `useLinkImport` drops the `HOST_BLOCK_RETRY_MS` constant in favor of the snapshot's retry wait. It exposes `retryWaitMs` and `emptyStreakLimit` for the modal.

## Implementation plan

1. **Migration and types.** Add `0018_import_fetch_settings.sql` as above, and update `lib/types/database.ts`. Manual check: `supabase db reset`. The admin can toggle registration. A non-admin `update app_settings` through the REST API affects 0 rows.
2. **Service.** In `lib/services/appSettings.ts`, add `ImportFetchSettings`, the defaults, the limits, `validateImportFetchSettings`, `getImportFetchSettings` and `setImportFetchSettings`, following the shape of `isRegistrationEnabled` and `setRegistrationEnabled`. `set` validates first and returns `{ success: false, error }` without writing when a value is invalid. Tests:
   - `get` returns the defaults on error or a missing row;
   - `get` maps the columns;
   - `validate` rejects out-of-range values, decimals and NaN, and accepts the boundaries;
   - `set` writes the three columns plus `updated_at`.
3. **Server action and admin card.**
   - In `app/dashboard/config/admin-settings/actions.ts`, add `saveImportFetchSettingsAction(settings)`. It does the same admin check, then calls `setImportFetchSettings`.
   - `page.tsx` loads `getImportFetchSettings` alongside the two switches.
   - `AdminSettingsForm.tsx` gets the "Import auto-fetch" card: three inputs (design-system input style, `type="number"`, `min`/`max`/`step=1`), one primary Save button, disabled while pending, a toast on success and an inline error on failure.
   - Tests: the action rejects non-admins and invalid values, and the card submits the three values and shows the error.
4. **Guard and estimate take config.**
   - `createFetchGuard` reads `gapMs` and `emptyStreakLimit` from `config`, falling back to the constants.
   - `simulateImportMs` uses `gapMs`.
   - `importLinks` passes `options.guardConfig` to `createFetchGuard`.
   - Tests: gap 0 never sleeps, gap 5000 sleeps up to 5000, a streak of 1 trips on the first empty, and the estimate with `gapMs: 0` has no gap. The existing tests pass unchanged with the defaults.
5. **Hook snapshot.** In `lib/hooks/importExport/useLinkImport.ts`:
   - load `getImportFetchSettings` (browser client) on mount into state for the pre-import estimate;
   - at import start, re-read it and store the snapshot in a ref;
   - pass `guardConfig` to `importLinks`, and pass `gapMs` to the estimate and to `useImportEta`, whose run must carry `gapMs` into its `simulateImportMs` calls;
   - `waitAndRetry` uses the snapshot's retry wait instead of `HOST_BLOCK_RETRY_MS`;
   - expose `retryWaitMs` and `emptyStreakLimit`.

   Tests:
   - a mocked settings read of 30 s makes `waitAndRetry` resolve only after 30 s;
   - changing the mocked value after start doesn't affect the running import;
   - a read error falls back to 60 s.
6. **Modal copy.** In `ImportProgressModal.tsx`, take `retryWaitMs` and `emptyStreakLimit` props, which `ImportExportClient.tsx` wires in:
   - add a `formatWait(ms)` helper for the button label;
   - make the empty-reason line dynamic;
   - clamp the countdown with `retryWaitMs`.

   Tests: `Wait 1 minute and retry` at 60 s, `Wait 45 s and retry`, `Wait 2 minutes and retry`, `Wait 1 min 30 s and retry`, `The last 5 links…`, `The last link…`, and a countdown starting at `0:30` for a 30 s wait.
7. **Docs.** In CLAUDE.md, update feature #12, saying the gap, retry wait and empty streak default to 2 s / 1 min / 3 and are admin-configurable. Update feature #16 to list the "Import auto-fetch" card and the admin-only update policy.

## Acceptance criteria

- [ ] Admin Settings shows an "Import auto-fetch" card with the three fields prefilled with 2, 60 and 3 on a fresh database.
- [ ] Saving 5 / 30 / 2 shows a `Saved` toast. After a reload the fields show 5 / 30 / 2.
- [ ] Saving 31, -1, 2.5 or an empty gap shows an inline error and writes nothing. So do a retry wait of 5 or 601, and a streak of 0 or 11.
- [ ] A non-admin calling the server action gets `Not authorized`. A non-admin `PATCH` on `app_settings` through the REST API changes 0 rows.
- [ ] Both existing switches still save for the admin.
- [ ] With the gap at 5 s, two consecutive YouTube fetches in an import start ≥5 s apart, and the pre-import estimate grows accordingly.
- [ ] With the gap at 0, consecutive same-host fetches have no added wait.
- [ ] With the streak at 1, a single empty Instagram fetch pauses the import with `The last link from it came back empty.`
- [ ] With the retry wait at 30 s, the button reads `Wait 30 s and retry`, the countdown starts at `0:30`, and the row is re-fetched after 30 s.
- [ ] Changing the settings while an import runs does not change that import's gap or wait.
- [ ] If reading the settings fails, imports use 2 s / 60 s / 3, and the button reads `Wait 1 minute and retry`.
- [ ] The card renders correctly in light and dark mode, and at 375 px with no horizontal scroll.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** All three guard values are configurable. These are the knobs an admin would actually tune when a host starts blocking.
- **Yes:** Whole seconds with fixed ranges: gap 0–30, wait 10–600, streak 1–10. They are easy to type and enough for the job. The 10 s wait floor stops "retry" from becoming a hot loop.
- **Yes:** A gap of 0 is allowed and turns the throttle off. The breaker still works.
- **No:** Fractional seconds. No real need, and it adds parsing edge cases.
- **Yes:** App-wide settings on `app_settings`. The guard protects the server's IP, which every user shares, so a per-user value makes no sense.
- **Yes:** Snapshot at import start. A run behaves the same from start to finish, and the ETA model stays consistent.
- **No:** Reading the settings only on page load. A stale tab would ignore a fresh admin change.
- **Yes:** Defaults on a read failure. A settings outage must never block imports.
- **Yes:** One card with one Save button. The three values are tuned together, and a single save avoids half-applied combinations.
- **Yes:** Validation in three layers: form, server action and DB `check`. The DB constraint is the final guard if a client skips the action.
- **Yes:** The modal copy follows the configured values. A hardcoded "1 minute" would be wrong as soon as the admin changes it.
- **Yes:** Narrow the `app_settings` update policy to admins. This closes direct REST writes by ordinary users.
- **No (deferred):** Locking `users.role` in this spec. The `ADMIN_EMAIL` promotion in `confirmSignup` depends on self-updating `role`, and replacing it (trigger, service-role client, or manual promotion) is its own decision.
- **Yes:** Keep `FETCH_GAP_MS` and `EMPTY_STREAK_LIMIT` as exported defaults. Existing tests and the fallback path keep working.

## Risks

| Risk | Mitigation |
| --- | --- |
| Any user can still self-promote to `admin` via `"users: update own"`, so the new policy can be bypassed | Recorded as out of scope. Needs its own spec to lock `users.role` and replace the `ADMIN_EMAIL` promotion. |
| The admin sets the gap to 0 and a host blocks quickly | The breaker still pauses the import. The admin can raise the gap again. |
| A long gap (30 s) makes large single-host imports very slow | The pre-import estimate shows the real cost before the user starts. |
| The settings read fails during import start | Falls back to the defaults, and the import continues. |
| The migration's `drop policy` name doesn't match on some environment | It uses the exact name from `0007_admin_settings.sql`, and is checked with `supabase db reset`. |

## What is **not** in this spec

- Locking `users.role` / replacing `ADMIN_EMAIL` promotion.
- Per-user or per-host guard settings.
- Escalating waits, auto-fallback, or "Retry now".
- Using these settings in the Add Link form.
- Fractional seconds.

Each one of those, if it lands, goes in its own spec.
