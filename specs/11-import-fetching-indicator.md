# SPEC 11 — "Fetching" indicator while an import fetches metadata

> **Status:** Approved
> **Depends on:** SPEC 07, SPEC 09
> **Date:** 2026-10-18
> **Objective:** While an import fetches a link's metadata, show a spinner with `Fetching <host>…` under the progress modal's status line, which changes to `Still waiting on <host>…` once the fetch passes 10 s.

## Why this spec exists

SPEC 09 shows `Next <host> link in N s` while the import waits out the same-host gap. When the countdown ends, the line disappears and the fetch starts. That fetch can take several seconds: each request in `fetchLinkMeta` has a 5 s timeout, and YouTube makes more than one request. During the fetch nothing in the modal moves. The counters are frozen, there's no line, and the import looks stuck again, right after the countdown said it was about to continue.

The fetch happens inside `fetchRowMeta` (`lib/services/links.ts`), which the UI can't see today. The service must report it, just as it reports throttle waits.

## Scope

**In:**

- **The service reports fetches.** `importLinks` gets an optional `onFetching` callback.
  - It is called with `{ host, startedAt }` right before each `fetchMeta(url)` call. `host` is the host group, and `startedAt` is the epoch ms when the call started.
  - It is called with `null` when that call ends, whether it resolved, threw, or came back empty or rate-limited.
  - It is called again for every fetch attempt, so a "Wait and retry" re-fetch (SPEC 07) shows the indicator again.
  - It is never called for rows that skip the fetch: auto-fetch OFF, v2 restores, invalid URLs, duplicates, or a host whose metadata was skipped.
- **The hook holds the fetch.** `useLinkImport` keeps `fetching: { host: string; startedAt: number } | null`. It sets the value from the callback only when auto-fetch is ON, and clears it in the import's `finally` cleanup.
- **The modal shows the indicator.** `ImportProgressModal` gets a `fetching` prop.
  - While running with `fetching` set and no `hostBlock`, it renders a muted line right **under the status line**, in the same place as the SPEC 09 countdown: a small spinner followed by `Fetching <host>…`.
  - Once `now - startedAt >= SLOW_FETCH_HINT_MS` (10 s), the same line reads `Still waiting on <host>…` and the spinner stays. No extra line is added and the layout does not shift. The check ticks with the existing `useNow`, so the hint shows up within about 1 s of the threshold.
  - `<host>` is the host group (`youtube.com` for a `youtu.be` link), the same name the countdown and the host-block notice use.
  - The spinner is a small primary-colored ring that spins via `animate-spin`. Under `prefers-reduced-motion` it does not spin (`motion-reduce:animate-none`). It is `aria-hidden`.
- **The countdown and the indicator take turns in one slot.** For same-host rows the line goes countdown → fetching → countdown. The service never reports both at once: the throttle wait clears before the fetch starts. If both values were ever set, the countdown wins.
- **Hidden when:**
  - no fetch is in progress;
  - the import is paused on a host block;
  - the modal is not running (finished, cancelled or error);
  - the import is a v2 restore or has auto-fetch OFF.
- **Cancel during a fetch:** the indicator stays until the in-flight fetch returns, because the fetch itself can't be aborted. The Cancel button already reads `Stopping…`.
- The status line, progress bar, counters, ETA and the Cancel button behave exactly as before.
- Tests for the service callback, the hook state and the modal line.

**Out of scope (for future specs):**

- **Making the 10 s threshold an admin setting.** Planned as its own spec (SPEC 12): a new `app_settings` column with a 5–60 s range and no off switch, a field in `ImportFetchSettingsCard`, a migration, and validation that mirrors SPEC 08.
- An `aria-live` announcement of the indicator.
- Aborting an in-flight fetch on Cancel.
- Showing a per-row "Saving…" state, or any indicator for rows that don't fetch.
- Showing the full URL being fetched.
- Changing the ETA math.

## Data model

No persisted data. In-memory types only:

