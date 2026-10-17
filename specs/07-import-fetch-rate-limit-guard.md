# SPEC 07 — Rate-limit guard for import auto-fetch

> **Status:** Approved
> **Depends on:** SPEC 03, SPEC 05
> **Date:** 2026-10-16
> **Objective:** Space out import auto-fetch requests per host, and when a host still looks blocked, pause the import so the user can wait 1 minute and retry, import that host's links without metadata, or leave.

## Why this spec exists

SPEC 03 fetches metadata one link at a time, but with no gap between requests. All requests come from the server's IP. An import of 500 YouTube or Instagram links fires 1,000+ requests at the same host in a few minutes, which is a classic trigger for a 429 or a login wall. SPEC 03 listed "a remote site rate-limits or blocks repeated requests" as a risk and only noted that a blocked fetch lowers metadata. Today a block goes unnoticed: every remaining row still hits the blocked host, waits up to 5s, and quietly lands "without metadata".

## Scope

**In:**

- **Host groups.** A fixed list maps related hostnames to one group, so they share one throttle and one breaker:
  - `youtube.com` ← `youtube.com`, `m.youtube.com`, `youtu.be`
  - `instagram.com` ← `instagram.com`
  - `tiktok.com` ← `tiktok.com`, `vm.tiktok.com`
  - `x.com` ← `x.com`, `twitter.com`, `mobile.twitter.com`
  - Every other host is its own group, keyed by its normalized hostname (lowercase, `www.` stripped).
- **Throttle, on every host.** A fetch starts at least **2 s** after the previous fetch to the **same group** ended. This applies to every group, social or not, because there is no way to know in advance which sites will block. Fetches to different groups never wait for each other, so an import of many different sites is not slowed down.
  - The gap only applies to rows that actually fetch. Invalid URLs, duplicates, rows that need no metadata, and skipped hosts never wait.
  - Cancel works during a throttle wait. The waiting row has not written anything yet, so it stops at once and counts as "Not processed".
- **Block detection,** per group:
  - `fetchLinkMeta` now reports `rateLimited: true` when the page response (or, for YouTube, the oEmbed response) is HTTP **429**.
  - A 429 trips the breaker at once.
  - An **empty** fetch counts toward an empty streak for its group. Empty means the fetch threw, or it returned null for all of title/description/image/duration. A 403 is treated as empty, because many sites always answer 403 to bots.
  - **3 empty fetches in a row** from the same group trip the breaker. A non-empty fetch resets the streak to 0.
  - The YouTube Data API's own errors (e.g. a `quotaExceeded` 403) never count. They only mean the duration stays null.
- **On a trip, the whole import pauses.** The row that tripped the breaker is not inserted yet. The progress modal's running view replaces its Cancel button with a notice and three buttons:
  - notice: `<host> seems to be limiting our requests.` plus a reason line, either `It answered "Too many requests".` or `The last 3 links from it came back empty.`; from the second prompt for the same group on, also `Still blocked (attempt N).`;
  - **Wait 1 minute and retry** (primary): starts a visible `Retrying in 0:59` countdown. At 0 it re-fetches the same row. While counting down, the other two buttons stay clickable and end the wait;
  - **Import without metadata** (secondary): the tripped row is inserted with what it had, and counted as "without metadata". Every later row of **that group** skips the fetch and also counts as "without metadata". Other groups keep fetching. If a different group trips later, the prompt appears again for that group;
  - **Leave and try later** (secondary): exactly SPEC 05's Cancel. Everything already saved is kept. The tripped row and every later row count as "Not processed", and the cancelled summary offers "Copy unprocessed URLs".
