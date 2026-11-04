# SPEC 32 — Retry failed import rows

> **Status:** Draft
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-11-02
> **Objective:** The import summary offers `Retry N failed`, which runs the rows that couldn't be saved again with the same options, without the user copying URLs back into the form.

## Why this spec exists

SPECs 04 and 05 both deferred "Retry failed". Today the user copies the failed URLs and imports them again. That loses each row's own data, such as its title, notes, status and tags, and the form's inputs may already be cleared.

## Scope

**In:**

- `Retry N failed` in the finished and cancelled views, for rows that failed with `save_error`.
- A retry runs only those rows, with the same category, tags, auto-fetch choice and settings as the original run.
- The modal goes back to its running state, and the counters show the retry only.
- A retry can be retried while rows still fail.
- `invalid_url` rows aren't retried, because the result can't change. They stay listed with `Copy failed URLs`.
- Non-v2 imports only.
- `CLAUDE.md` updated.

**Out of scope (for future specs):**

- Retrying v2 restores.
- Retrying skipped generic pages or unprocessed rows.
- Automatic retries.
- Showing a total across the original run and its retries.

## Data model

This feature introduces no new data and no DB change.

```ts
// lib/services/links.ts — added to ImportResult
retryable: ImportLinkInput[] // rows that failed with save_error, as given to importLinks
```

`useLinkImport` adds `retryFailed()` and `retryableCount`.

## Implementation plan

1. **Collect rows in `importLinks`.** When a row fails with `save_error`, add its input to `retryable`. A signed-in-user failure returns all inputs. Metadata already fetched is reused by adding it to the stored input, so a retry doesn't fetch again.
2. **Split `handleImport` in `useLinkImport`.** Move the `importLinks` call and its options into a helper, and keep the run's default category and auto-fetch choice for reuse. `retryFailed()` calls it with the stored rows, and doesn't re-read the form.
3. **Update `ImportProgressModal`.** Add the primary `Retry N failed` button beside the copy buttons, hidden for v2 runs and when there are no retryable rows.
4. **Keep the list in sync.** Refetch tags after a retry that saved something, as the first run does.
5. **Add tests:** only `save_error` rows are returned; a retried row saves once; a duplicate found on retry counts as already existing; the button's visibility in the modal.

## Acceptance criteria

- [ ] With a forced save failure on 2 of 5 rows, the summary offers `Retry 2 failed`.
- [ ] After the failure clears, retrying saves those 2 rows, with their own title, notes, status and tags intact.
- [ ] The earlier 3 rows aren't saved again.
- [ ] Rows with an invalid URL are still listed, aren't counted in the button, and aren't retried.
- [ ] Retrying with the failure still present shows the same rows as failed, and the button is offered again.
- [ ] Rows with fetched metadata don't fetch again on retry.
- [ ] A retry can be cancelled like any import.
- [ ] A v2 import shows no retry button.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** retry only `save_error`. An invalid URL fails the same way every time.
- **Yes:** keep each row's data and fetched metadata in memory, so a retry is cheap and doesn't call remote sites again.
- **No:** v2 retries. Those rows go through category and tag phases first, and restoring them needs its own care.
- **Yes:** the counters show only the retry, which keeps the modal's logic the same as a normal run.

## Risks

| Risk | Mitigation |
| --- | --- |
| A row saved but reported as failed gets saved twice | `importLinks` checks duplicates by URL fingerprint first, so it counts as already existing. |
| The first run's counts disappear when a retry starts | Accepted. The links are saved either way, and combined totals are out of scope. |
| Refactoring `handleImport` breaks the normal flow | The existing `useLinkImport` tests must pass unchanged. |

## What is **not** in this spec

- Retrying v2 restores, generic skips or unprocessed rows.
- Automatic retries.
- Combined totals across retries.

Each one of those, if it lands, goes in its own spec.