```ts
// lib/services/links.ts
/** An in-flight metadata fetch: `host` is the host group, `startedAt` the epoch ms it began. */
export type ImportFetching = { host: string; startedAt: number }

export type ImportLinksOptions = {
  // ...existing: onProgress, fetchMeta, signal, onHostBlocked, guardConfig, onThrottleWait
  /** Called with the fetch right before each fetchMeta call, and with null when it ends. */
  onFetching?: (fetching: ImportFetching | null) => void
}
```

```ts
// lib/services/importExport/fetchGuard.ts
/** After this long, the progress modal's fetching line reads "Still waiting on <host>…". */
export const SLOW_FETCH_HINT_MS = 10_000
```

```ts
// lib/hooks/importExport/useLinkImport.ts — new return value
fetching: ImportFetching | null
```

```ts
// app/dashboard/config/import-export/ImportProgressModal.tsx — new prop
fetching?: ImportFetching | null   // default null
```

## Implementation plan

1. **Constant.** Add `SLOW_FETCH_HINT_MS = 10_000` to `lib/services/importExport/fetchGuard.ts`, next to `THROTTLE_NOTICE_MIN_MS`.
2. **Service callback.** In `lib/services/links.ts`:
   - add `ImportFetching` and `onFetching` to `ImportLinksOptions`;
   - in `fetchRowMeta`, call `onFetching?.({ host: group, startedAt: Date.now() })` right before `fetchMeta(url)`;
   - call `onFetching?.(null)` in a `finally` around that call, so a throw also clears it.

   Tests in `tests/services/links.test.ts` (existing `settle`/`scriptedFetcher` helpers):
   - one YouTube row gives `{ host: 'youtube.com', startedAt }` then `null`, in that order, with the `fetchMeta` call in between;
   - a `youtu.be` row reports host `youtube.com`;
   - a throwing `fetchMeta` still reports `null`;
   - a blocked host with a 'retry' decision reports a second `{…}`/`null` pair;
   - no `fetchMeta` (auto-fetch OFF) never calls `onFetching`;
   - a duplicate or invalid URL row never calls it;
   - two same-host rows report the throttle wait's `null` before the second row's `onFetching({…})`.
3. **Hook state.** In `lib/hooks/importExport/useLinkImport.ts`:
   - add a `fetching` state;
   - pass `onFetching: setFetching` to `importLinks` only when auto-fetch is ON, the same way as `onThrottleWait`;
   - reset it to `null` in the `finally` block;
   - return `fetching`.

   Tests in `tests/hooks/importExport/useLinkImport.test.ts`:
   - a mocked `importLinks` that calls `onFetching({ host, startedAt })` exposes the value, and it is null after `onFetching(null)`;
   - it is null after the import finishes;
   - auto-fetch OFF passes no `onFetching`.

   Update the exact-options assertions as needed.
4. **Modal line.** In `app/dashboard/config/import-export/ImportProgressModal.tsx`:
   - add the `fetching` prop;
   - add a `FetchingIndicator` component that renders a spinner and `Fetching <host>…`, switching to `Still waiting on <host>…` once `useNow(true) - startedAt >= SLOW_FETCH_HINT_MS`;
   - use the countdown line's text style (`mt-0.5 break-words text-xs text-surface-400 dark:text-surface-500`);
   - make the spinner a `size-3` bordered ring in `border-primary-500` with a transparent top, plus `animate-spin motion-reduce:animate-none`, inline before the text and `aria-hidden`;
   - render it in the countdown's slot when `running && fetching && !hostBlock && !throttleWait`.

   Wire `fetching` in `ImportExportClient.tsx`.

   Tests in `tests/components/ImportProgressModal.test.tsx` (fake timers):
   - `fetching = { host: 'youtube.com', startedAt: now }` renders `Fetching youtube.com…`;
   - after advancing 10 000 ms it renders `Still waiting on youtube.com…`;
   - at 9 000 ms it still reads `Fetching…`;
   - it is hidden with `hostBlock` set;
   - it is hidden when the state is `finished`;
   - it is hidden with `fetching` null;
   - with both `throttleWait` and `fetching` set, only the countdown renders.
