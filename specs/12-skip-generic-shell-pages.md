# SPEC 12 — Detect generic app-shell pages and skip them during import

> **Status:** Approved
> **Depends on:** SPEC 03, SPEC 04, SPEC 07
> **Date:** 2026-10-18
> **Objective:** `fetchLinkMeta` retries a no-og page once with a crawler user agent and flags a brand-only `<title>` page as `generic`; an import with auto-fetch ON then leaves those links out and lists them in the summary under "Skipped (generic page)".

## Why this spec exists

Some sites answer HTTP 200 with a JavaScript app shell instead of the page's metadata. `https://www.instagram.com/reel/DPwciDeD86l/` returns no og tags and `<title>Instagram</title>`. `fetchLinkMeta` currently returns `{ title: "Instagram" }`, which causes three problems:

- The link is saved with the useless title "Instagram".
- The import counts the row as fetched with metadata (`isMetaEmpty`, `lib/services/links.ts`).
- SPEC 07's empty-streak breaker resets, so the pause never triggers.

Measured behavior:

- Instagram returns the shell to every user agent tried, and to its `/embed/captioned/` page.
- TikTok returns a shell (`TikTok - Make Your Day`) to our user agent but full og tags to `facebookexternalhit/1.1`.
- X already works.

During an import, a link that only gets a shell should not be saved with a bad title or with nothing at all. It should be skipped and reported at the end, so the user can save it by hand.

## Scope

**In:**

- **Crawler retry (`fetchLinkMeta`).** In the non-YouTube branch, when the first response is OK `text/html` with no `og:title`, `og:description` or `og:image`, fetch the same URL once more with `User-Agent: facebookexternalhit/1.1` (same 5 s timeout).
  - If the retry is OK HTML with at least one og tag, its result is used.
  - Otherwise the retry is discarded and the first response's result is kept. Only `rateLimited` carries over from the retry.
  - There is no retry when the first response is not OK, is not HTML, throws, or answers 429.
  - A 429 on either request sets `rateLimited: true`.
- **Brand-title filter (`fetchLinkMeta`).** It applies only when the title came from `<title>`, never to `og:title`.
  - `brand` = the hostname's second-to-last label, lowercased (`www.instagram.com` → `instagram`, `vm.tiktok.com` → `tiktok`). Multi-part TLDs never match (`bbc.co.uk` → `co`), so the title is kept.
  - `normalize(s)` = lowercase, keeping only letters and digits (Unicode-aware).
  - **Exact brand:** `normalize(title) === brand` → the title becomes `null`, even when other og tags exist.
  - **Brand + tagline:** only when the page had no og tags at all. Split on the first separator, which is one of ` - `, ` – `, ` — `, ` | `, ` · ` (spaces on both sides) or `: `. If the part before it normalizes to `brand`, the title becomes `null`. Hyphenated words like `Instagram-clone tutorial` are not split.
- **`generic` flag (`fetchLinkMeta`).** The result has `generic: true` when:
  - the chosen response was OK HTML with no og tags, and
  - its `<title>` was dropped by the brand filter.

  All other fields are then `null`. A page with no og tags and no `<title>` at all is not generic: it stays a plain empty result, as today.
- **Add-link form.** No form code changes. A generic result has a null title, so the form no longer pre-fills "Instagram". The form ignores the flag.
- **Breaker (`fetchGuard.ts`).** In `record`, a generic result updates `lastFetchEnd` (the gap throttle still applies), leaves the empty streak unchanged, and returns `null`. A result with `rateLimited` still returns `'rate_limited'` first. Real empty results (timeouts, 403s, non-HTML) count toward the streak as before.
- **Import skip (`importLinks`).** When auto-fetch is ON and a row's fetch comes back `generic` without `rateLimited`:
  - **The row has no title of its own:** it is not inserted. It reports a new outcome, `{ url, status: 'skipped_generic' }`, and the import moves on to the next row.
  - **The row has a title from the file:** it is saved as today, with the file's values, and counted as "Without metadata".
  - A generic result on a "Wait and retry" re-fetch (SPEC 07) behaves the same way and clears the group's streak, like a successful retry.
  - Skipped rows are returned as `genericSkipped: string[]` (URLs in input order). The field is present only when `fetchMeta` is set. They are not counted in `skipped`, `failures` or `metaMissing`.
  - Rows from a host whose metadata was already skipped (SPEC 07 "import without metadata") never fetch, so they are never generic-skipped.
