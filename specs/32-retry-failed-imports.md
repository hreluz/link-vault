# SPEC 32 — Retry failed import rows

> **Status:** Approved
> **Depends on:** SPEC 04, SPEC 05, SPEC 30
> **Date:** 2026-11-02 (revised 2026-11-04)
> **Objective:** The import summary offers `Retry N failed`, which runs the rows that couldn't be saved again with the same options, without the user copying URLs back into the form.

## Why this spec exists

SPECs 04 and 05 both deferred "Retry failed". Today there are two ways to retry, and both cost something:

- `Copy failed URLs` and pasting them into the URLs tab loses each row's own data, such as its title, notes, status and tags.
- Importing the same input again works, since saved rows are skipped as already existing. But the form is cleared after a run that saved anything, so a pasted JSON is gone, a file has to be picked again, and the failed rows fetch their metadata a second time.

A retry button makes this one click, keeps every row's data, and doesn't call remote sites again.

## Scope

**In:**

- `Retry N failed` in the finished and cancelled views, for rows that failed with `save_error`.
- A retry runs only those rows, with the same default category as the original run. The form isn't read again.
- Each retried row keeps its own data (title, notes, status, tags, favorite, category) plus what the run added (CSV category, domain category, import tags, fetched metadata).
- A retry never fetches metadata. In an auto-fetch run, every row that reached the insert is marked as already tried, including rows whose host was skipped, so a retry has no throttle waits or host-block pauses.
- A retried row that had no metadata in the original run is still counted as "without metadata".
- The modal goes back to its running state, with the status line `Retrying N failed links…`, and the counters show the retry only.
- A retry can be retried while rows still fail.
- A retry can be cancelled. Its unprocessed rows go back into the retryable rows, so they can be retried again.
- `invalid_url` rows aren't retried, because the result can't change.
- Lists the retry doesn't touch are carried into its summary with their copy buttons: invalid URLs (`Copy failed URLs`), generic-page skips (`Copy skipped URLs`) and unprocessed URLs from a cancelled original run (`Copy unprocessed URLs`).
- A retry adds to the same undo record as the original run (SPEC 30), so `Undo this import` removes the links of the run and all its retries.
- Non-v2 imports only.
- `CLAUDE.md` updated.

**Out of scope (for future specs):**

- Retrying v2 restores.
- Retrying skipped generic pages or unprocessed rows.
- Retrying after the `error` view (the run threw, so there is no result to retry from).
- Automatic retries.
- Showing a total across the original run and its retries.

## Data model

This feature introduces no new data and no DB change.

```ts
// lib/services/links.ts
export type ImportLinkInput = {
  // ...existing fields
  /** Set on rows handed back for retry: metadata was already tried, don't fetch again. */
  metaTried?: boolean
  /** Set with metaTried when that attempt left the row without metadata, so a retry still counts it. */
  metaMissing?: boolean
}

export type ImportResult = {
  // ...existing fields
  /** Rows that failed with save_error, as they stood just before the insert. */
  retryable: ImportLinkInput[]
}

export type ImportLinksOptions = {
  // ...existing fields
  /** Set by a retry: rows left unprocessed by a cancel are added to `retryable`. */
  retry?: boolean
}
```

`useLinkImport` adds `retryFailed()` and `retryableCount`.

## Implementation plan

1. **Collect rows in `importLinks`.**
   - When the insert fails, push the row as it stood at that point (after the metadata merge) to `retryable`.
   - In a run with `fetchMeta`, set `metaTried: true` on that row whether or not a fetch ran (a skipped host counts), and `metaMissing` to the row's own result.
   - The signed-out early return sets `retryable` to all inputs.
   - The fetch check skips rows with `metaTried`, so a row whose first fetch filled only some fields isn't fetched again.
   - A `metaTried` row with `metaMissing` adds to the "without metadata" count and reports `metaMissing: true` in its `imported` outcome.
   - With `retry: true`, rows left unprocessed by a cancel are added to `retryable` as well as `notProcessed`.
   - The URL-path title fallback stays applied at save time, not stored on the row.
2. **Split `handleImport` in `useLinkImport`.**
   - Move the `importLinks` call and its options into a helper.
   - Keep the run's default category in a ref.
   - `retryFailed()` calls the helper with the stored rows, that category, `retry: true` and no `fetchMeta`. It skips CSV category resolution, `applyDomainCategories`, `applyImportTags` and reading the fetch settings, since the rows already carry their results and a retry never fetches.
   - `openModal` takes a `keepUndo` option. A retry resets the stats but not the undo record.
   - Before a retry starts, the summary lists it won't touch are carried forward: `invalid_url` failures, generic-page skips, and the original run's unprocessed URLs. Each pass adds its own entries to them.
   - `closeImportModal` clears the retryable rows, the carried lists and the run context.
