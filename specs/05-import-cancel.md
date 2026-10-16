# SPEC 05 — Cancel an import

> **Status:** Approved
> **Depends on:** SPEC 04
> **Date:** 2026-10-15
> **Objective:** Add a Cancel button to the running import progress modal that stops the import after the current row, keeps everything already saved, and ends with a "cancelled" summary that counts unprocessed links and can copy their URLs.

## Why this spec exists

SPEC 04's progress modal is locked until the import finishes. With SPEC 03's auto-fetch ON, a large import can run for many minutes, and the only way out is refreshing the page. A refresh cuts the import at an unknown point and gives no record of what was done. Both specs deferred cancelling to a future spec. This is that spec.

## Scope

**In:**

- A **Cancel** button in the running view of `ImportProgressModal`, for every import: Paste URLs, Paste JSON, CSV/JSON upload, and full v2 "Everything" restores.
  - It uses the secondary button style from the CLAUDE.md design system.
  - It is shown in every running state, including "Preparing…" and every v2 phase.
- **One click, no confirmation.** On click, the button changes to `Stopping…` and becomes disabled. It stays that way until the current row finishes.
- **Stop after the current row.** The link in progress finishes completely: fetch, save and tags. The import then stops before the next row. A row is never left half-written.
- **v2 restores stop at checkpoints:**
  - the cancel signal is checked before each phase (categories, domains, tags, links, preferences) and before each link row;
  - categories and domain rules run in parallel, so a phase that has started always completes;
  - every phase after the cancel point is skipped, including preferences.
- **No rollback.** Links, categories, tags and domain rules saved before the cancel stay. Running the import again is safe, because duplicates are skipped and counted as "Already existed".
- **Escape and backdrop clicks stay ignored while running**, as in SPEC 04. Cancel is only the explicit button.
- The `beforeunload` warning stays active until the stop has actually finished.
- **Cancelled summary.** The modal moves to a new `cancelled` state:
  - heading `Import cancelled`;
  - the same final counters as SPEC 04, plus a **Not processed** counter;
  - the failed-links list and "Copy failed URLs", unchanged from SPEC 04;
  - a **Copy unprocessed URLs** button (secondary style) that copies the never-processed URLs, one per line, and shows a "Copied" toast. It is hidden when that list is empty. Unprocessed URLs are counted and copyable, but not listed;
  - for a cancelled v2 restore: the "Also created …" line for what was created, plus the note `Remaining steps were skipped.`;
  - a "Done" primary button that closes the modal.
- **Inputs are kept after a cancel.** The URLs textarea, JSON textarea and selected file are not cleared, so the user can re-run the same import to continue.
- `importLinks`'s trailing optional parameters move into one options object: `{ onProgress, fetchMeta, signal }`.
- Tests for the services, the hook, and the modal.

**Out of scope (for future specs):**

- Aborting the in-flight row: interrupting a running `fetchLinkMeta` server action or a half-done insert.
- Rolling back links or other data created before the cancel.
- A confirmation step before cancelling.
- Escape as a cancel shortcut.
- Closing the modal and letting the import run in the background.
- Pause/resume, or an automatic "resume from here" action.
- Listing unprocessed URLs inside the modal.
- "Retry failed" (still deferred from SPEC 04).

## Data model

No new persisted data. In-memory types only:

```ts
// lib/services/links.ts
export type ImportLinksOptions = {
  onProgress?: (done: number, total: number, outcome: ImportRowOutcome) => void
  fetchMeta?: ImportMetaFetcher
  /** Checked before each row. Once aborted, no new row starts. */
  signal?: AbortSignal
}

export async function importLinks(
  inputs: ImportLinkInput[],
  defaultCategoryId: string | null,
  dek: CryptoKey,
  options?: ImportLinksOptions,   // replaces the positional onProgress, fetchMeta
): Promise<ImportResult>

export type ImportResult = {
  imported: number
  skipped: number
  duplicates: number
  metaMissing?: number
  failures: ImportFailure[]
  cancelled: boolean        // new: true when the signal stopped the loop early
  notProcessed: string[]    // new: URLs of rows never started, in input order; [] when not cancelled
}
```

```ts
// lib/services/importExport/importVault.ts
export type VaultImportOptions = {
  // ...existing defaultCategoryId, applyPreferences, onProgress
  signal?: AbortSignal      // new: checked before each phase, and passed through to importLinks
}
// VaultImportResult inherits cancelled/notProcessed from ImportResult. If the cancel lands
// before the links phase, notProcessed lists every link URL in the export.
```

