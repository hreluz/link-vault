# SPEC 09 — Countdown for the same-host gap during import

> **Status:** Approved
> **Depends on:** SPEC 07, SPEC 08
> **Date:** 2026-10-18
> **Objective:** While an import waits out the same-host gap before fetching the next link, show a ticking `Next <host> link in N s` line under the progress modal's status line.

## Why this spec exists

SPEC 07 throttles auto-fetch per host, and SPEC 08 lets the admin raise the gap to as much as 30 s. During that wait the modal shows no change: the counters freeze and nothing says why. With a long gap, a single-host import looks stuck. SPEC 07 listed "showing throttle waits in the modal" as out of scope, and this spec adds it.

The wait happens inside `importLinks` (`guard.waitTurn` in `lib/services/links.ts`), which the UI can't see today. The service must report it.

## Scope

**In:**

- **The service reports throttle waits.** `importLinks` gets an optional `onThrottleWait` callback.
  - It is called with `{ host, until }` right before the wait starts, where `until` is the epoch ms when the fetch may start. It is called only when the wait is **≥ 1000 ms**.
  - It is called with `null` when that wait ends, whether it ran out or was cut short by a cancel.
  - Waits under 1 s never call it.
- **The hook holds the wait.** `useLinkImport` keeps `throttleWait: { host: string; until: number } | null`. It sets the value from the callback, and clears it in the import's `finally` cleanup.
- **The modal shows the line.** `ImportProgressModal` gets a `throttleWait` prop.
  - While running with `throttleWait` set and no `hostBlock`, it renders a muted line right **under the status line**: `Next <host> link in N s`.
  - `<host>` is the host group (`youtube.com` for a `youtu.be` link), the same name the host-block notice uses.
  - `N` is the whole seconds left, rounded up, ticking every second with the existing `useNow`. It never shows less than `1 s` or more than the wait's starting value.
- **Hidden when:**
  - no wait ≥ 1 s is in progress;
  - the import is paused on a host block;
  - the modal is not running (finished, cancelled or error);
  - the import is a v2 restore or has auto-fetch OFF (no wait ever happens there).
- The status line, progress bar, counters, ETA and Cancel stay exactly as they are.
- Tests for the service callback, the hook state and the modal line.

**Out of scope (for future specs):**

- A countdown or progress indicator for the fetch itself (the time spent waiting on the remote site).
- Showing waits under 1 s.
- An `aria-live` announcement of the countdown.
- A "Skip wait" button.
- Changing the ETA math. It already includes the gap.

## Data model

No persisted data. In-memory types only:

```ts
// lib/services/links.ts
export type ThrottleWait = { host: string; until: number }   // host = host group; until = epoch ms

export type ImportLinksOptions = {
  // ...existing: onProgress, fetchMeta, signal, onHostBlocked, guardConfig
  /** Called with the wait before a same-host gap of >= 1 s starts, and with null when it ends. */
  onThrottleWait?: (wait: ThrottleWait | null) => void
}
```

```ts
// lib/services/importExport/fetchGuard.ts
/** Waits shorter than this are not reported to the UI. */
export const THROTTLE_NOTICE_MIN_MS = 1000
// waitTurn(group, signal, onWait?) — onWait(untilMs) is called before sleeping when the wait >= THROTTLE_NOTICE_MIN_MS
```

```ts
// lib/hooks/importExport/useLinkImport.ts — new return value
throttleWait: ThrottleWait | null
```

```ts
// app/dashboard/config/import-export/ImportProgressModal.tsx — new prop
throttleWait?: ThrottleWait | null   // default null
```

## Implementation plan

1. **Guard reports long waits.** In `lib/services/importExport/fetchGuard.ts`:
   - add `THROTTLE_NOTICE_MIN_MS`;
   - give `waitTurn` an optional `onWait(until: number)` parameter, called with `now() + wait` before sleeping, only when `wait >= THROTTLE_NOTICE_MIN_MS`.

   Tests in `tests/services/importExport/fetchGuard.test.ts`:
   - a 2000 ms wait calls `onWait` with `now + 2000`;
   - a 500 ms wait does not call it;
   - no previous fetch means no wait and no call.
2. **Service callback.** In `lib/services/links.ts`:
   - add `ThrottleWait` and `onThrottleWait` to `ImportLinksOptions`;
   - in the fetch loop, pass an `onWait` to `guard.waitTurn` that calls `onThrottleWait({ host: group, until })`;
   - after `waitTurn` returns, call `onThrottleWait(null)` if a wait was reported, before the abort check, so a cancel also clears it.

   Tests in `tests/services/links.test.ts` (fake timers, existing `settle`/`scriptedFetcher`):
   - two YouTube rows give one `{ host: 'youtube.com', until }` call with `until` ≥ 2000 ms after the first fetch, then `null`;
   - different hosts give no call;
   - a gap of 0 (`guardConfig`) gives no call;
   - a cancel during the wait still calls `null`.
