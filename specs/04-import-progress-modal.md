# SPEC 04 — Import progress modal

> **Status:** Approved
> **Depends on:** SPEC 03
> **Date:** 2026-10-15
> **Objective:** Show a locked modal during every import that reports live progress (processed, remaining, imported, already existed, failed, without metadata) and ends with a summary listing each failed URL and its reason.

## Why this spec exists

Today the only feedback while importing is the button label `Importing… links (x/y)`. Failures are only an aggregate `skipped` count shown after the fact, so the user can't tell which URLs failed or why. With SPEC 03's auto-fetch, an import can take minutes, and there's no clear view of what is happening or what remains.

## Scope

**In:**

- A new `ImportProgressModal` (`app/dashboard/config/import-export/ImportProgressModal.tsx`) that opens for **every** import: Paste URLs, Paste JSON, CSV/JSON upload, and full v2 "Everything" restores.
- While running, the modal shows:
  - a horizontal progress bar (`primary-*`) for the links phase;
  - the line `Processing x of y — z remaining`;
  - a counter grid: Imported, Already existed, Failed, and (only when auto-fetch is ON) Without metadata;
  - for v2 restores, the current phase label (categories → domain rules → tags → links → preferences) with that phase's `done/total`;
  - a "Preparing…" state with an indeterminate bar before the first progress event (e.g. while CSV categories are resolved).
- The modal is **locked while running**: no close button, Escape does nothing, backdrop clicks do nothing.
- When finished, the modal switches to a summary:
  - the same final counters, plus v2 extras (categories, tags, domain rules created; domain rules / preferences failed);
  - a scrollable list of failed links, each with its URL and a short reason: `Invalid URL` or `Couldn't save`;
  - a "Copy failed URLs" button (secondary style) that copies failed URLs, one per line, to the clipboard and shows a "Copied" toast; hidden when there are no failures;
  - a "Done" primary button that closes the modal.
- If the import throws mid-way, the modal shows an error state with the message, the counters reached so far, and "Done".
- Already-existed URLs are only counted, never listed.
- A `beforeunload` warning while an import is running.
- The modal replaces the inline result banner under the Import button and the success/warning/partial-failure toasts. Pre-flight validation errors (`Invalid JSON`, `JSON must be an array`, `No valid links found`, v2 validation error) stay as toasts, and the modal does not open for them.
- Visual design built with the `/frontend-design` skill, within the CLAUDE.md design system (`surface-*`/`primary-*`, `rounded-2xl` panel, `rounded-xl` buttons, dark mode, bottom-sheet on mobile like `BulkDeleteModal`).
- Tests for the service, the hook, and the modal.

**Out of scope (for future specs):**

- Cancelling an import mid-way.
- Closing the modal and letting the import continue in the background.
- A "Retry failed" action.
- Listing already-existed URLs.
- Listing links that imported without metadata.
- Per-row CSV line numbers in failure reasons.
- Persisting import history across page loads.

## Data model

No new persisted data. In-memory types only:

```ts
// lib/services/links.ts
export type ImportRowOutcome =
  | { url: string; status: 'imported'; metaMissing: boolean }
  | { url: string; status: 'duplicate' }
  | { url: string; status: 'failed'; reason: 'invalid_url' | 'save_error' }

export type ImportResult = {
  imported: number
  skipped: number          // unchanged meaning: failed rows
  duplicates: number
  metaMissing?: number
  failures: { url: string; reason: 'invalid_url' | 'save_error' }[]  // new
}

// onProgress gains an optional third argument; existing callers keep working.
onProgress?: (done: number, total: number, outcome: ImportRowOutcome) => void
```

```ts
// lib/services/importExport/importVault.ts
export type VaultImportProgress = {
  phase: VaultImportPhase; done: number; total: number
  outcome?: ImportRowOutcome   // set only for phase 'links'
}
// VaultImportResult carries `failures` through from importLinks.
```

```ts
// lib/hooks/importExport/useLinkImport.ts — new hook state
type ImportStats = {
  imported: number; duplicates: number; failed: number; metaMissing: number
  failures: { url: string; reason: 'invalid_url' | 'save_error' }[]
}
type ImportModalState = 'closed' | 'running' | 'finished' | 'error'
// plus: importStats, importModalState, importError: string | null, closeImportModal()
```

Reason labels: `invalid_url` → "Invalid URL", `save_error` → "Couldn't save".

## Implementation plan

1. **Service.** In `importLinks` (`lib/services/links.ts`), build an `ImportRowOutcome` in each branch (invalid, duplicate, insert error, success) and pass it as the third `onProgress` argument from the existing `finally`. Collect `failures` and return them in `ImportResult`. Existing return keys are unchanged.
2. **Service tests.** In `tests/services/links.test.ts`: outcomes per branch (invalid → `failed/invalid_url`, insert error → `failed/save_error`, duplicate, imported with `metaMissing`), and `failures` lists exactly the failed URLs. Existing tests stay green.
3. **Vault service.** In `importVaultExport`, forward the outcome on the `links` progress event and pass `failures` into `VaultImportResult`. Add one test in `tests/services/importExport/importVault.test.ts`.
4. **Hook.** In `useLinkImport`:
   - set `importModalState` to `running` and reset `importStats` only after pre-flight validation passes (just before the first write);
   - accumulate `importStats` from each outcome in the progress callback;
   - on success set `finished`, on throw set `error` with the message;
   - remove `successToast`/`partialFailureToast` and the post-import toasts; keep pre-flight error toasts;
   - `closeImportModal()` is a no-op while `running`;
   - add a `beforeunload` listener while `importing`.
