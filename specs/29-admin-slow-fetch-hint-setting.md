# SPEC 29 — Admin setting for the slow-fetch hint

> **Status:** Approved
> **Depends on:** SPEC 08, SPEC 11
> **Date:** 2026-11-02
> **Objective:** The admin can set how long an import fetch runs before `Fetching <host>…` becomes `Still waiting on <host>…`, from 5 to 60 s, with a default of 10 s.

## Why this spec exists

SPEC 11 hard-coded the threshold as `SLOW_FETCH_HINT_MS` and planned the setting as "SPEC 12". That number went to generic-page skipping, so the plan was left without a spec.

## Scope

**In:**

- A new `import_slow_hint_seconds` column on `app_settings`: default 10, range 5–60, no off switch.
- A new field in `ImportFetchSettingsCard`, saved by the card's one Save button.
- Validation in the form, in `saveImportFetchSettingsAction` and in a DB `check` constraint, as SPEC 08 does.
- Each import uses the value from its start, through the existing `runFetchSettings` snapshot, and falls back to 10 s if the read fails.
- `CLAUDE.md` updated.

**Out of scope (for future specs):**

- Turning the hint off.
- Per-host or per-user values.
- Changing the fetch timeout itself.

## Data model

```sql
alter table public.app_settings
  add column import_slow_hint_seconds integer not null default 10
  check (import_slow_hint_seconds between 5 and 60);
```

```ts
// lib/services/appSettings.ts
export type ImportFetchSettings = {
  fetchGapSeconds: number
  retryWaitSeconds: number
  emptyStreakLimit: number
  slowHintSeconds: number // new
}
```

`SLOW_FETCH_HINT_MS` stays as the source of the default.

## Implementation plan

1. **Add the migration**, using the next free number, and update `lib/types/database.ts`.
2. **Update `lib/services/appSettings.ts`:** the type, `DEFAULT_IMPORT_FETCH_SETTINGS`, `IMPORT_FETCH_LIMITS`, the labels, and the read and write functions.
3. **Update `ImportFetchSettingsCard`.** Add the `Slow-fetch hint` field, in seconds.
4. **Update `ImportProgressModal`.** The fetching line takes the threshold from the run's snapshot instead of importing the constant.
5. **Add tests:** validation limits, read fallback, the card's new field, and a modal test where a 5 s threshold changes the text at 5 s.

## Acceptance criteria

- [ ] Admin Settings shows the new field, set to 10 on a fresh database.
- [ ] Saving 5 or 60 works, and the value is still there after a reload.
- [ ] Saving 4, 61, 7.5 or an empty field shows an error and saves nothing.
- [ ] With the value at 5, `Still waiting on <host>…` doesn't show before 5 s and shows soon after.
- [ ] A change made during a running import doesn't affect that import.
- [ ] If the settings read fails, the hint uses 10 s and the import continues.
- [ ] Non-admins still can't save the settings.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** 5–60 s with no off switch, as SPEC 11 planned.
- **Yes:** keep it on the same card and Save button, because it belongs with the other import settings.
- **Yes:** use the existing per-import snapshot, like the other three values.

## Risks

| Risk | Mitigation |
| --- | --- |
| With a 5 s value the hint appears on normal fetches, since each page has a 5 s timeout | It is only a wording change and the admin chooses the value. |
| The modal has no snapshot before settings load | It falls back to the default until `runFetchSettings` is set. |

## What is **not** in this spec

- An off switch for the hint.
- Per-host or per-user values.
- Fetch timeout changes.

Each one of those, if it lands, goes in its own spec.