3. **Hook state.** In `lib/hooks/importExport/useLinkImport.ts`:
   - add a `throttleWait` state;
   - pass `onThrottleWait: setThrottleWait` to `importLinks` only when auto-fetch is ON;
   - reset it to `null` in the `finally` block;
   - return `throttleWait`.

   Tests in `tests/hooks/importExport/useLinkImport.test.ts`:
   - a mocked `importLinks` that calls `onThrottleWait({ host, until })` exposes it, and the value is null after `onThrottleWait(null)`;
   - it is null after the import finishes;
   - auto-fetch OFF passes no `onThrottleWait`.

   Update the exact-options assertions as needed.
4. **Modal line.** In `app/dashboard/config/import-export/ImportProgressModal.tsx`:
   - add the `throttleWait` prop;
   - render `Next <host> link in N s` under the status line, using `text-xs tabular-nums` muted surface colors with dark pairs;
   - compute `N = clamp(ceil((until - now) / 1000), 1, initial)`, ticking via `useNow(active)`;
   - hide it while `hostBlock` is set or when not running.

   Wire `throttleWait` in `ImportExportClient.tsx`.

   Tests in `tests/components/ImportProgressModal.test.tsx`:
   - `until = now + 3000` renders `Next youtube.com link in 3 s`, and after advancing 1000 ms it renders `2 s`;
   - it never shows `0 s`;
   - it is hidden with `hostBlock` set;
   - it is hidden when the state is `finished`;
   - it is hidden with `throttleWait` null.
5. **Docs.** In CLAUDE.md feature #12, add one clause: while an import waits out the same-host gap (≥ 1 s), the progress modal shows `Next <host> link in N s` under its status line.

## Acceptance criteria

- [ ] With auto-fetch ON and the gap at 5 s, importing 3 YouTube links shows `Next youtube.com link in 5 s` counting down to `1 s` before the 2nd and 3rd fetch.
- [ ] Importing `https://youtu.be/a` then `https://www.youtube.com/watch?v=b` shows `youtube.com` as the host.
- [ ] With the default 2 s gap, the line appears (`2 s`, then `1 s`) between same-host fetches.
- [ ] Importing links from all-different hosts never shows the line.
- [ ] With the gap at 0, the line never appears.
- [ ] The line never shows `0 s`, and never shows a waiting time under 1 s.
- [ ] Clicking Cancel during a wait removes the line at once.
- [ ] While a host-block notice is shown, the line is not shown.
- [ ] The finished, cancelled and error views never show the line.
- [ ] Imports with auto-fetch OFF and v2 restores never show the line.
- [ ] The line renders in light and dark mode, and fits at 375 px with no horizontal scroll.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** A small line under the status line. It explains the pause without moving the progress bar, counters or Cancel.
- **No:** Replacing the status line. The ETA would flicker in and out every few seconds.
- **No:** Putting the line by the Cancel button. It is far from the status it explains.
- **Yes:** Whole seconds (`3 s`). The gap is at most 30 s (SPEC 08), so `m:ss` adds nothing.
- **No:** `m:ss` to match `Retrying in 0:59`. That countdown can reach 10 minutes; this one can't.
- **Yes:** Only waits ≥ 1 s. Shorter waits, usually most of the gap already used up by the previous row, would flash the line for a fraction of a second.
- **Yes:** Name the host group. Only same-host links wait, so the name explains why the import is waiting. It matches the host-block notice.
- **Yes:** The service reports the wait (`{ host, until }` / `null`) and the modal ticks the time itself. The service stays free of timers-for-UI, and one callback per wait is enough.
- **Yes:** `null` is reported even when a cancel cuts the wait, so a stale line can't outlive the wait.
- **No:** An `aria-live` region. A screen reader announcing every second would be noisy, and the status line already conveys progress.

## Risks

| Risk | Mitigation |
| --- | --- |
| The line flickers on mixed-host imports | It is shown only for waits ≥ 1 s, and only same-host consecutive rows wait. |
| The countdown drifts from the real wait (`useNow` ticks every 1 s) | `N` is recomputed from `until` on each tick and clamped to ≥ 1, so it never reads 0 while still waiting. |
| A stale line remains after a cancel or an error | The service reports `null` after every reported wait, and the hook clears it in `finally`. |

## What is **not** in this spec

- Fetch-time progress indicators.
- Showing sub-second waits.
- `aria-live` announcements.
- A "Skip wait" button.
- ETA changes.

Each one of those, if it lands, goes in its own spec.