5. **Docs.** In CLAUDE.md feature #12, add one clause after the countdown sentence: while a link's metadata is being fetched, the same slot shows a spinner with `Fetching <host>…`, which becomes `Still waiting on <host>…` after 10 s (`SLOW_FETCH_HINT_MS`, reported via `importLinks`'s `onFetching` option, held as `fetching` in `useLinkImport`).

## Acceptance criteria

- [ ] With auto-fetch ON, importing 3 YouTube links shows `Fetching youtube.com…` with a spinner during each fetch, and the `Next youtube.com link in N s` countdown between fetches, in the same slot.
- [ ] Right after the countdown reaches `1 s`, the line switches to `Fetching youtube.com…` and is never empty while the fetch runs.
- [ ] Importing `https://youtu.be/a` shows `youtube.com` as the host.
- [ ] A fetch that takes longer than 10 s changes the line to `Still waiting on youtube.com…`, with the spinner still shown, and the modal's height does not change.
- [ ] A fetch under 10 s never shows `Still waiting…`.
- [ ] Imports with auto-fetch OFF and v2 restores never show the indicator.
- [ ] Duplicate and invalid-URL rows never show the indicator.
- [ ] After choosing "Wait 1 minute and retry" on a host block, the retried fetch shows `Fetching <host>…` again.
- [ ] While a host-block notice is shown, the indicator is not shown.
- [ ] The finished, cancelled and error views never show the indicator.
- [ ] With the OS set to reduce motion, the spinner doesn't spin and the text still shows.
- [ ] The line renders in light and dark mode, and fits at 375 px with no horizontal scroll.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** `Fetching <host>…`. It names what the import is doing and which site it is waiting on, and it matches the countdown's and host-block notice's host naming.
- **No:** The full URL. Long URLs are noisy on a 375 px sheet, and the host is what explains a slow wait.
- **No:** `Processing link N of M…`. The status line already says that.
- **Yes:** Only during the metadata fetch. That is the only slow step. Saves take milliseconds, so an indicator for them would just flicker.
- **Yes:** A small spinner. It reads universally as "working" and is static under reduced motion.
- **No:** A pulsing dot or text only. They are less obviously "in progress".
- **Yes:** A slow-fetch hint that changes the line's text in place to `Still waiting on <host>…`. No layout shift, and the spinner keeps saying it's alive.
- **No:** A second "taking longer than usual" line, or an elapsed-seconds counter. Both add noise for a rare case.
- **Yes:** The 10 s threshold is a fixed constant in this spec, and making it configurable is split into SPEC 12. The admin setting would add a migration, a DB column, the admin card and the server action, a fourth area on top of the service, hook and modal.
- **Agreed for SPEC 12:** a 5–60 s range with no off switch. Below 5 s most YouTube fetches would trip the hint, and the hint is harmless, so it needs no off switch.
- **Yes:** The service reports `{ host, startedAt }` / `null` and the modal works out "slow" itself. This is the same split as SPEC 09: the service has no UI timers.
- **Yes:** One slot shared with the countdown. They never overlap in time, so the line reads as a single state that keeps changing.
- **No:** An `aria-live` region. It would announce every row. The modal already sets `aria-busy` while running.
- **No:** Aborting the fetch on Cancel. `fetchMeta` is a server action with no abort path, so it is out of scope.

## Risks

| Risk | Mitigation |
| --- | --- |
| The line flickers on fast fetches (a cached or quick site) | Acceptable. Each fetch is a real network round trip, and the countdown/fetching swap happens in the same slot, so nothing else moves. |
| A stale `Fetching…` line remains after an error or cancel | The service reports `null` in a `finally` around every fetch, and the hook clears `fetching` in its `finally`. |
| The hint appears up to ~1 s late (`useNow` ticks every 1 s) | Acceptable for a 10 s threshold. The criteria only require that it never shows before 10 s. |
| Cancel looks ignored while a fetch is in flight | The button already reads `Stopping…`. The indicator honestly shows the fetch is still finishing. |

## What is **not** in this spec

- The admin setting for the slow-hint threshold (SPEC 12).
- `aria-live` announcements.
- Aborting an in-flight fetch.
- Indicators for rows that don't fetch.
- ETA changes.

Each one of those, if it lands, goes in its own spec.
