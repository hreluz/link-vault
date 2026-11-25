# SPEC 43 — Collections in the Everything export and the v2 import

> **Status:** Approved
> **Depends on:** SPEC 30, SPEC 40
> **Date:** 2026-11-24
> **Objective:** An "Everything" export carries the user's collections with their links in order, and importing that file restores them into the destination account.

## Why this spec exists

SPEC 40 shipped collections but left them out of Import/Export, so an "Everything" file is no longer a full clone: moving to a new account loses every playlist and its order.

SPEC 40, 41 and 42 reserved "SPEC 44" for this work and "SPEC 43" for collection chips and a Collection filter on `/dashboard`. This spec takes 43. The chips/filter spec becomes SPEC 44. The older specs are left as written; CLAUDE.md is updated.

## Scope

**In:**

- **Export ("Everything" mode only).** `buildVaultExport('everything', …)` adds a top-level `collections` array:
  - one entry per collection, every collection included, even an empty one;
  - each entry has `name`, `emoji`, `description` and `links`: the URLs of its members in `position` order (ties by `added_at`, `compareMemberships`);
  - a member is listed only if its link is in the file's own `links` array. Links in Trash and links carrying a locked private tag are left out of `links` today, so they are left out of every collection too;
  - entries are in the collections list's order (recently updated first, `sortByRecentlyUpdated`).
- **Quick export (JSON and CSV) is unchanged.** It never has `collections`.
- **Format.** Still `format: 'link-vault-export'`, `version: 2`. `collections` is optional. Files without it import exactly as today.
- **Validation** (`getVaultExportValidationError`), when `collections` is present:
  - it must be a list (`Invalid export file: "collections" must be a list.`);
  - each entry is an object with a string `name` that is 1–60 characters after trimming (`Invalid export file: a collection has an invalid name.`);
  - `emoji` is a nullable string, `description` a nullable string of at most 200 characters (`Invalid export file: a collection has an invalid field.`);
  - `links` is a string array (`Invalid export file: a collection has invalid links.`).
- **Import** (`importVaultExport`): a new `collections` phase after `links` and before `preferences`, reported through `onProgress` as `{ phase: 'collections', done, total }`:
  - always on when the file has a non-empty `collections` array. No checkbox;
  - **URL → link id:** built from the links phase. `imported` outcomes give the new id. `duplicate` outcomes now also carry the existing link's `id` (`importLinks` already has it from `findLinkIdByUrl`). Keys are trimmed URLs. A collection URL with no id (failed, invalid, skipped as generic, or not in the file) is dropped silently;
  - **name match:** the trimmed name is compared case-insensitively with the destination's collections (`getCollections`). The first match (recently updated first) is reused, and its name, emoji and description are never changed. Without a match, `createCollection` creates it with the file's name, emoji and description;
  - two entries in the same file with the same name (case-insensitive) go into the same collection: the first one creates it, the next ones reuse it;
  - **links:** the collection's resolved ids, in file order, minus ids already in that collection (`getCollectionMemberships`) and minus repeats, are appended with `addLinksToCollection`. A reused collection keeps its own order and gets the new links at the end;
  - a link in Trash in the destination that the file lists as a member is added like any other. The collection page already hides Trash links;
  - collections are processed one at a time, in **reverse** file order (last entry first). The file lists them recently updated first, and every create or append sets `updated_at = now()` (migration `0024` triggers), so going bottom-up leaves the destination list in the same order as the source. Same-named entries are grouped first, at the position of their first entry: the first entry's name, emoji and description are used, and the links are the first entry's, then the next entries', in file order;
  - **failures:** if creating a collection or appending its links fails, that collection counts as failed (`collectionsFailed`), logged with `console.error`, and the phase moves on. The import is not aborted;
  - **cancel:** if the signal is aborted at any point before the phase starts, including a cancel during the links phase, the collections phase is skipped entirely. A cancel during the phase stops after the current collection, marks the result `cancelled: true`, skips preferences and shows the usual cancelled summary. Collections already written stay, and Undo still covers them;
  - `VaultImportResult` gets `collectionsCreated`, `collectionsUpdated` (reused collections that got at least one link) and `collectionsFailed`.
- **Progress modal summary** (`ImportProgressModal`):
  - the "created" line adds `N collections` (`1 collection`) from `collectionsCreated`;
  - the "not applied" line adds `N collections` from `collectionsFailed`;
  - while the phase runs, the status line reads `Restoring collections`: a new `collections` entry in `PHASE_TEXT`, shown like the other non-link phases (`Setting up categories`, `Creating tags`), with no done/total count.