- **Progress modal (`ImportProgressModal`).**
  - **Live counter** `Skipped (generic page)`, shown when `run.withMetadata`, with an amber swatch (`bg-amber-400`).
  - **Progress bar:** a matching amber segment. Skipped rows count as processed in the bar, the status line and `remaining`.
  - **Summary:** once not running, if any rows were skipped, a section with heading `Skipped: the site returned a generic page with no metadata` lists each URL, in the same list style as "Failed links".
  - **Copy button:** `Copy skipped URLs` copies the list, one URL per line, like `Copy failed URLs`.
  - **Button layout:** when more than one copy button is shown, the copy buttons go on their own wrapping row above a full-width Done, as the cancelled view already does, so the buttons fit at 375 px.
  - The cancelled view shows the skipped counter, list and button too.
- **Hook (`useLinkImport`).** `ImportStats` gets `genericSkipped: string[]`, filled by `applyOutcome`.
- Tests for each changed layer, plus CLAUDE.md notes for features #1 and #12.

**Out of scope (for future specs):**

- Retrying skipped links at the end of the import.
- Saving skipped links without metadata as an option.
- Meta/Instagram oEmbed, new env vars, or an admin setting for the crawler UA.
- Per-site special cases or a list of known shell titles.
- A public-suffix-list dependency.
- Filtering generic `og:title` values.
- Retrying on 403 or other non-OK responses.
- Any change to v2 restores or imports with auto-fetch OFF (they never fetch).
- Showing generic-page info in the add-link form.

## Data model

No persisted data. In-memory types only:

```ts
// app/dashboard/link/actions.ts
export type LinkMeta = {
  // ...existing: title, description, image, duration, rateLimited?
  /** True when the page was an app shell: no og tags and a brand-only <title> (dropped). */
  generic?: boolean
}

// internal, not exported
type ExtractedMeta = { meta: LinkMeta; hasOg: boolean; titleFromOg: boolean }
const CRAWLER_USER_AGENT = 'facebookexternalhit/1.1'
```

```ts
// lib/services/links.ts
export type ImportMeta = { /* ...existing */ generic?: boolean }

export type ImportRowOutcome =
  | { url: string; status: 'imported'; metaMissing: boolean }
  | { url: string; status: 'duplicate' }
  | { url: string; status: 'failed'; reason: ImportFailureReason }
  | { url: string; status: 'skipped_generic' }

export type ImportResult = {
  // ...existing
  /** URLs left out because the site returned a generic page; only when fetchMeta is set. */
  genericSkipped?: string[]
}
```

```ts
// lib/hooks/importExport/useLinkImport.ts
export type ImportStats = { /* ...existing */ genericSkipped: string[] }
```

## Implementation plan

1. **`extractMeta` reports og presence.** In `app/dashboard/link/actions.ts`, change `extractMeta` to return `ExtractedMeta`:
   - `hasOg` = any of the three og values is non-null;
   - `titleFromOg` = `ogTitle != null`.

   Update its caller to use `.meta`. Existing tests stay green.
2. **Brand filter and `generic` flag.** Add the module-private helpers `brandLabel(url)`, `normalizeBrand(s)` and `isGenericTitle(title, brand, hasOg)`. Add a `finalizeMeta(extracted, url)` step that:
   - nulls the title when `!titleFromOg && isGenericTitle(...)`;
   - sets `generic: true` when, in addition, `!hasOg`.

   Add `generic?` to `LinkMeta`.

   Tests in `tests/actions/fetch-link-meta.test.ts`:
   - Instagram shell on `www.instagram.com` (retry mocked as a shell too) → all fields null, `generic: true`;
   - `My Blog Post - Example` with no og on `example.com` → title kept, `generic` unset;
   - `Example - Home` with no og on `example.com` → null, `generic: true`;
   - `Instagram-clone tutorial` with no og on `instagram.com` → kept;
   - `og:image` only with `<title>Instagram</title>` → title null, image kept, `generic` unset;
   - `og:image` only with `<title>Instagram | Reels</title>` → title kept;
   - `og:title="Instagram"` → kept;
   - `<title>BBC</title>` on `bbc.co.uk` → kept;
   - no og and no `<title>` → null meta, `generic` unset.
