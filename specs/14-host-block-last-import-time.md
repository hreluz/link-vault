# SPEC 14 — Show the last successful import time while an import runs

> **Status:** Approved
> **Depends on:** SPEC 04, SPEC 07
> **Date:** 2026-10-23
> **Objective:** While an import runs, the progress modal shows when the import last saved a link, as a clock time plus a live relative time — under the status line normally, and inside the host-block notice while paused.

## Why this spec exists

When a site blocks the import (SPEC 07), the user can keep choosing "Wait and retry", and the prompt comes back with `Still blocked (attempt N)`. The notice says nothing about how long the import has been stuck. The user wants to see when the last link was actually saved, so they can judge whether retrying again is worth it or whether it is time to skip the host or leave.

**Amendment (2026-10-23):** the first implementation showed the line only inside the host-block notice. The user asked for it to always be visible while an import runs, so a slow import can be judged before it ever trips the breaker.

## Scope

**In:**

- **The line:**
  - when at least one link was saved in this import: `Last link imported at 14:32:05 (3 min ago).`;
  - when none was saved yet: `No links imported yet in this run.`
- **Where it shows, for the whole time the modal is in the `running` state:**
  - **no host block:** a muted line (`text-xs text-surface-400`, like the throttle countdown) directly under the status line, above the throttle countdown / fetching indicator slot;
  - **host block:** only inside the amber notice (`HostBlockNotice`), after the reason line and the `Still blocked (attempt N).` line. The muted line is hidden then, so the text never appears twice.
- **Every import type:** pasted URLs, JSON, CSV, and v2 restores, with auto-fetch ON or OFF. During a v2 restore's pre-link phases (categories, domains, tags) it reads `No links imported yet in this run.`
- **What counts:** every row with outcome `status: 'imported'`, with or without metadata. Duplicates, failures and generic-skipped rows don't move the time. It is the same event that increments the "Imported" counter.
- **Any host.** The time is the last saved link across the whole import, not only the blocked host.
- **Clock part:** the browser's local time with hours, minutes and seconds (`toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })`).
- **Relative part,** ticking every second while the notice is shown (with or without the retry countdown running):
  - under 5 s: `just now`;
  - under 1 min: `42 s ago`;
  - under 1 h: `3 min ago`;
  - 1 h or more: `1 h 5 min ago` (`1 h ago` when minutes are 0).
- **Lifetime:** in memory only. Reset to "none" when an import starts. Not shown once the import ends (finished, cancelled or error views).
- Tests for the hook, the formatter and the modal, plus a CLAUDE.md note in feature #12.

**Out of scope (for future specs):**

- Last successful fetch per host (as opposed to last saved link overall).
- Showing the time in the done/cancelled summary.
- Naming the last saved link (host or URL) next to the time.
- Remembering the time across imports or page loads.
- Any change to the block detection, retry wait, or the three buttons.

## Data model

No persisted data. In-memory only:

```ts
// lib/hooks/importExport/useLinkImport.ts
// New state, returned from the hook:
lastImportedAt: number | null   // Date.now() of the last 'imported' outcome in this run; null before the first one
```

```ts
// app/dashboard/config/import-export/ImportProgressModal.tsx
/** 'just now' | '42 s ago' | '3 min ago' | '1 h 5 min ago' | '1 h ago' */
export function formatTimeAgo(at: number, now: number): string

/** 'Last link imported at <clock> (<ago>).' | 'No links imported yet in this run.' */
function lastImportedText(at: number | null, now: number): string

// New prop on ImportProgressModal and HostBlockNotice:
lastImportedAt: number | null

// New component for the running view, ticking with useNow(true):
function LastImportedLine({ at }: { at: number | null }): JSX.Element
```

`ImportStats`, `ImportRowOutcome`, `HostBlockInfo` and `HostBlockState` do not change.

## Implementation plan

1. **Hook state.** In `lib/hooks/importExport/useLinkImport.ts`:
   - add `lastImportedAt` state (`null`), returned from the hook;
   - in `handleProgress`, when `outcome?.status === 'imported'`, set it to `Date.now()`;
   - reset it to `null` where `setImportStats(EMPTY_STATS)` runs at import start.

   Tests in `tests/hooks/importExport/useLinkImport.test.ts`, with a mocked `importLinks` and fake timers:
   - it is `null` before any outcome;
   - an `imported` outcome (with `metaMissing: true` too) sets it to the current fake time;
   - `duplicate`, `failed` and `skipped_generic` outcomes leave it unchanged;
   - starting a second import resets it to `null`.