- **Retry result:** after the wait, the tripped row is fetched again. Any 429 or empty result on that retry shows the prompt again with attempt +1. A successful retry resets the group's attempt count and empty streak, and the import continues.
- The paused state is still "running": Escape and backdrop clicks stay ignored, and the `beforeunload` warning stays active. The counters freeze, and "Remaining" still includes the tripped row.
- **YouTube uses oEmbed only.** `fetchLinkMeta` no longer fetches the raw youtube.com page for a recognized YouTube video URL. Title and image come from oEmbed, and duration still comes from the Data API when `YOUTUBE_API_KEY` is set. The Data API call requests `part=contentDetails,snippet` (same 1-unit quota cost), so `description` comes from `snippet.description`. This also changes the Add Link form, since it is the same function.
- Tests for the guard module, `fetchLinkMeta`, `importLinks`, the hook and the modal.

**Out of scope (for future specs):**

- Continuing other hosts' rows while one host is paused (reordering the queue).
- Escalating waits (1 → 2 → 5 min) or an automatic fallback after N retries.
- A "Retry now" button that skips the countdown.
- A configurable gap, wait length or streak limit, or a per-user setting.
- Showing throttle waits ("Slowing down for youtube.com") in the modal.
- Batching YouTube Data API calls (up to 50 ids per request).
- Fetching from the browser instead of the server, or proxies and IP rotation.
- A guard for the Add Link form's single fetch (it makes one request per link).
- v2 restores, which never fetch (SPEC 03).

## Data model

No new persisted data. In-memory types and constants only:

```ts
// app/dashboard/link/actions.ts
export type LinkMeta = {
  title: string | null
  description: string | null
  image: string | null
  duration: string | null
  /** True when the page (or YouTube oEmbed) answered HTTP 429. */
  rateLimited?: boolean
}
```

```ts
// lib/services/links.ts
export type ImportMeta = { /* ...existing four fields */ rateLimited?: boolean }  // still structurally matches LinkMeta

export type HostBlockReason = 'rate_limited' | 'empty_responses'
export type HostBlockInfo = { host: string; reason: HostBlockReason; attempt: number }  // attempt starts at 1
export type HostBlockDecision = 'retry' | 'skip_host' | 'cancel'

export type ImportLinksOptions = {
  onProgress?: ...; fetchMeta?: ...; signal?: AbortSignal   // existing
  /** Awaited when a host group trips the breaker; the import is paused until it resolves.
   *  When absent, behaves as 'skip_host'. Only consulted when fetchMeta is set. */
  onHostBlocked?: (info: HostBlockInfo) => Promise<HostBlockDecision>
}
// ImportResult is unchanged: skipped-host rows count in metaMissing; a 'cancel' fills notProcessed like SPEC 05.
```

```ts
// lib/services/importExport/fetchGuard.ts  (new, no Supabase / Next deps)
export const FETCH_GAP_MS = 2000        // per group, every group
export const EMPTY_STREAK_LIMIT = 3
export function hostGroupOf(url: string): string | null       // 'youtube.com' for youtu.be, normalized hostname otherwise
export function createFetchGuard(deps?: { now?: () => number; sleep?: (ms: number, signal?: AbortSignal) => Promise<void> }): {
  waitTurn(group: string, signal?: AbortSignal): Promise<void>  // enforces the gap; rejects/returns early on abort
  record(group: string, meta: ImportMeta | null): HostBlockReason | null  // null = fine; updates streak + last-fetch time
  skip(group: string): void
  isSkipped(group: string): boolean
  resetGroup(group: string): void                               // after a successful retry
}
```

```ts
// lib/hooks/importExport/useLinkImport.ts
export const HOST_BLOCK_RETRY_MS = 60_000
// new hook state and actions:
//   hostBlock: (HostBlockInfo & { retryAt: number | null }) | null   — null when not paused; retryAt set during the countdown
//   waitAndRetry(): void      — sets retryAt = now + 60s; a timer resolves the pending decision with 'retry'
//   skipBlockedHost(): void   — clears any timer, resolves 'skip_host'
//   leaveImport(): void       — clears any timer, calls cancelImport(), resolves 'cancel'
```

## Implementation plan

