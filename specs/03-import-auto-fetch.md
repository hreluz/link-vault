# SPEC 03 — Auto-fetch link metadata on import

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-10-15
> **Objective:** Add an opt-in auto-fetch ON/OFF switch to the Import section that fills in missing title, description, image and duration for each imported link using the same `fetchLinkMeta` lookup as the Add Link form.

## Why this spec exists

When you import plain URLs (Paste URLs tab) or a minimal CSV (SPEC 02's `url,category,tags` template), the links arrive with no title, description, thumbnail or duration. Each one then has to be edited by hand. The Add Link form already fetches this metadata (`fetchLinkMeta` in `app/dashboard/link/actions.ts`), but the import does not.

## Scope

**In:**

- An ON/OFF switch, "Auto-fetch metadata", in the Import section of `ImportExportClient.tsx`, under the "Default category" select.
  - It uses the same visual as `UrlField`'s auto-fetch switch: pill track, sliding knob, `bg-primary-600` when ON.
  - It is a `button` with `role="switch"` and `aria-checked`.
  - It is always **OFF** on page load. It is not tied to the `auto_fetch_enabled` preference and is not persisted.
  - A hint line under it reads: "Fills in missing title, description, image and duration. Slower: links are fetched one at a time."
- It applies to Paste URLs, Paste JSON (plain array), and uploaded `.csv`/plain `.json` files.
- When a full v2 vault export is detected (`detectedVaultExport`):
  - the switch is shown **disabled**, with the note "Not available for full vault exports — they already include metadata.";
  - no fetching happens, even if the switch was ON before the file was detected.
- Fetching runs **sequentially**, one link at a time, inside `importLinks`:
  - after the invalid-URL and duplicate checks, so invalid or already-saved URLs are never fetched;
  - only when at least one of `title`, `description`, `image_url`, `duration` is empty for that row.
- **Fill only empty fields:** a fetched value is used only where the row's value is `null`/`undefined`/`''`. Values supplied by the file always win.
- A failed or empty fetch never blocks the import. The link is inserted with whatever it had.
- The result summary shows `· N without metadata` when N > 0. N counts links where a fetch was attempted and it threw, or returned null for all of title/description/image/duration.
- While auto-fetch is ON, the import button label reads `Importing… links + metadata (x/y)`.
- Tests for the service, the hook, and the component.

**Out of scope (for future specs):**

- Cancelling an import mid-way.
- Parallel or batched fetching, or a link-count cap.
- Auto-fetch for full v2 vault restores.
- Remembering the switch state, or tying it to the `auto_fetch_enabled` preference.
- Overwriting values that are already present in the import file.
- Re-fetching metadata for links already in the vault (a "refresh metadata" action).
- Auto-assigning categories by domain on import.
- Extracting a shared `ToggleSwitch` component from `UrlField`.

## Data model

No new persisted data. Changes are in-memory types only:

```ts
// lib/services/links.ts
export type ImportMeta = {
  title: string | null
  description: string | null
  image: string | null
  duration: string | null
}
// Structurally matches LinkMeta from app/dashboard/link/actions.ts, so
// fetchLinkMeta can be passed directly without lib/ importing from app/.
export type ImportMetaFetcher = (url: string) => Promise<ImportMeta>

export type ImportResult = {
  imported: number
  skipped: number
  duplicates: number
  metaMissing?: number // only set when a fetcher was supplied
}

export async function importLinks(
  inputs: ImportLinkInput[],
  defaultCategoryId: string | null,
  dek: CryptoKey,
  onProgress?: (done: number, total: number) => void,
  fetchMeta?: ImportMetaFetcher, // new, optional, last
): Promise<ImportResult>
```

Field mapping, applied only where the input is empty:

- `meta.title` → `title`
- `meta.description` → `description`
- `meta.image` → `image_url`
- `meta.duration` → `duration`
- `site_name` keeps its existing hostname default.

Hook state in `useLinkImport`: `autoFetchOnImport: boolean` (initial `false`) plus `setAutoFetchOnImport`.

## Implementation plan

1. **Service.** In `lib/services/links.ts`:
   - Add `ImportMeta`, `ImportMetaFetcher` and `ImportResult.metaMissing`, plus the optional `fetchMeta` param on `importLinks`.
   - Inside the loop, after the duplicate check: if `fetchMeta` is set and any of the four fields is empty, `await fetchMeta(trimmedUrl)` in its own `try/catch`.
   - Merge the fetched values into empty fields only, and count `metaMissing` on a throw or an all-null result.
   - Return `metaMissing` only when `fetchMeta` was given.
   - `importVaultExport` (`lib/services/importExport/importVault.ts`) passes no fetcher, so its behavior is unchanged.
2. **Service tests.** Add to `tests/services/links.test.ts`:
   - fetcher fills empty fields;
   - provided `title` is not overwritten, while an empty `image_url` is filled;
   - fetcher is not called for invalid URLs, duplicates, or rows with all four fields already set;
   - a fetcher that throws still imports the link and counts `metaMissing: 1`;
   - an all-null result counts `metaMissing`;
   - without a fetcher, the result has no `metaMissing` key and existing tests pass unchanged.
3. **Hook.** In `lib/hooks/importExport/useLinkImport.ts`:
   - Add `autoFetchOnImport` state (default `false`).
   - In the non-vault branch, pass `autoFetchOnImport ? fetchLinkMeta : undefined` as `importLinks`'s fifth argument. Import `fetchLinkMeta` from `@/app/dashboard/link/actions`, the same import `useAddLinkForm` uses.
   - The vault branch never passes it.
   - Carry `metaMissing` into `lastResult`, and expose `autoFetchOnImport`/`setAutoFetchOnImport`.
4. **Hook tests.** Add to `tests/hooks/importExport/useLinkImport.test.ts`:
   - default is `false`, and `importLinks` gets `undefined` as the fetcher;
   - when ON, it gets `fetchLinkMeta` (mocked);
   - with a v2 export detected and the switch ON, `importVaultExport` is called and `importLinks`/`fetchLinkMeta` are not.
5. **UI.** In `app/dashboard/config/import-export/ImportExportClient.tsx`:
   - Render the switch row under the Default category select, using the `UrlField` switch classes and the hint line.
   - When `detectedVaultExport` is set, add the `disabled` attribute with `disabled:opacity-50`, and show the note.
   - Add `· N without metadata` to the result line.
   - While `importing && autoFetchOnImport && !detectedVaultExport` and phase is `links`, the button label reads `Importing… links + metadata (x/y)`.
6. **Component tests.** Add to `tests/components/ImportExportClient.test.tsx`:
   - the switch renders with `aria-checked="false"`, and clicking it flips it to `"true"`;
   - with a v2 export detected, the switch is disabled and the note is visible;
   - a `lastResult` with `metaMissing: 3` shows "3 without metadata".
7. **Docs.** Update `CLAUDE.md` feature #12 (Import / Export) with one sentence on the opt-in, OFF-by-default import auto-fetch switch. It fetches sequentially and fills empty fields only, is not available for v2 restores, and failures are counted as "without metadata".

## Acceptance criteria

- [ ] The Import section shows an "Auto-fetch metadata" ON/OFF switch under the Default category select, OFF on every page load.
- [ ] With the switch OFF, importing pasted URLs makes zero `fetchLinkMeta` calls and creates links with empty titles, as today.
- [ ] With the switch ON, importing 3 pasted URLs of real pages creates 3 links whose title, description and thumbnail are filled.
- [ ] With the switch ON, a pasted YouTube URL gets its title and thumbnail. It also gets its duration when `YOUTUBE_API_KEY` is set.
- [ ] With the switch ON, a CSV row with `title` = "My title" and empty `image_url` keeps "My title" and gets the fetched image.
- [ ] With the switch ON, a URL that already exists in the vault is not fetched, and is reported as "already existed".
- [ ] With the switch ON, an unreachable URL (e.g. `https://does-not-exist.invalid/x`) is still imported, and the summary shows "· 1 without metadata".
- [ ] Fetches happen one at a time: at most one `fetchLinkMeta` call is in flight during an import.
- [ ] While importing with the switch ON, the button reads `Importing… links + metadata (x/y)`.
- [ ] Loading a full v2 "Everything" export shows the switch disabled with the "Not available for full vault exports" note, and importing it makes zero `fetchLinkMeta` calls.
- [ ] `npm test` passes, including the new service, hook and component tests.

## Decisions

- **Yes:** Covers Paste URLs, Paste JSON, and CSV/JSON uploads. These are the paths where metadata is often missing.
- **No:** v2 vault restores. They already carry complete metadata, and fetching would only slow a restore down.
- **Yes:** For v2 exports, the switch is shown disabled with a note rather than hidden, so the user understands why it doesn't apply.
- **Yes:** Fill only empty fields. Whatever the user wrote in the file is intentional and must win.
- **No:** Overwriting provided values, or skipping rows that have any metadata. The first loses user data. The second leaves gaps such as a missing image when a title exists.
- **Yes:** OFF by default and not persisted. Fetching makes imports much slower, so it must be an explicit choice each time.
- **No:** Following the `auto_fetch_enabled` preference. That preference is about the single-link form, where the fetch cost is invisible.
- **Yes:** Sequential fetching. It is the simplest option and kind to remote sites. The trade-off of slow large imports was accepted.
- **No:** Concurrency or a link cap. Both are deferred, and cancel is too.
- **Yes:** Fetch after the duplicate check, inside `importLinks`, so a known URL never costs a network round-trip.
- **Yes:** `importLinks` takes the fetcher as an optional injected parameter. `lib/services/` must not depend on `app/` or Next, and tests can pass a stub.
- **Yes:** A failed fetch never fails the link. It is counted in `metaMissing` and shown in the summary, so the user knows which imports need attention.
- **Yes:** The same ON/OFF switch visual as `UrlField`. The user chose visual consistency with the Add Link form.
- **No:** Extracting a shared `ToggleSwitch` component. It is out of this spec's scope; the classes are duplicated once.

## Risks

| Risk | Mitigation |
| --- | --- |
| A large import with the switch ON takes many minutes (up to ~5s per page, more for YouTube with the API key) | OFF by default; the hint says it is slower; progress shows x/y. Cancel is a future spec. |
| A remote site rate-limits or blocks repeated requests | Sequential fetching keeps load low. A blocked fetch only lowers metadata, never the import, and it is counted as "without metadata". |
| Each fetch is a server-action round-trip on Vercel, and a function timeout could hit one call | Each call is per-link and short (5s timeouts in `fetchLinkMeta`). A failed call is caught and counted, so the import continues. |
| Toggling the switch after a v2 file was detected | The hook only passes the fetcher in the non-vault branch, so a v2 import can never fetch regardless of switch state. |

## What is **not** in this spec

- Cancelling an import mid-way.
- Parallel/batched fetching or a link cap.
- Auto-fetch for full v2 vault restores.
- Persisting the switch or tying it to the `auto_fetch_enabled` preference.
- Overwriting values present in the file.
- Refreshing metadata of existing links.
- Domain-based category auto-assign on import.
- A shared `ToggleSwitch` component.

Each one of those, if it lands, goes in its own spec.