```ts
// lib/hooks/importExport/useLinkImport.ts
type ImportModalState = 'closed' | 'running' | 'finished' | 'cancelled' | 'error'  // + 'cancelled'
// new hook state and actions:
//   cancelling: boolean       — true from the click until the import returns
//   notProcessed: string[]    — from the result, for the copy button and counter
//   cancelImport(): void      — aborts the run's AbortController; no-op unless running
```

## Implementation plan

1. **Service: options object.** In `lib/services/links.ts`, add `ImportLinksOptions` and change `importLinks` to take `options?` as its fourth parameter. Update the two callers (`useLinkImport`, `importVaultExport`) and the existing calls in `tests/services/links.test.ts`. Behavior does not change. All tests stay green.
2. **Service: cancel.**
   - At the top of each loop iteration in `importLinks`, if `options.signal?.aborted`, stop the loop.
   - Return `cancelled: true` and `notProcessed` = the trimmed URLs of the remaining inputs.
   - When not cancelled, return `cancelled: false, notProcessed: []`.
   - The no-user early return also returns `cancelled: false, notProcessed: []`.
3. **Service tests** in `tests/services/links.test.ts`:
   - a signal aborted before the call imports nothing, and `notProcessed` holds every URL;
   - aborting inside `onProgress` after row 2 of 5 means rows 1–2 are processed, `notProcessed` holds rows 3–5, and `cancelled` is `true`;
   - a row that is mid-fetch when the abort fires still completes and is counted;
   - no signal gives `cancelled: false` and `notProcessed: []`.
4. **Vault service.** In `importVaultExport`:
   - add `signal` to the options;
   - check it before each phase, and pass it into `importLinks`;
   - if aborted before links, skip the remaining phases and return `cancelled: true` with every link URL in `notProcessed`;
   - preferences are never applied after a cancel.

   Add tests in `tests/services/importExport/importVault.test.ts`:
   - abort during categories means no links are inserted and no preferences are applied;
   - abort during links means preferences are skipped and the created counts are preserved.
5. **Hook.** In `useLinkImport`:
   - create an `AbortController` (in a ref) each time `openModal` runs, and pass its signal into `importLinks` / `importVaultExport`;
   - `cancelImport()` aborts it and sets `cancelling` to `true`, but only while the state is `running`;
   - when the result comes back with `cancelled`, set the state to `cancelled`, store `notProcessed`, and **do not** clear the URLs, JSON or file inputs; otherwise keep the current behavior;
   - reset `cancelling` in `finally`;
   - `closeImportModal()` also closes from `cancelled`.
6. **Hook tests** in `tests/hooks/importExport/useLinkImport.test.ts`:
   - `cancelImport` aborts the signal handed to the mocked `importLinks`;
   - a cancelled result moves the state `running → cancelled` and keeps `urlsText`;
   - `cancelling` is `true` between the click and resolution;
   - `cancelImport` is a no-op when not running;
   - the v2 path passes the signal to `importVaultExport`.
7. **Modal.** In `ImportProgressModal.tsx`:
   - add `cancelling`, `notProcessed` and `onCancel` props;
   - running view: a full-width secondary Cancel button below the counters, which becomes `Stopping…` and disabled while `cancelling`;
   - cancelled view: `Import cancelled` heading, a status line `N links processed · M not processed`, the **Not processed** counter, the failed list, `Remaining steps were skipped.` for v2, and buttons for Copy failed URLs, Copy unprocessed URLs, and Done;
   - the buttons must fit 375px width with no horizontal scroll (the copy buttons can wrap above a full-width Done);
   - focus moves to Done on `cancelled`, as it does on `finished`;
   - follow the existing modal's design tokens, and dark mode.
8. **Wire up.** In `ImportExportClient.tsx`, pass `cancelling`, `notProcessed` and `cancelImport` to the modal.
9. **Component tests.** In `tests/components/ImportProgressModal.test.tsx`:
   - Cancel is visible while running (including "Preparing…") and calls `onCancel`;
   - while `cancelling`, it reads `Stopping…` and is disabled;
   - Escape still does not close the modal while running;
   - the cancelled view shows the heading, the Not processed counter, and "Copy unprocessed URLs" writing the newline-joined URLs;
   - "Copy unprocessed URLs" is hidden when `notProcessed` is empty;
   - a v2 cancelled view shows "Remaining steps were skipped.".