- **Undo this import** (SPEC 30):
  - `onCreate` gets a third kind, `'collection'`, called once per collection the run creates. `useImportUndo` records them as `collectionIds`. `recordCreate` gets an explicit branch per kind: today it is `if (kind === 'tag') … else categoryIds.push(id)`, so widening the type alone would quietly file collection ids as categories;
  - the cleanup step deletes every collection the run created, whether or not it still has links. Their memberships go with them (FK cascade). Links that existed before the import stay saved;
  - reused (pre-existing) collections are never deleted. Memberships of links the undo deletes go with those links (FK cascade). Memberships the run added for links that already existed stay;
  - **when Undo shows:** the run saved at least one link **or** created at least one collection (today it needs a saved link; `requestUndo` returns early otherwise). A run that saved no links but created collections, such as re-importing into an account that already has every link, can still be undone. With 0 saved links the link-delete step is skipped and only the cleanup runs (created collections, then the usual unused tag/category removal);
  - **confirm copy** (`ImportUndoSection`): when the run created collections, a line `Also deletes C collections it created.` (`1 collection`) goes under the question, like `Includes F favorites.`. With 0 saved links the question reads `Permanently delete C imported collections? This can't be undone.` and the extra line is not shown;
  - **done copy** (`removedText`): adds `C collections` (deleted count from `deleteImportedCollections`), e.g. `Removed 2 collections, 3 unused tags and 1 unused category.`;
  - `Retry cleanup` retries the collection delete too.
- **UI copy.** The Everything export description adds collections: "Also includes category colors/emoji, domain auto-assign rules, tag colors and privacy, collections, and appearance settings — a full clone for a new account."
- **CLAUDE.md:** feature #12 (Everything export/import includes collections, the new phase, the undo rule) and feature #19 (collections are in the Everything export; chips/filter are SPEC 44).
- Tests (see plan).

**Out of scope (for future specs):**

- Collections in the Quick JSON export or a CSV column.
- An opt-in checkbox to skip restoring collections.
- Collection chips on `LinkCard` and a Collection filter on `/dashboard` (now SPEC 44).
- Exporting a single collection, or sharing one.
- Renaming or restyling a reused collection from the file.
- Bumping the export to version 3.

## Data model

No database change. The export type grows:

```ts
// lib/types/importExport.ts
export type ExportedCollection = {
  name: string
  emoji: string | null
  description: string | null
  /** Member URLs in position order; only URLs present in the file's `links`. */
  links: string[]
}

export type VaultExportV2 = {
  // ...existing fields
  collections?: ExportedCollection[]   // "everything" only
}
```

```ts
// lib/services/links.ts
export type ImportRowOutcome =
  | { url: string; status: 'imported'; metaMissing: boolean; id: string; isFavorite: boolean }
  | { url: string; status: 'duplicate'; id: string }   // id added
  | ...

// onCreate's kind widens to 'tag' | 'category' | 'collection'
```

```ts
// lib/services/importExport/importVault.ts
export type VaultImportPhase = 'categories' | 'domains' | 'tags' | 'links' | 'collections' | 'preferences'
export type VaultImportResult = ImportResult & {
  // ...existing fields
  collectionsCreated: number
  collectionsUpdated: number
  collectionsFailed: number
}
```

Example file fragment:

```json
"collections": [
  { "name": "Learn Rust", "emoji": "🦀", "description": null,
    "links": ["https://doc.rust-lang.org/book/", "https://youtu.be/abc"] }
]
```

## Implementation plan

