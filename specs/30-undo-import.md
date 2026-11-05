# SPEC 30 — Undo this import

> **Status:** Approved
> **Depends on:** SPEC 04, SPEC 05, SPEC 26
> **Date:** 2026-11-04
> **Objective:** While the import modal is still open, `Undo this import` permanently deletes every link that import saved, plus the tags and categories it created that no link uses anymore.

## Why this spec exists

SPEC 26 removed bulk actions and accepted that a bad import has to be cleaned up one link at a time. A wrong file or wrong default category can add hundreds of links, so the import summary needs its own one-step undo. The first draft of this spec moved links to Trash and kept favorites. This version deletes them permanently, favorites included, and also cleans up what the import created.

## Scope

**In:**

- An `Undo this import` button in the finished, cancelled and error views of `ImportProgressModal`, shown when the run saved at least one link.
- It never shows while the import is running or paused on a blocked host.
- Pressing it turns the button area into an inline confirm step: `Permanently delete N imported links? This can't be undone.`, plus `Includes F favorites.` when F > 0, with `Delete permanently` and `Keep` buttons.
- Confirming permanently deletes every link the run saved, favorites included. Their `link_tags` rows go with them through the existing FK cascade.
- After the links are deleted, the tags and categories this run created are removed if no link uses them anymore, counting links in Trash.
- Deleting a category also removes its domain rules, through the existing FK cascade.
- After success the modal shows `N links deleted.`, followed by `Removed T unused tags and C unused categories.` when T or C > 0. The button goes away.
- Works for every import, including v2 "Everything" restores. Preferences, and domain rules added to categories that already existed, stay.
- `refetchTags()` runs after the cleanup, so `TagsContext` drops the removed tags.
- `CLAUDE.md` updated.

**Out of scope (for future specs):**

- Undoing an import after the modal is closed or the page is reloaded. That would need an `import_batch_id` column and a list of past imports.
- Moving imported links to Trash instead of deleting them.
- Reverting applied preferences, or domain rules added to categories that existed before the import.
- Restoring anything skipped as a duplicate.
- A general bulk delete.

## Data model

No new table or column. The ids live in `useLinkImport` until the modal closes.

```ts
// lib/services/links.ts
export type ImportRowOutcome =
  | { url: string; status: 'imported'; metaMissing: boolean; id: string; isFavorite: boolean } // id + isFavorite are new
  | /* other variants unchanged */

export type ImportLinksOptions = {
  /* existing options */
  /** Called once for each tag or category this run creates (not for existing matches). */
  onCreate?: (kind: 'tag' | 'category', id: string) => void
}
```

```ts
// lib/services/tags/tags.ts — new optional last parameter, default no-op
syncTagsByName(names, dek, onCreate?: (id: string) => void)

// lib/services/categories.ts — new optional last parameter, default no-op
getOrCreateCategoryByName(name, dek, style?, onCreate?: (id: string) => void)
```

```ts
// lib/services/importExport/undoImport.ts (new)
/** Hard-deletes the given links in batches of 200. Returns how many were deleted, or null on failure. */
export async function deleteImportedLinks(ids: string[]): Promise<number | null>

/** Deletes the given tags and categories that no link (active or in Trash) still references.
 *  Returns what was removed, or null on failure. */
export async function removeUnusedImportCreations(
  created: { tagIds: string[]; categoryIds: string[] },
): Promise<{ tags: number; categories: number } | null>
```

```ts
// lib/hooks/importExport/useImportUndo.ts (new)
type ImportUndoState =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'deleting' }
  | { phase: 'done'; deleted: number; tags: number; categories: number }
  | { phase: 'delete_error' }                    // links not (all) deleted; retry re-runs both steps
  | { phase: 'cleanup_error'; deleted: number }  // links gone; retry re-runs the cleanup only
```

## Implementation plan