3. **Crawler retry.** Extract the page fetch into `fetchPage(url, userAgent)`, returning `{ extracted: ExtractedMeta | null; rateLimited: boolean }`. It returns `extracted: null` for not OK, not HTML, or a throw. In the non-YouTube branch:
   - fetch with the current UA;
   - when `extracted` is non-null and `!hasOg`, call `fetchPage(url, CRAWLER_USER_AGENT)`;
   - use the retry's result if it has og, otherwise keep the first;
   - OR the two `rateLimited` flags;
   - run `finalizeMeta` on the chosen result.

   Tests:
   - TikTok shell first, og tags on the retry → og values used, exactly 2 calls, and the second call's `User-Agent` is `facebookexternalhit/1.1`;
   - shell on both → null meta, `generic: true`, exactly 2 calls;
   - a page with og tags → exactly 1 call;
   - 429 first → `rateLimited: true`, exactly 1 call;
   - shell, then 429 on the retry → `rateLimited: true`;
   - a non-HTML 200 or a 404 → exactly 1 call.
4. **Breaker ignores generic results.** In `lib/services/importExport/fetchGuard.ts` `record`:
   - after setting `lastFetchEnd` and checking `rateLimited`, return `null` for `meta?.generic` without touching `emptyStreak`;
   - add `generic?` to `ImportMeta` in `lib/services/links.ts`.

   Tests in the existing fetchGuard test file:
   - 3 generic results in a row never trip;
   - 2 empty, 1 generic, 1 empty trips at the limit of 3 (the streak is unchanged by the generic result);
   - generic + `rateLimited` → `'rate_limited'`;
   - the gap throttle still waits after a generic fetch.
5. **Import skip.** In `lib/services/links.ts`:
   - add the `'skipped_generic'` outcome and `genericSkipped` to `ImportResult`;
   - in `fetchRowMeta`, after `guard.record`: when `meta?.generic && !meta.rateLimited`, call `resetGroup` if `attempt > 0`, then return `'generic'` when `isEmpty(input.title)`, or `{ input, metaMissing: true }` otherwise;
   - in `importLinks`, on `'generic'`, push the URL to `genericSkipped`, set the `skipped_generic` outcome and `continue` without inserting.

   Tests in `tests/services/links.test.ts` (existing `settle`/`scriptedFetcher` helpers):
   - a generic row without a title isn't inserted, reports `skipped_generic`, and lands in `genericSkipped`, not in `failures` or `metaMissing`;
   - the next row still imports;
   - a generic row whose file gave a title is inserted with that title and counted in `metaMissing`;
   - 3 generic rows from one host never call `onHostBlocked`;
   - a retry after a host block that returns generic skips the row;
   - with no `fetchMeta`, `genericSkipped` is absent.
6. **Hook stats.** In `lib/hooks/importExport/useLinkImport.ts`:
   - add `genericSkipped: []` to `EMPTY_STATS`;
   - handle `'skipped_generic'` in `applyOutcome` by appending the URL.

   Test in `tests/hooks/importExport/useLinkImport.test.ts`: a mocked `importLinks` that reports a `skipped_generic` outcome exposes the URL in `stats.genericSkipped`.
7. **Modal.** In `app/dashboard/config/import-export/ImportProgressModal.tsx`:
   - add `stats.genericSkipped.length` to `processed`;
   - add the amber bar segment and the `Skipped (generic page)` counter (only when `run.withMetadata`);
   - add the summary section with the heading and URL list;
   - add `Copy skipped URLs`;
   - use the wrapping-row layout for copy buttons whenever more than one is shown.

   Tests in `tests/components/ImportProgressModal.test.tsx`:
   - the counter shows the count while running;
   - the counter is hidden without `withMetadata`;
   - the finished view lists the URLs under the heading;
   - `Copy skipped URLs` writes them joined by newlines;
   - no section or button with an empty list;
   - the status line counts skipped rows as processed.
8. **Docs.** In CLAUDE.md:
   - **Feature #1:** add a clause after the `rateLimited` clause. When a non-YouTube page returns HTML with no og tags, `fetchLinkMeta` retries once with the `facebookexternalhit/1.1` UA. It drops a `<title>` that is only the site's brand and reports `generic: true`.
   - **Feature #12:** add a clause. With auto-fetch ON, a link whose fetch is `generic` and that has no title of its own is not imported. It is counted as "Skipped (generic page)" and listed in the summary with a "Copy skipped URLs" button. Generic results don't grow the empty streak.

## Acceptance criteria

