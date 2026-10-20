# SPEC 13 — Use the URL path as the title when a link has none

> **Status:** Approved
> **Depends on:** SPEC 03, SPEC 12
> **Date:** 2026-10-19
> **Objective:** When a link is saved with no title of its own and none fetched, both the add/edit form and non-v2 imports save the URL's decoded path (e.g. `reel/DPwciDeD86l`) as its title, or the hostname when there is no path.

## Why this spec exists

A link saved without a title shows an empty heading on `LinkCard`. Only the `site_name` line (`instagram.com ↗`) is left. There are two sources:

- **Imports.** `importLinks` (`lib/services/links.ts`) saves `title: input.title ?? null`. A pasted URL, or a CSV/JSON row with no title, imported with auto-fetch OFF (or whose fetch came back empty) is saved with `title: null`.
- **Add/edit form.** `resolvedTitle` (`lib/hooks/links/form/useLinkForm.ts`) already falls back to the URL without its scheme, cut to 30 characters (`www.instagram.com/reel/DPwciDe`). That repeats the domain the card already shows, and it cuts off the useful part.

The part after the domain identifies the link better. Both paths should use it, through one shared helper.

## Scope

**In:**

- **New helper `titleFromUrl(url)`** in `lib/utils/urlTitle.ts`:
  - Parse with `new URL(url.trim())`.
  - Take `pathname`, drop the query string and `#hash` (they are not part of `pathname`).
  - Trim leading and trailing `/` characters.
  - Decode with `decodeURIComponent`. If decoding throws (malformed `%`), keep the raw trimmed path.
  - Slashes inside the path, `-` and `_` stay as they are. There is no length cut. The card's `line-clamp-2` handles long titles.
  - If the result is empty (no path, or only `/`), return `hostname` (as-is, same value as `site_name`, e.g. `www.example.com`).
  - If the URL doesn't parse, return the input trimmed, with a leading `http://` or `https://` removed.
- **Form (`useLinkForm`).** `resolvedTitle` becomes `form.title.trim() || titleFromUrl(form.url)`. This replaces the 30-character slice. It covers the add form (auto-fetch toggle OFF, fetch empty or generic, or a title the user cleared) and the edit form (the user clears Title).
- **Import (`importLinks`).** New option `ImportLinksOptions.titleFromUrl?: boolean`. When it is `true` and the row's final title is empty (`isEmpty`: null, empty or whitespace), the saved `title` is `titleFromUrl(trimmedUrl)`.
  - "Final title" means after any metadata fetch. The order is: the file's title, then the fetched title, then the path fallback.
  - The fallback is applied at insert time only. It never changes `needsMetaFetch`, the generic-skip check (SPEC 12), or the `metaMissing` count. A row saved with only a path title still counts as "Without metadata".
  - A generic row with no title from the file is still skipped (SPEC 12). It is never saved with a path title.
- **Callers.**
  - `useLinkImport` passes `titleFromUrl: true` on its `importLinks` call (pasted URLs, pasted JSON, CSV and plain JSON upload).
  - `importVaultExport` (`lib/services/importExport/importVault.ts`) does not pass it. A v2 restore keeps a null title null.
- Tests for the helper, the form hook and the import service, plus CLAUDE.md notes for features #1 and #12.

**Out of scope (for future specs):**

- Backfilling existing links whose title is already `null`.
- A display-only fallback on `LinkCard` for old null-title links.
- Making the path readable (turning `-`/`_` into spaces, capitalizing, dropping ids).
- Filling titles during a v2 restore.
- Changing how `site_name` is derived or shown.
- Showing the derived title as a placeholder in the Title input.

## Data model

No persisted data or schema changes. The `title` column just gets a value where it used to get `null`.

```ts
// lib/utils/urlTitle.ts
/** The URL's decoded path without surrounding slashes, or its hostname when there is no path. */
export function titleFromUrl(url: string): string
```

```ts
// lib/services/links.ts
export type ImportLinksOptions = {
  // ...existing: onProgress, fetchMeta, signal, guardConfig, onHostBlocked, onThrottleWait, onFetching
  /** Save the URL's path (or hostname) as the title when a row ends up with none. Off for v2 restores. */
  titleFromUrl?: boolean
}
```

Examples:

| URL | Title |
| --- | --- |
| `https://www.instagram.com/reel/DPwciDeD86l/?utm_source=ig` | `reel/DPwciDeD86l` |
| `https://github.com/vercel/next.js` | `vercel/next.js` |
| `https://en.wikipedia.org/wiki/Caf%C3%A9#History` | `wiki/Café` |
| `https://example.com/a%ZZb` | `a%ZZb` (malformed, kept raw) |
| `https://example.com/` | `example.com` |
| `https://www.example.com` | `www.example.com` |
| `not a url` | `not a url` |

## Implementation plan

1. **Helper.** Create `lib/utils/urlTitle.ts` with `titleFromUrl` as described in Scope.

   Tests in `tests/utils/urlTitle.test.ts`, one per row of the examples table, plus:
   - `https://example.com///` → `example.com`;
   - `https://example.com/a/b/` → `a/b`;
   - a path longer than 30 characters is returned in full;
   - surrounding whitespace on the input is ignored.