1. **YouTube oEmbed-only.** In `app/dashboard/link/actions.ts`:
   - skip the raw page fetch when `extractYouTubeVideoId(url)` returns an id;
   - add `snippet` to the Data API `part` and read `snippet.description` into `description`;
   - set `rateLimited: true` when the page fetch or the oEmbed fetch has `status === 429`.

   Update `tests/actions/fetch-link-meta.test.ts`:
   - a YouTube URL makes no request to the video page;
   - the description comes from `snippet`;
   - a 429 page or oEmbed sets `rateLimited`, while a 403 does not;
   - the existing article tests stay green.
2. **Guard module.** Create `lib/services/importExport/fetchGuard.ts` with the host groups, constants and `createFetchGuard`. Reuse the hostname normalization rule from `normalizeDomain` (`lib/services/category-domains.ts`): lowercase and strip `www.`. Either export it, or apply the same two steps on `new URL(url).hostname`. Add `tests/services/importExport/fetchGuard.test.ts`, using an injected `now`/`sleep`:
   - `youtu.be` and `m.youtube.com` map to `youtube.com`, `twitter.com` maps to `x.com`, and `example.com` maps to itself;
   - a second fetch to the same group (social or not, e.g. `example.com`) waits until 2000 ms after the first one ends, while a fetch to a different group does not wait;
   - a 429 trips the breaker at once;
   - 2 empty fetches don't trip it, but the 3rd does; an empty, then a good, then an empty fetch doesn't trip it;
   - an abort during `waitTurn` returns early.
3. **Service wiring.** In `importLinks` (`lib/services/links.ts`), when `fetchMeta` is set, create one guard per call and change the fetch step (after the duplicate check) to:
   - work out the row's group; if the group is skipped, don't fetch, and count the row as metaMissing;
   - otherwise `await guard.waitTurn(group, signal)`; if the signal aborted during the wait, stop the loop and put this row in `notProcessed`;
   - fetch through `fillMissingMeta`, which must now also return the raw meta, or null on throw, for `guard.record`;
   - if `record` returns a reason, await `onHostBlocked({ host: group, reason, attempt })`:
     - `'retry'`: re-fetch the same row and loop. Any 429 or empty result shows the prompt again with attempt + 1, and a good result calls `resetGroup`;
     - `'skip_host'`: call `guard.skip(group)` and insert the row with what it had, as metaMissing;
     - `'cancel'`: stop and put this row and the rest in `notProcessed`.
   - Without `onHostBlocked`, a trip behaves as `'skip_host'`.

   Keep the "row in progress finishes completely" rule from SPEC 05: once a fetch result is accepted, the insert and tags always complete.
4. **Service tests** in `tests/services/links.test.ts`, with a stub fetcher, a stub `onHostBlocked` and fake timers:
   - a 429 on row 2 calls `onHostBlocked` once with `rate_limited`, attempt 1;
   - `'skip_host'` imports rows 2..n of that group without calling the fetcher, counts them as metaMissing, and still fetches other hosts;
   - `'retry'` re-fetches row 2; a second 429 gives attempt 2, and a success continues with no more prompts;
   - `'cancel'` gives `cancelled: true`, puts row 2 onward in `notProcessed`, and inserts nothing for row 2;
   - 3 empty YouTube results in a row trip `empty_responses`, while empties spread across different non-social hosts never trip;
   - two YouTube rows are fetched ≥2000 ms apart, two rows from the same blog host are also ≥2000 ms apart, and two different article hosts have no gap;
   - no `onHostBlocked` behaves as skip;
   - the existing SPEC 03, 05 and 06 tests pass unchanged.
5. **Hook.** In `lib/hooks/importExport/useLinkImport.ts`:
   - in the non-v2 branch (only when auto-fetch is ON), pass an `onHostBlocked` that sets `hostBlock` and returns a promise whose resolver is kept in a ref;
   - add `waitAndRetry`, `skipBlockedHost` and `leaveImport`, each of which clears `hostBlock` (except `waitAndRetry`, which sets `retryAt`) and resolves the pending decision;
   - `waitAndRetry` holds its 60 s `setTimeout` in a ref;
   - the timer is cleared on decision, unmount and modal close;
   - the v2 path is not touched.