3. **Update `ImportProgressModal`.**
   - Add the primary `Retry N failed` button beside the copy buttons in the finished and cancelled views. It's hidden for v2 runs, when there are no retryable rows, and while undo is confirming, deleting or done.
   - While a retry runs, the status line reads `Retrying N failed links…`.
   - The summary shows the carried lists next to the retry's own results, with their existing copy buttons.
4. **Keep the list in sync.** Refetch tags after a retry that saved something, as the first run does.
5. **Add tests:**
   - `importLinks`: only `save_error` rows are returned, with merged metadata, `metaTried` and `metaMissing`; a row from a skipped host is marked `metaTried`; a signed-out run returns all rows; a `metaTried` row isn't fetched; a `metaMissing` row counts as without metadata; with `retry: true`, a cancel returns the unprocessed rows in `retryable`; a row already saved counts as already existing.
   - `useLinkImport`: a retry runs only the stored rows with the original category, even after the form was cleared; the undo record grows across the run and its retries; invalid URLs, generic skips and unprocessed URLs are carried into the retry's summary.
   - `ImportProgressModal`: the button's label and visibility (shown for retryable rows; hidden for none, for v2, and once undo starts); the `Retrying N failed links…` status line; the carried lists and their copy buttons.

## Acceptance criteria

- [ ] With a forced save failure on 2 of 5 rows, the summary offers `Retry 2 failed`.
- [ ] After the failure clears, retrying saves those 2 rows, with their own title, notes, status and tags intact.
- [ ] The retry works after the form was cleared, and for CSV, JSON file, pasted JSON and pasted URLs.
- [ ] The earlier 3 rows aren't saved again.
- [ ] Rows with an invalid URL are still listed after a retry, aren't counted in the button, and aren't retried.
- [ ] Generic-page skips and the original run's unprocessed URLs are still listed after a retry, with their copy buttons.
- [ ] Retrying with the failure still present shows the same rows as failed, and the button is offered again.
- [ ] A retry makes no metadata requests, including for rows whose host was skipped or whose first fetch filled only some fields.
- [ ] A retried row that had no metadata is counted as "without metadata".
- [ ] While a retry runs, the status line reads `Retrying N failed links…`.
- [ ] A retry can be cancelled like any import, and its unprocessed rows are offered in the next `Retry N failed`.
- [ ] `Undo this import` after a retry removes the links saved by the run and by the retry.
- [ ] The retry button is hidden once undo starts.
- [ ] A v2 import shows no retry button.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** retry only `save_error`. An invalid URL fails the same way every time.
- **Yes:** keep each row's data and fetched metadata in memory, so a retry is cheap and doesn't call remote sites again.
- **Yes:** mark retried rows with `metaTried` rather than relying on empty fields, since a partial fetch leaves some fields empty.
- **No:** fetching on retry, even for rows whose host was skipped. A retry is about the save, and fetching would bring back throttle waits and host-block pauses.
- **Yes:** a retry's unprocessed rows stay retryable. They were failed rows, and dropping them would lose their data.
- **Yes:** carry every summary list the retry doesn't touch, so no copy button from the original run is lost.
- **No:** v2 retries. Those rows go through category and tag phases first, and restoring them needs its own care.
- **Yes:** the counters show only the retry, which keeps the modal's logic the same as a normal run.
- **Yes:** one undo record for the run and its retries. Undoing only the last pass would leave the user unable to undo the rest.
- **No:** retry while undo is in progress or done. Retrying after an undo would bring links back.

## Risks

| Risk | Mitigation |
| --- | --- |
| A row saved but reported as failed gets saved twice | `importLinks` checks duplicates by URL fingerprint first, so it counts as already existing. |
| The first run's counts disappear when a retry starts | Accepted. The links are saved either way, and combined totals are out of scope. |
| A retry resets the undo record and the first run can't be undone | `openModal` keeps the undo record on retries; covered by a hook test. |
| Refactoring `handleImport` breaks the normal flow | The existing `useLinkImport` tests must pass unchanged. |
| A row fails every time (e.g. its category was deleted in another tab), so the button keeps coming back | Accepted. Each retry is the user's own click, and the row stays listed with its URL. |
| A row whose host was skipped is saved without metadata on retry | Accepted. It's counted as "without metadata", the same as in the original run. |

## What is **not** in this spec

- Retrying v2 restores, generic skips or unprocessed rows.
- Retrying from the `error` view.
- Automatic retries.
- Combined totals across retries.

Each one of those, if it lands, goes in its own spec.