10. **Docs.** Update CLAUDE.md feature #12 (Import / Export) with one sentence: a running import can be cancelled from the progress modal; it stops after the current link, keeps what was saved, and the summary counts unprocessed links with a "Copy unprocessed URLs" button.

## Acceptance criteria

- [ ] While any import is running, including during "Preparing…" and every v2 phase, the modal shows a Cancel button.
- [ ] Clicking Cancel once, with no confirmation, changes it to a disabled `Stopping…`.
- [ ] Importing 10 pasted URLs with auto-fetch ON and cancelling after the 3rd starts ends with 3 or 4 processed links. Those links are in the vault with tags and metadata intact, and no partially saved link exists.
- [ ] The cancelled summary shows `Import cancelled`, the counters, and `Not processed` equal to 10 − processed.
- [ ] "Copy unprocessed URLs" copies exactly the not-processed URLs, one per line. It is not shown after an import that finished normally.
- [ ] After a cancel, the URLs textarea still holds the original input. Re-running the import counts the earlier links as "Already existed" and imports the rest.
- [ ] While running, Escape and backdrop clicks don't close the modal.
- [ ] Cancelling a v2 "Everything" restore during the categories phase inserts zero links and applies no appearance preferences. The summary shows "Remaining steps were skipped.".
- [ ] Cancelling a v2 restore during the links phase keeps the created categories, tags and domain rules, and does not apply preferences.
- [ ] Refreshing during `Stopping…` still shows the leave-page prompt. After the cancelled summary appears, a refresh shows no prompt.
- [ ] The cancelled view renders correctly in light and dark mode, and as a bottom sheet at 375px width with no horizontal scroll.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** Stop after the current row. Every row is all-or-nothing, so tags and metadata never end up half-written.
- **No:** Immediate abort. `fetchLinkMeta` is a server action that keeps running anyway, and abandoning a row mid-way can leave a link without its tags.
- **Yes:** Keep what was saved, with no rollback. Duplicate detection already makes re-running safe, while a rollback is extra code that can itself fail partway.
- **Yes:** One click, no confirmation. Cancelling loses nothing, so a confirmation step would only be friction.
- **Yes:** "Not processed" counter plus "Copy unprocessed URLs", so the user can continue from where they stopped.
- **No:** Listing the unprocessed URLs in the modal. A count plus copy is enough, and the list could be thousands long.
- **Yes:** Cancel is available in every v2 phase, checked at phase and row checkpoints. Parallel phases (categories, domains) finish first, because their `Promise.all` can't stop cleanly mid-way.
- **Yes:** Preferences are skipped after a cancel. Appearance changes are the most visible side effect, and a cancelled restore shouldn't apply them.
- **Yes:** `importLinks` takes an options object `{ onProgress, fetchMeta, signal }`. It matches `importVaultExport`'s options and keeps SPEC 04's decision to avoid a sixth positional parameter. The cost is updating the existing callers and tests once.
- **Yes:** A standard `AbortSignal` rather than a custom callback. It is the platform primitive, and easy to create and assert in tests.
- **No:** Escape as Cancel. A stray key shouldn't stop a long import. Escape and the backdrop stay ignored while running.
- **Yes:** Inputs are not cleared after a cancel, so re-running continues the job. Clearing them would throw away the user's remaining work.

## Risks

| Risk | Mitigation |
| --- | --- |
| `Stopping…` lasts several seconds while the current row's fetch finishes (up to ~5s, more for YouTube) | The disabled `Stopping…` label makes the wait visible. `fetchLinkMeta`'s 5s timeouts bound it. |
| A v2 cancel during a large parallel categories/domains phase waits for the whole phase | These phases are short (tens of rows). The check runs right after the phase. |
| Changing `importLinks`'s signature breaks a caller that was missed | Only two callers exist (`useLinkImport`, `importVaultExport`). TypeScript flags any positional call, and the service tests cover the new shape. |
| The user re-runs a large import after a cancel, and every earlier row costs a duplicate lookup | Duplicate checks happen before any fetch, so they are cheap. "Copy unprocessed URLs" avoids the re-run entirely. |

## What is **not** in this spec

- Aborting the in-flight row.
- Rollback of data created before the cancel.
- A confirm step or an Escape shortcut.
- Background imports or pause/resume.
- Listing unprocessed URLs.
- "Retry failed".

Each one of those, if it lands, goes in its own spec.