6. **Hook tests** in `tests/hooks/importExport/useLinkImport.test.ts`, with a mocked `importLinks` that invokes `onHostBlocked`:
   - `hostBlock` is set while pending;
   - `waitAndRetry` sets `retryAt` and resolves `'retry'` only after 60 s of fake time;
   - `skipBlockedHost` during the countdown resolves `'skip_host'` at once and cancels the timer;
   - `leaveImport` aborts the signal and resolves `'cancel'`;
   - auto-fetch OFF passes no `onHostBlocked`.
7. **Modal.** In `app/dashboard/config/import-export/ImportProgressModal.tsx`, add the props `hostBlock`, `onBlockWait`, `onBlockSkip` and `onBlockLeave`:
   - while running with `hostBlock` set, render the notice in place of the Cancel button. Use the literal amber notice hue (a fixed semantic warning color, allowed by the design system) with a dark-mode pairing;
   - render the three buttons in the primary/secondary styles from CLAUDE.md;
   - during the countdown, the primary button shows `Retrying in m:ss` (from `retryAt`, ticking every second) and is disabled, while the other two stay enabled;
   - the layout fits 375 px with no horizontal scroll.

   Wire the new props in `ImportExportClient.tsx`.
8. **Component tests** in `tests/components/ImportProgressModal.test.tsx`:
   - the notice shows the host, the reason line, and `Still blocked (attempt 2)` when attempt is 2;
   - each button calls its handler;
   - the countdown text renders from `retryAt`;
   - Cancel is hidden while paused;
   - Escape still does nothing.
9. **Docs.** Add one sentence to CLAUDE.md feature #12 (Import / Export): import auto-fetch waits at least 2 s between requests to the same host (every host), and when a host looks blocked (429, or 3 empty fetches in a row) it pauses the import so the user can wait 1 minute and retry, import that host's links without metadata, or leave. In feature #1, note that YouTube metadata comes from oEmbed plus the Data API rather than the raw page.

## Acceptance criteria