1. **Types and validation.** Add `ExportedCollection` and the optional `collections` field in `lib/types/importExport.ts`. Extend `getVaultExportValidationError` with the rules above, reusing `COLLECTION_NAME_MAX`/`COLLECTION_DESCRIPTION_MAX` from `lib/services/collections.ts` if the import doesn't pull browser-only code into the types file (otherwise inline the two numbers with a comment). Tests: *Test scenarios* → `tests/types/importExport.test.ts`.
2. **Export.** In `buildVaultExport` (`lib/services/importExport/exportVault.ts`), for `everything` only, load `getCollections(dek)` and each collection's `getCollectionMemberships`, map link ids to URLs through the exported links, keep `position` order, and set `data.collections`. Update the Everything description in `ImportExportClient.tsx`. Tests: *Test scenarios* → `exportVault.test.ts`, `ImportExportClient.test.tsx`.
3. **Duplicate id and `onCreate` kind.** `importLinks` puts `id: existingId` on the `duplicate` outcome. Widen the `onCreate` kind type to include `'collection'` wherever it's declared. Tests: *Test scenarios* → `links.test.ts`; update the existing tests that compare the `duplicate` outcome exactly.
4. **Import phase.** In `importVaultExport`, collect a URL → id map from `onProgress` outcomes, then run the collections phase as described: name match, create via `createCollection` (calling `onCreate('collection', id)`), de-dupe against `getCollectionMemberships`, append with `addLinksToCollection`, count created/updated/failed, honour the signal. Tests: *Test scenarios* → `importVault.test.ts`.
5. **Progress modal.** Add `collections: 'Restoring collections'` to `PHASE_TEXT`, and show the created/not-applied counts in the summary (`ImportProgressModal.tsx`, plus whatever `useLinkImport` passes through for the counts). Tests: *Test scenarios* → `ImportProgressModal.test.tsx`.
6. **Undo.** `useImportUndo` records `collectionIds` (explicit `'collection'` branch in `recordCreate`). Add `deleteImportedCollections(ids)` in `lib/services/importExport/undoImport.ts` (batches of 200, returns the count or null), called in the cleanup step next to `removeUnusedImportCreations`; a null result leaves `Retry cleanup`. Show Undo when links were saved or collections were created, skip the link delete with 0 links, and update the confirm and done copy (`ImportUndoSection`, `removedText`). Tests: *Test scenarios* → `undoImport.test.ts`, `useImportUndo.test.ts`, `ImportProgressModal.test.tsx`.
7. **Docs.** Update CLAUDE.md #12 and #19 (SPEC 43 = this, SPEC 44 = chips/filter).

## Test scenarios

Unit tests use Vitest + Testing Library with the existing mocks in each file. Each bullet is one test (or one `it.each` row).

### `tests/types/importExport.test.ts` — validation

- A valid file with `collections` (with and without emoji/description, empty `links`) → `null`.
- A v2 file without `collections` → `null` (unchanged).
- `collections` not a list → `Invalid export file: "collections" must be a list.`
- An entry that isn't an object, has no `name`, a non-string `name`, a whitespace-only `name` or a 61-character name → `Invalid export file: a collection has an invalid name.` A 60-character name passes.
- A non-string, non-null `emoji`; a non-string, non-null `description`; a 201-character description → `Invalid export file: a collection has an invalid field.` A 200-character description passes.
- `links` missing, not a list, or holding a non-string → `Invalid export file: a collection has invalid links.`

### `tests/services/importExport/exportVault.test.ts` — export

- Everything mode: `collections` has one entry per collection, in recently-updated-first order, with `name`, `emoji`, `description`.
- Member URLs follow `position` order, with ties broken by `added_at`.
- An empty collection is exported with `links: []`.
- A member that is in Trash (not returned by `getLinks`) is left out of its collection.
- A member carrying a locked private tag is left out. The same member is listed once that tag is unlocked.
- A collection whose members are all left out is still exported, with `links: []`.
- Quick mode (`links`): no `collections` key, and `getCollections` is not called.

### `tests/services/links.test.ts` — `importLinks`

- A row whose URL already exists reports `{ status: 'duplicate', url, id }`, with the existing link's id.
- An `onCreate('collection', …)` call type-checks. This is covered by `tsc`; no runtime test is needed.

### `tests/services/importExport/importVault.test.ts` — import phase