2. **Form fallback.** In `lib/hooks/links/form/useLinkForm.ts`, set `resolvedTitle` to `form.title.trim() || titleFromUrl(form.url)`.

   Update `tests/hooks/links/form/useLinkForm.test.ts` (`resolvedTitle` block):
   - an explicit title still wins;
   - `https://example.com/path` with no title → `path` (was `example.com/path`);
   - replace the 30-character test: a long path is returned in full;
   - `https://example.com` with no title → `example.com`.
3. **Import option.** In `lib/services/links.ts`:
   - add `titleFromUrl?: boolean` to `ImportLinksOptions`;
   - in `importLinks`, build `content.title` as `titleFromUrl(trimmedUrl)` when the option is on and `isEmpty(input.title)`, otherwise `input.title ?? null`.

   Tests in `tests/services/links.test.ts`:
   - with the option on and auto-fetch OFF, a pasted `https://www.instagram.com/reel/DPwciDeD86l/` is saved with title `reel/DPwciDeD86l`;
   - with the option on, a row with its own title keeps it;
   - with the option on and auto-fetch ON, a fetched title wins over the path;
   - with the option on and an empty fetch, the row gets the path title and still counts in `metaMissing`;
   - with the option on, a generic row with no file title is still in `genericSkipped` and not inserted;
   - with the option off (default), a row with no title is saved with `title: null`.
4. **Wire the callers.** In `lib/hooks/importExport/useLinkImport.ts`, pass `titleFromUrl: true` on the `importLinks` call. Leave `importVault.ts` unchanged.

   Tests:
   - in `tests/hooks/importExport/useLinkImport.test.ts`, the mocked `importLinks` receives `titleFromUrl: true`;
   - in the existing `importVaultExport` test file, `importLinks` is called without `titleFromUrl` (or with it falsy).
5. **Docs.** In CLAUDE.md:
   - **Feature #1:** add a clause. A link saved with no title (typed or fetched) gets the URL's decoded path as its title, or the hostname when there is no path (`titleFromUrl`, `lib/utils/urlTitle.ts`).
   - **Feature #12:** add a clause. Non-v2 imports apply the same fallback to rows that end up with no title (`importLinks`'s `titleFromUrl` option). v2 restores don't.

## Acceptance criteria

- [ ] Adding `https://www.instagram.com/reel/DPwciDeD86l/?utm_source=ig` with auto-fetch OFF and an empty Title saves a link whose card heading reads `reel/DPwciDeD86l`.
- [ ] Adding `https://example.com/` with auto-fetch OFF and an empty Title saves the title `example.com`.
- [ ] A title typed in the add form is saved unchanged.
- [ ] Clearing Title in the edit form of `https://github.com/vercel/next.js` and saving sets the title to `vercel/next.js`.
- [ ] A path longer than 30 characters is saved in full.
- [ ] `https://en.wikipedia.org/wiki/Caf%C3%A9` gets the title `wiki/Café`.
- [ ] Pasting 3 URLs into Import with auto-fetch OFF saves all 3 with path titles, and no card has an empty heading.
- [ ] A CSV row with a title keeps the file's title.
- [ ] With auto-fetch ON, a link whose fetch returns an og title is saved with the og title, not the path.
- [ ] With auto-fetch ON, an Instagram shell URL with no file title is still listed as "Skipped (generic page)" and not saved.
- [ ] A v2 "Everything" restore of a link with a null title saves it with a null title.
- [ ] Existing links with a null title are unchanged.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** Path only, with the query string and `#hash` dropped. Tracking params like `utm_source` are noise in a title.
- **No:** Path plus query. It makes titles long and noisy.
- **Yes:** Decode percent-encoding, keeping the raw path if decoding throws. `wiki/Café` reads better than `wiki/Caf%C3%A9`, and a bad URL never breaks the save.
- **No:** Turning `-`/`_` into spaces or other prettifying. It guesses at intent. It can go in its own spec.
- **Yes:** No length cut. The card already clamps to 2 lines, and the old 30-character cut lost the useful end of the URL.
- **Yes:** Fall back to the hostname when there is no path. The heading is never empty, even if it repeats the `site_name` line.
- **Yes:** Save the fallback into the link, not display-only. Search and alphabetical sort then see it, and the edit form shows what is stored. This matches what the form already did.
- **No:** Backfilling existing null-title links. They stay as they are. A backfill would need to decrypt and re-encrypt every link client-side.
- **Yes:** One shared helper for the form and the import, so both produce the same title.
- **Yes:** An opt-in `importLinks` option instead of always on. A v2 restore must clone the source account exactly.
- **Yes:** Apply the fallback after the fetch and keep SPEC 12's generic skip. A path title is only a last resort, and it must not hide that a row had no metadata.

## Risks

| Risk | Mitigation |
| --- | --- |
| Some paths are opaque ids (`reel/DPwciDeD86l`, `watch`) and give a weak title | Still better than an empty heading. The user can edit the title, and auto-fetch remains the main source. |
| A YouTube `watch?v=…` link with no fetched title gets just `watch` | Only when auto-fetch is OFF or fails. YouTube titles normally come from oEmbed. |
| The edit form now saves `path` instead of `domain/path` when Title is cleared | Intended: the same rule everywhere. Covered by the updated `useLinkForm` tests. |

## What is **not** in this spec

- Backfilling or display-only fallbacks for existing null-title links.
- Prettifying the path into words.
- Filling titles during v2 restores.
- Changes to `site_name`.

Each one of those, if it lands, goes in its own spec.