- [ ] With auto-fetch ON, importing 5 YouTube URLs makes 0 requests to `youtube.com/watch` pages, and consecutive YouTube fetches start ≥2 s apart.
- [ ] With auto-fetch ON, importing 3 articles from the same blog fetches them ≥2 s apart.
- [ ] With auto-fetch ON, importing 5 URLs from 5 different sites adds no throttle delay.
- [ ] Adding a YouTube link in the Add Link form still fills title and thumbnail. It also fills duration and description when `YOUTUBE_API_KEY` is set.
- [ ] When the fetcher returns `rateLimited` for an Instagram row, the import pauses and the modal shows `instagram.com seems to be limiting our requests.` with the three options. No further rows are processed while it is shown.
- [ ] 3 Instagram rows in a row that come back empty (or 403) trip the same prompt with the "last 3 links came back empty" reason. 3 empty rows from 3 different non-social sites do not.
- [ ] "Wait 1 minute and retry" shows a countdown. After 60 s the same row is fetched again. If it is still blocked, the prompt returns with `Still blocked (attempt 2)`.
- [ ] Clicking "Import without metadata" during the countdown stops the countdown at once. The remaining Instagram rows are imported with no fetch and counted as "without metadata". YouTube rows in the same import still get metadata.
- [ ] "Leave and try later" ends with SPEC 05's cancelled summary. The tripped row and every later row are counted as "Not processed" and are copyable. Nothing is inserted for the tripped row.
- [ ] While the prompt is shown, Escape and backdrop clicks don't close the modal, and a refresh shows the leave-page prompt.
- [ ] Imports with auto-fetch OFF, and v2 restores, behave exactly as before: no throttle and no prompt.
- [ ] The paused view renders correctly in light and dark mode, and at 375 px with no horizontal scroll.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** Throttle plus breaker. The throttle prevents most blocks, and the breaker limits the damage when one happens anyway.
- **Yes:** A 2 s same-host gap for **every** host. There is no way to know in advance which sites will block, so no host is exempt. The gap is per group, so mixed-site imports are barely slowed down. 500 links from one host take about 17 min, which is acceptable for an opt-in job.
- **No:** Throttling only a list of social hosts. Any other site with many links in one import (a blog, Medium) could block us just as easily.
- **Yes:** Host groups (`youtu.be` → `youtube.com`, `twitter.com` → `x.com`). These hostnames hit the same infrastructure, so separate throttles would double the real request rate.
- **Yes:** 429 trips at once, while 403 and empty results only count toward a streak of 3. Many ordinary sites always 403 bots, so an instant trip on 403 would prompt dozens of times on a mixed import. Login walls (Instagram) return 200 with no og tags, so they are only visible as empties.
- **No:** A breaker on the YouTube Data API's errors. Its 403 means quota or key problems, not an IP block, and only the duration is lost.
- **Yes:** Pause the whole import while the prompt is shown. It keeps the loop sequential and predictable.
- **No:** Letting other hosts continue while one is paused. That means reordering rows and a much more complex loop.
- **Yes:** The user decides: wait 1 min and retry, skip the host's metadata, or leave. The user asked to be told what is happening and to stay in control, rather than having metadata silently skipped.
- **Yes:** "Import without metadata" applies to the blocked group only, so other hosts keep their metadata.
- **Yes:** Show the prompt again with an attempt count after a failed retry, using a fixed 1 min wait. **No:** escalating waits or an automatic fallback; the user stays in control each time.
- **Yes:** The other options stay clickable during the countdown, so the user never has to sit out a timer they no longer want.
- **Yes:** "Leave" reuses SPEC 05's Cancel. It gives one cancelled summary, "Copy unprocessed URLs", and a safe re-run, with no new end state.
- **Yes:** The tripped row is held, not inserted, until the decision. Retry can then fill it, and Leave lists it as unprocessed.
- **Yes:** YouTube oEmbed only, for the Add Link form too. oEmbed already overrode the raw page's title/image, so the raw fetch was wasted load on the most-blocked host.
- **Yes:** Add `snippet` to the Data API call. It recovers the description that the raw page used to provide, at no extra quota cost. Without an API key, YouTube links now have no description.
- **Yes:** The guard lives in a pure `fetchGuard.ts` with injected `now`/`sleep`, so the timing logic is testable without real waits and `importLinks` grows only a little.
- **Yes:** The countdown timer lives in the hook, and the modal only renders `retryAt`. The service only awaits a decision, so it knows nothing about timers or UI.

## Risks

| Risk | Mitigation |
| --- | --- |
| Instagram's login wall makes every Instagram fetch empty, so users always see the prompt for Instagram imports | It costs only 3 wasted fetches before the prompt. "Import without metadata" ends it for the rest of the import. |
| A retry still fails after 1 min, and the user waits repeatedly | Each prompt shows the attempt count, and the other two options are always available. |
| Removing the raw YouTube fetch loses the description when no API key is set | Accepted. Title, thumbnail and (with a key) duration and description are kept. |
| A throttle wait or a pending prompt makes Cancel seem slow | Cancel aborts the throttle wait at once. While paused, "Leave" is Cancel. |
| The timer leaks if the modal unmounts mid-countdown | The hook clears the timer on decision, unmount and close; covered by hook tests. |
| A legitimate host with many og-less pages trips the empty streak | It needs 3 in a row from the same host; one click on "Import without metadata" resolves it. |

## What is **not** in this spec

- Processing other hosts while one is paused.
- Escalating waits, auto-fallback, or "Retry now".
- Configurable gaps, waits or limits.
- Throttle status in the modal.
- Batched YouTube Data API calls.
- Browser-side fetching, proxies, or IP rotation.
- A guard for the Add Link form.
- v2 restores.

Each one of those, if it lands, goes in its own spec.