5. **Hook tests.** In `tests/hooks/importExport/useLinkImport.test.ts`: stats accumulate from mocked outcomes; state goes `closed → running → finished`; a throw goes to `error`; `closeImportModal` is ignored while running; a pre-flight error (`Invalid JSON`) keeps the modal `closed`; no success toast fires; `beforeunload` is registered only while importing.
6. **Modal.** Create `ImportProgressModal.tsx` using `/frontend-design` for the visual pass. Use `useDialog` for dialog semantics and focus, with an `onClose` that ignores calls while running. Running view, summary view, error view, and "Copy failed URLs" via `navigator.clipboard.writeText`.
7. **Wire up.** In `ImportExportClient.tsx`, render the modal, remove the inline `lastResult` banner, and keep the button's `Importing…` label as-is.
8. **Component tests.** New `tests/components/ImportProgressModal.test.tsx`, plus updates to `tests/components/ImportExportClient.test.tsx` (move the SPEC 03 "3 without metadata" assertion to the modal):
   - running view shows `Processing 3 of 10 — 7 remaining` and the counters;
   - no close control while running; Escape does not close it;
   - summary lists failed URLs with reasons, "Copy failed URLs" writes them newline-joined;
   - "Copy failed URLs" is hidden with zero failures;
   - "Without metadata" counter only appears when auto-fetch is ON;
   - v2 summary shows created categories/tags/domain rules.
9. **Docs.** Update CLAUDE.md feature #12 (Import / Export) with one sentence: imports open a locked progress modal with live counters and a final summary of failed URLs; results are no longer shown as an inline banner or toasts.

## Acceptance criteria

- [ ] Importing 5 pasted URLs opens the modal immediately and shows `Processing x of 5 — y remaining` updating as each link is processed.
- [ ] While running, the modal has no close button, and Escape and backdrop clicks don't close it.
- [ ] Pasting `not a url` plus 2 valid URLs ends with Imported 2, Failed 1, and the list shows `not a url` with "Invalid URL".
- [ ] A URL already in the vault increments "Already existed" and does not appear in the failed list.
- [ ] With auto-fetch ON and `https://does-not-exist.invalid/x`, the summary shows "Without metadata 1". With auto-fetch OFF, the "Without metadata" counter isn't shown.
- [ ] "Copy failed URLs" copies the failed URLs one per line; it is not shown when nothing failed.
- [ ] Importing a v2 "Everything" export shows each phase label in turn, and the summary shows categories/tags/domain rules created.
- [ ] Pasting invalid JSON shows the `Invalid JSON` toast and the modal never opens.
- [ ] After an import, no success/warning toast appears and no inline result banner is rendered under the Import button.
- [ ] Refreshing the page during an import shows the browser's leave-page prompt; after it finishes, refresh shows no prompt.
- [ ] The modal renders correctly in light and dark mode and as a bottom sheet at 375px width.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** Counters plus a failed-URL list with reasons. The user asked for "the failing ones", and counts alone don't say which.
- **No:** Counters only. Doesn't tell the user what to fix.
- **Yes:** Per-row outcomes through a third `onProgress` argument. Backward compatible, and no sixth positional parameter on `importLinks`.
- **Yes:** Locked until done. Cancel and background imports need abort plumbing and were deferred in SPEC 03 too.
- **Yes:** `beforeunload` warning. A locked modal still can't stop a refresh, and a refresh cuts the import halfway.
- **Yes:** All imports, including v2 restores, so the feedback is consistent.
- **Yes:** The modal is the single result surface. Banner + toasts + modal would show the same numbers three times.
- **Yes:** Pre-flight validation errors stay as toasts and never open the modal, since nothing was written.
- **Yes:** Duplicates counted, not listed. They are not errors.
- **Yes:** "Copy failed URLs", ready to fix and paste into the Paste URLs tab.
- **No:** "Retry failed". Bigger scope, and failures are usually invalid URLs a retry won't fix.
- **Yes:** Progress bar + "x of y — z remaining" + counter grid. The final look comes from `/frontend-design`, constrained by the CLAUDE.md design system.
- **No:** Circular ring. Harder to read on a mobile bottom sheet.

## Risks

| Risk | Mitigation |
| --- | --- |
| A per-row state update re-renders the page for every link on large imports | One `setState` per row is fine at the sizes imports run sequentially at; stats live in one object updated with a functional setter. |
| A very long failed list makes the modal taller than the screen | The list is in a capped-height scroll area (`max-h` + `overflow-y-auto`). |
| `navigator.clipboard` is unavailable (non-secure context) | Catch the error and show an error toast; the list is still visible to copy by hand. |
| The modal is locked and the import hangs on a slow fetch | `fetchLinkMeta` has 5s timeouts, so each row ends; cancel is a future spec. |

## What is **not** in this spec

- Cancelling an import.
- Background imports with a closable modal.
- "Retry failed".
- Lists of already-existed or without-metadata links.
- CSV line numbers in failure reasons.
- Import history persistence.

Each one of those, if it lands, goes in its own spec.