1. **Report created ids.** Add the `onCreate` parameter to `syncTagsByName` and `getOrCreateCategoryByName`. Call it only on the insert path. Add tests for both paths.
2. **Report saved links from `importLinks`.** Add `id` and `isFavorite` to the `imported` outcome. Add the `onCreate` option and pass it to `syncTagsByName` and to any category it creates. `importVaultExport` passes `onCreate` to its category and tag phases and to `importLinks`.
3. **Add `lib/services/importExport/undoImport.ts`.** `deleteImportedLinks` runs one `.delete().in('id', batch).select('id')` per 200 ids, with no `is_favorite` filter. `removeUnusedImportCreations` keeps any tag still in `link_tags` and any category still referenced by `links.category_id`, ignoring `deleted_at`, then deletes the rest. Add tests for batching, favorites included, and used vs unused creations.
4. **Add `useImportUndo`.** It collects ids from `imported` outcomes and from `onCreate`, plus the favorite count. It resets at import start, keeps what it collected when the import throws, runs the state machine above, and calls `refetchTags()` after the cleanup. Compose it in `useLinkImport` and re-export its state and actions. Add tests in `tests/hooks/importExport/`.
5. **Update `ImportProgressModal`.** Add the button, the inline confirm, the `Deleting…` state, the result lines and both error states: `Couldn't delete the imported links.` with `Retry`, and `N links deleted. Couldn't remove unused tags and categories.` with `Retry cleanup`. The modal can't be closed while `deleting`. Add modal tests.
6. **Update `CLAUDE.md`** feature #12 (Import / Export).

## Acceptance criteria

- [ ] After importing 3 new links and 2 duplicates, the button offers to delete 3 links, and the 2 duplicates are untouched afterwards.
- [ ] Nothing is deleted until `Delete permanently` is pressed. `Keep` returns to the button.
- [ ] After confirming, the 3 links are not on the dashboard or in Trash after a reload.
- [ ] A link imported as a favorite is deleted too, and the confirm text said `Includes 1 favorites.` (or the singular form).
- [ ] A tag the import created that no other link uses is gone from Organize → Tags afterwards.
- [ ] A tag the import created that another link now uses, including a link in Trash, is kept.
- [ ] A tag or category that existed before the import is never deleted, even if no link uses it.
- [ ] A v2 restore's undo removes its links and its unused created categories, along with their domain rules. Preferences are unchanged.
- [ ] A cancelled import offers to delete only the links it saved.
- [ ] An import that fails partway offers to delete the links saved before the error.
- [ ] An import that saved nothing shows no button.
- [ ] The button doesn't show while the import is running or paused on a blocked host.
- [ ] The modal can't be closed while the undo is deleting.
- [ ] If the link delete fails, the modal shows `Couldn't delete the imported links.` and `Retry` finishes the job.
- [ ] If only the cleanup fails, the modal shows how many links were deleted, and `Retry cleanup` removes the unused creations without touching links.
- [ ] Closing the modal afterwards and reopening the import page shows no undo for the old run.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** undo only while the modal is open, with no migration. It covers mistakes spotted right away and is much smaller.
- **No:** an `import_batch_id` column with an import history. It could be its own spec later.
- **Yes:** permanent delete. The user wants a bad import fully gone, and Trash would need emptying afterwards anyway.
- **No:** moving to Trash. It was the first draft's choice, but it leaves the cleanup half done.
- **Yes:** delete favorites too, as a deliberate exception to the `deleteLink` invariant. These links were favorited by the file, not by the user, and the confirm text calls them out.
- **Yes:** remove created tags and categories that no link uses, counting Trash. A trashed link that gets restored never points at a deleted tag or category.
- **No:** removing any tag or category that existed before the import, even when unused. The user made those.
- **Yes:** check "unused" at undo time, not at import end. A tag reused from another tab in the meantime is kept.
- **Yes:** track creations through `onCreate` callbacks, not by diffing tag lists before and after. Diffing would catch tags made in another tab during the import.
- **Yes:** an inline two-step confirm, not a separate dialog or typed confirmation. One extra click is enough, and stacking a dialog on the modal is awkward.
- **Yes:** separate retries for the two steps, so links are never deleted twice and a cleanup failure doesn't hide that the links are gone.
- **Yes:** a separate `useImportUndo` hook composed in `useLinkImport`, following "Splitting overloaded hooks".

## Risks

| Risk | Mitigation |
| --- | --- |
| The user deletes by mistake, and nothing can bring the links back | Two-step confirm, with `This can't be undone.` and the favorite count. |
| The user closes the modal, then wants to undo | Not possible. Out of scope, and the batch-column spec would be the follow-up. |
| A large import makes a very long `in` filter | Deletes and reference checks go in batches of 200. |
| A batch fails midway, so some links are already gone | `delete_error` and `Retry` run the delete again. Deleting ids that are already gone changes nothing. |
| Open dashboard tabs still show the deleted links | Same as other changes made outside the list: they update after ↻ or a reload. |
| A created private tag is removed while unlocked | It has no links left, so nothing is exposed. `UnlockedTagsContext` holding a stale id is harmless. |

## What is **not** in this spec

- Undo after closing the modal, or an import history.
- Moving imported links to Trash.
- Reverting preferences, or domain rules on categories that already existed.
- A general bulk delete.

Each one of those, if it lands, goes in its own spec.