- [ ] `fetchLinkMeta('https://www.instagram.com/reel/DPwciDeD86l/')` returns all-null fields with `generic: true` when Instagram serves its shell.
- [ ] Adding that Instagram URL in the add-link form leaves the Title field empty.
- [ ] A TikTok URL whose first response is the `TikTok - Make Your Day` shell gets the og title, description and image from the crawler response.
- [ ] A page with og tags triggers exactly one request.
- [ ] A page with no og tags and a real `<title>` (`My Blog Post - Example` on `example.com`) keeps that title.
- [ ] An `og:title` equal to the brand is never dropped.
- [ ] A 429 on the first request returns `rateLimited: true` with no retry.
- [ ] Importing 5 pasted Instagram shell URLs with auto-fetch ON saves none of them. It shows `Skipped (generic page): 5`, never pauses on a host block, and lists all 5 URLs in the summary.
- [ ] In a mixed import (Instagram shell, then example.com, then Instagram shell), the example.com link is imported and the two Instagram URLs are listed as skipped.
- [ ] A CSV row with its own title and an Instagram shell URL is imported with the file's title and counted as "Without metadata".
- [ ] `Copy skipped URLs` copies the skipped URLs, one per line.
- [ ] Cancelling mid-import still shows the skipped list next to the not-processed list, and all buttons fit at 375 px with no horizontal scroll.
- [ ] Imports with auto-fetch OFF and v2 restores never show the skipped counter.
- [ ] A host returning real empty results (403 / timeouts) still trips the pause after the empty limit.
- [ ] YouTube URLs make the same requests as before.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** Retry once with `facebookexternalhit/1.1`. It fixes TikTok, it is free, and it only costs a request on shell pages.
- **No:** Meta oEmbed. It needs an app token and env vars.
- **No:** Throttling the retry separately. The import's gap spaces out `fetchLinkMeta` calls, and the retry only happens on shell pages.
- **Yes:** Drop an exact-brand `<title>` even when other og tags exist. The brand + tagline rule only applies with no og tags at all, because it is fuzzier.
- **Yes:** Never filter `og:title`. The site chose it on purpose.
- **Yes:** The brand label is the second-to-last host label. There is no dependency, and multi-part TLDs fail safe.
- **Yes:** Separators need surrounding spaces, or are `: `. This avoids splitting hyphenated words.
- **Yes:** If the retry has no og tags, keep the first response.
- **Yes:** An explicit `generic` flag, not "any empty result". Only a confirmed shell is skipped. Timeouts and 403s keep SPEC 07's behavior.
- **Yes:** Skip generic links and don't save them. A link with no title is close to useless in the list, and the summary hands the URLs back to save by hand.
- **No:** Retrying skipped links at the end, or saving them bare. Instagram serves the shell every time, so a retry rarely helps, and saving bare is the problem this spec removes.
- **Yes:** Generic results don't grow the empty streak. The host is answering, so pausing for it would only add waits. The skip replaces the pause for shells.
- **Yes:** A row whose file supplies a title is still saved. It already has the important field, so dropping it would lose user data.
- **Yes:** A separate `skipped_generic` outcome, counter and list, not a new `failed` reason. It is a different situation from a save error, and the user asked for its own report.
- **Yes:** One spec for both the detection and the import skip. The flag has no use without the import handling.

## Risks

| Risk | Mitigation |
| --- | --- |
| A real page whose `<title>` is just the brand (e.g. a homepage titled "GitHub") is flagged generic and skipped in an import | Only pages with no og tags at all are flagged. Major sites set og tags on real pages. The URL is listed in the summary to save by hand. |
| A shell page now takes two requests, up to 10 s worst case | Only shell pages retry. SPEC 11's `Still waiting on <host>…` hint covers the wait. |
| Sites start blocking the `facebookexternalhit/1.1` UA | The retry then gives no og tags, and the first response's result is used. |
| Users lose track of skipped links | They are listed in the summary with a copy button, and also in the cancelled view. |
| Three copy buttons overflow a 375 px sheet | Copy buttons use the wrapping-row layout whenever more than one is shown. |

## What is **not** in this spec

- Retrying or bare-saving skipped links.
- Meta oEmbed, env vars, or admin settings for the crawler UA.
- Per-site special cases or a public-suffix list.
- Filtering `og:title`.
- Changes to v2 restores or imports with auto-fetch OFF.

Each one of those, if it lands, goes in its own spec.