- **No collections:** a file without `collections`, or with `[]`, never emits a `collections` phase and never calls the collection services. The counts are all 0.
- **Create:** into an account with no collections, each entry is created with its name, emoji and description. Its links are appended in file order, and `onCreate('collection', id)` is called once per created collection. `collectionsCreated` equals the number created.
- **Reverse order:** with entries A, B, C in the file, collections are processed C, B, A (assert the order of the `createCollection` calls).
- **Reuse:** a destination collection named `learn rust` matches a file entry `Learn Rust`. No collection is created, `updateCollection` is never called, and only the missing links are appended at the end. `collectionsUpdated` is 1.
- **Reuse with nothing new:** every link is already a member, so `addLinksToCollection` isn't called and `collectionsUpdated` stays 0.
- **First match wins:** with two destination collections of the same name, the more recently updated one is used.
- **Same-name entries in the file:** two entries `Rust` and `rust` make one collection, using the first entry's emoji and description. Its links are the first entry's, then the second's, with repeats dropped.
- **Duplicate links join:** a URL reported as `duplicate` (with an id) is appended like an imported one.
- **Dropped URLs:** URLs that failed, were invalid, were skipped as generic or aren't in the file's `links` are left out silently. The rest are still appended in order.
- **Repeats inside one entry:** a URL listed twice is appended once.
- **Already a member:** ids returned by `getCollectionMemberships` are not appended again.
- **Trimmed keys:** a collection URL with surrounding spaces still resolves to its link.
- **Failure, create:** `createCollection` returns an error for one entry. That entry counts in `collectionsFailed` and logs a `console.error`, and the next entries are still processed.
- **Failure, append:** `addLinksToCollection` returns `null`. That collection counts as failed, its `onCreate` was still called, and the phase moves on.
- **Progress:** emits `{ phase: 'collections', done, total }` from 0 to the number of groups, between the last `links` event and the first `preferences` event.
- **Cancel during links:** the signal aborts during the links phase. No collection service is called, `cancelled` is `true` and preferences are not applied.
- **Cancel during collections:** the signal aborts after the first collection. The second isn't processed, `cancelled` is `true`, preferences are not applied, and the first collection's writes stand.

### `tests/hooks/importExport/useImportUndo.test.ts` — undo state

- `recordCreate('collection', id)` adds the id to `collectionIds` and not to `categoryIds`. `'tag'` and `'category'` behave as before.
- `requestUndo` with 0 links and 0 created collections stays `idle`, as today.
- `requestUndo` with 0 links and ≥ 1 created collection moves to `confirming`.
- Confirming with 0 links skips `deleteImportedLinks` and runs the cleanup: `deleteImportedCollections`, then `removeUnusedImportCreations`.
- Confirming with links runs `deleteImportedLinks`, then the cleanup with the collection delete.
- `deleteImportedCollections` returns `null` → the state is `cleanup_error`. `Retry cleanup` calls it again and, on success, moves to `done` with the collection count.

### `tests/services/importExport/undoImport.test.ts` — `deleteImportedCollections`

- An empty list makes no request and returns 0.
- 450 ids are deleted in 3 batches (200, 200, 50) on `collections`, and the call returns the summed count.
- A batch error returns `null`.
- Ids that are already gone count as 0, not as an error.

### `tests/components/ImportProgressModal.test.tsx` — modal copy

- A running v2 import whose progress phase is `collections` shows `Restoring collections`.
- The summary with `collectionsCreated: 2` includes `2 collections` in the created line. With `1`, it shows `1 collection`.
- The summary with `collectionsFailed: 1` includes `1 collection` in the not-applied line.
- The summary with no collection counts reads exactly as today.
- The Undo confirm with links and created collections shows `Also deletes 2 collections it created.`
- The Undo confirm with 0 links and created collections reads `Permanently delete 2 imported collections? This can't be undone.`, without the extra line.
- The done state includes `2 collections` in the `Removed …` line.

### `tests/components/ImportExportClient.test.tsx` — export copy

- The Everything section's description mentions collections.

### Manual check (Playwright, per CLAUDE.md, port 3500)

1. In the test account, create two collections, `Learn Rust` (🦀, 3 links in a custom order) and `Empty one`. Put one more link in `Learn Rust` and move that link to Trash. Click **Export everything as JSON** and check the file's `collections` array (order, URLs, no Trash URL, `Empty one` with `links: []`).
2. Run `supabase db reset`, re-create and confirm the test account, then import that file from the File tab.
3. Check that the modal shows `Restoring collections` during that step, and that the summary lists `2 collections` in the created line.
4. Open Organize → Collections and check that both collections are there in the source order, with `Learn Rust`'s links in the custom order.
5. Import the same file again. Check that every link shows as "Already existed", no new collection appears, and the links aren't duplicated.
6. Delete both collections by hand, then import the file a third time. Every link shows as "Already existed" and both collections are created again. Check that **Undo this import** is offered and that the confirm reads `Permanently delete 2 imported collections? This can't be undone.`. Confirm it, then check that both collections are gone and every link is still saved.
7. Save screenshots of steps 1, 3, 4 and 6 with a `README.md`, as CLAUDE.md describes.