2. **Formatter.** Add `formatTimeAgo(at, now)` in `ImportProgressModal.tsx`, next to `formatWait`/`formatCountdown`. Tests in `tests/components/ImportProgressModal.test.tsx`: 2 s → `just now`, 42 s → `42 s ago`, 3 min 10 s → `3 min ago`, 65 min → `1 h 5 min ago`, 60 min → `1 h ago`.
3. **Notice.** In `HostBlockNotice`:
   - accept `lastImportedAt`;
   - make `useNow` tick for the whole time the notice is mounted (not only during the countdown);
   - render the new line inside the amber box, after the attempt line, with `tabular-nums` so the ticking text doesn't jitter.

   Thread `lastImportedAt` through `ImportProgressModal`'s props and wire it in `ImportExportClient.tsx`.

   Tests in `tests/components/ImportProgressModal.test.tsx`:
   - with `lastImportedAt` set, the notice shows `Last link imported at <clock> (3 min ago).`;
   - advancing fake time by 1 min updates the relative part to `4 min ago`;
   - with `lastImportedAt = null`, it shows `No links imported yet in this run.`;
   - the line is not rendered when the import is running without a host block.
4. **Docs.** In CLAUDE.md feature #12, add one sentence after the host-block description: the paused notice also shows when the import last saved a link (clock time plus a live relative time, `lastImportedAt` in `useLinkImport`), or `No links imported yet in this run.`
5. **Always visible while running (amendment).** In `ImportProgressModal.tsx`:
   - extract the line's text into `lastImportedText(at, now)`, used by both `HostBlockNotice` and the new `LastImportedLine`;
   - render `<LastImportedLine at={lastImportedAt} />` when `running && !hostBlock`, right after the status line (and the vault phase sub-line), before the throttle countdown / fetching indicator.

   Tests in `tests/components/ImportProgressModal.test.tsx`:
   - running with no block shows the muted line with the clock and `3 min ago`, and it ticks to `4 min ago`;
   - running with `lastImportedAt = null` shows `No links imported yet in this run.`;
   - with a host block, the text appears exactly once (inside the notice);
   - the finished and cancelled views don't show it.

   Update the CLAUDE.md sentence from step 4: the line shows for the whole running import, under the status line, and moves into the paused notice during a host block.

## Acceptance criteria

- [ ] While any import runs without a block (auto-fetch ON or OFF, v2 restore included), a muted line under the status line shows `Last link imported at HH:MM:SS (… ago).`, or `No links imported yet in this run.` before the first save.
- [ ] When a host block pauses an import after some links were saved, the notice shows `Last link imported at HH:MM:SS (… ago).` with the time of the last saved link, and the muted line is hidden.
- [ ] The relative part updates every second, in the running view and in the notice, both before and during the retry countdown.
- [ ] A row saved without metadata moves the time; a duplicate, a failed row, or a generic-skipped row does not.
- [ ] When the block hits before any link was saved, the notice shows `No links imported yet in this run.`
- [ ] After "Wait and retry" fails and the prompt returns with `Still blocked (attempt 2)`, the time still shows the last saved link (unchanged if nothing was saved in between).
- [ ] A new import starts with no last-imported time; the previous run's time never appears.
- [ ] The finished, cancelled and error views look exactly as before (no line).
- [ ] The running view and the notice render correctly in light and dark mode, and at 375 px with no horizontal scroll.
- [ ] `npm test` passes, including the new tests.

## Decisions

- **Yes:** Last saved link across the whole import. The user wants to know how long the import has made no progress, not how a single host is doing.
- **No:** Last good fetch per host. More precise for diagnosing a block, but not what was asked; deferred.
- **Yes:** Any `imported` outcome counts, with or without metadata. It matches the "Imported" counter, so the line and the counter never disagree.
- **No (amended):** Show it only in the host-block notice. That was the first version; the user wanted it always visible, to judge a slow import before it trips the breaker.
- **Yes:** Show it for the whole running import, under the status line, for every import type. One rule, no special cases for auto-fetch OFF or v2.
- **Yes:** During a block, show it only inside the notice. The notice already sits where the eye goes; duplicating the line would add noise.
- **No:** Keep it in the done/cancelled summary. The summary is about results, and the import is no longer stuck.
- **Yes:** Clock time plus a live relative time. The clock is exact; the relative part answers "how long" at a glance after several retries.
- **Yes:** Time only, no host or URL. Keeps the line short on a 375 px screen.
- **Yes:** An explicit `No links imported yet in this run.` instead of hiding the line. Silence would be ambiguous.
- **Yes:** Store the timestamp in `useLinkImport` (set in `handleProgress`), not inside `importLinks` or `ImportStats`. The service stays timer-free, and `applyOutcome` stays pure with no clock dependency.
- **No:** Persisting it across imports. It describes one run; a new run starts fresh.

## Risks

| Risk | Mitigation |
| --- | --- |
| The modal re-renders every second for the whole import | Only the small `LastImportedLine` / notice components tick (`useNow` is local to them), like the throttle countdown and fetching indicator already do. |
| Locale clock format varies (12 h vs 24 h) | Intended: the time matches the user's own clock. Tests assert the clock part with the same `toLocaleTimeString` call instead of a literal. |
| A long pause (hours) makes the relative text long | The `1 h 5 min ago` format caps at two units. |

## What is **not** in this spec

- Per-host last successful fetch.
- The time in the done/cancelled summary.
- The host or URL of the last saved link.
- Persistence across imports or page loads.
- Changes to block detection or the prompt's buttons.

Each one of those, if it lands, goes in its own spec.