## Acceptance criteria

- [ ] An Everything export of an account with collections has a `collections` array with every collection, including empty ones.
- [ ] Each exported collection lists its member URLs in the same order as the collection page.
- [ ] A member in Trash or carrying a locked private tag is not listed in any exported collection.
- [ ] A Quick export (JSON or CSV) has no collection data.
- [ ] A v2 file without `collections` imports exactly as before, with no collections phase shown.
- [ ] A file whose `collections` has a nameless entry, a 61-character name or a 201-character description is rejected before anything is written, with the matching error message.
- [ ] Importing an Everything file into an empty account recreates every collection with its name, emoji, description and link order.
- [ ] After that import, the Collections list shows the collections in the same order as in the source account.
- [ ] Importing into an account that already has a same-named collection (any case) adds only the missing links at its end and leaves its name, emoji and description untouched.
- [ ] A file link that already existed in the destination ("Already existed") still joins the imported collection.
- [ ] Importing the same file twice creates no new collections and no duplicate memberships.
- [ ] Cancelling during the links phase creates no collections and adds no memberships.
- [ ] Cancelling during the collections phase keeps the collections already restored, applies no preferences and shows the cancelled summary.
- [ ] The summary shows `N collections` in the created line, and in the not-applied line when one failed.
- [ ] `Undo this import` deletes the collections the run created and leaves pre-existing collections in place.
- [ ] The Undo confirm of a run that created collections shows `Also deletes C collections it created.`, and after undoing, the done text includes `C collections`.
- [ ] A run that saved no links but created collections still offers `Undo this import`, and undoing it deletes those collections without touching any link.
- [ ] `npm test`, `npm run lint` and `npx tsc --noEmit` pass.

## Decisions

- **Yes:** Everything mode only. Collections are account structure, like category styling and domain rules. Quick exports stay links-first and CSV can't carry order cleanly.
- **No:** a CSV `collections` column. Order inside a collection would be lost.
- **Yes:** stay on v2 with an optional field. Older files and older builds keep working; a version bump would add churn for no gain.
- **Yes:** members referenced by URL, not by an index or id. URLs are the file's link identity already, and ids don't survive a move between accounts.
- **Yes:** reuse the first same-named collection and append. Same rule as categories and tags ("resolved by name, never overwritten"), and it makes re-importing safe.
- **No:** always creating new collections. Re-importing would duplicate every playlist.
- **Yes:** existing links join the collection. Otherwise restoring into an account that already has some links leaves holes in the playlist.
- **Yes:** the duplicate outcome carries the existing id. `importLinks` already looks it up, so no extra query is needed.
- **Yes:** always on, no checkbox. Categories, domain rules and tags are always restored too, and Undo covers mistakes.
- **Yes:** cancel skips the whole collections phase. Same as preferences. A re-run restores them completely because saved links come back as duplicates with ids.
- **Yes:** Undo deletes every collection the run created, even ones that still have links. They only exist because of the import. Pre-existing collections are never touched.
- **Yes:** Undo shows when the run created collections, even with no saved links. Otherwise an all-duplicates re-import could leave collections with no way to undo them.
- **Yes:** process collections in reverse file order. The list sorts by `updated_at`, which the import itself sets, so bottom-up keeps the source order with no format change.
- **No:** exporting and restoring collection timestamps. It would mean overwriting the `updated_at` the triggers just set.
- **Yes:** number 43. Chosen by the user over the reserved 44; the chips/filter spec moves to 44.

## Risks

| Risk | Mitigation |
| --- | --- |
| Names aren't unique, so "first match" is ambiguous when the destination has two same-named collections | First match by the list order (recently updated first) is deterministic; the reused collection is never modified except by appending. |
| Two file entries with the same name merge into one collection | Documented in scope; the second entry's links are appended after the first's. |
| Many collections × memberships queries make export slow | One `getCollectionMemberships` call per collection; collections are few compared with links. If it ever matters, a single bulk membership query can replace it. |
| An append partly fails after the collection was created | Counted in `collectionsFailed`; the created collection is still recorded for Undo. Re-importing appends the missing links. |

## What is **not** in this spec

- Collections in the Quick export or CSV.
- An opt-in checkbox for collections.
- Dashboard collection chips and a Collection filter (SPEC 44).
- Single-collection export or sharing.
- Export version 3.

