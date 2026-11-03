# SPEC 30 — Undo this import

> **Status:** Draft
> **Depends on:** SPEC 04, SPEC 26
> **Date:** 2026-11-02
> **Objective:** The import summary offers `Move N imported links to Trash`, so a bad import can be cleaned up in one step now that bulk actions are gone.

## Why this spec exists

SPEC 26 removed bulk actions and accepted that a bad import has to be cleaned up one link at a time. It said a dedicated tool could get its own spec if this became a real problem. This is the smallest version of that tool.

## Scope

**In:**

- `importLinks` returns the ids of the links it saved.
- The finished, cancelled and error views of `ImportProgressModal` show a `Move N imported links to Trash` button when N > 0.
- Pressing it asks for confirmation inside the modal, then soft-deletes those links.
- Favorited links stay, following the `deleteLink` rule, and the result says how many were kept.
- After success the modal shows `N links moved to Trash` and the button goes away.
- Works for all imports, including v2 restores (links only).
- `CLAUDE.md` updated.

**Out of scope (for future specs):**

- Undoing an import after the modal is closed, or after a reload. This would need an `import_batch_id` column and a list of past imports.
- Removing categories, tags, domain rules or preferences the import created.
- Restoring links that were skipped as duplicates.
- A general bulk delete.

## Data model

This feature introduces no new table or column. The ids live in memory until the modal closes.

```ts
// lib/services/links.ts
export type ImportResult = { /* existing fields */ importedIds: string[] }

/** Soft-deletes the given links, leaving favorites alone. */
export async function softDeleteImportedLinks(
  ids: string[],
): Promise<{ deleted: number; keptFavorites: number } | null> // null on failure
```

## Implementation plan

1. **Collect ids in `importLinks`.** Add `link.id` after each successful row, and return the list on every exit, including a cancel. `importVaultExport` passes it through.
2. **Add `softDeleteImportedLinks`.** It sends one update per 200 ids, with `.eq('is_favorite', false)` and `.select('id')`, and treats ids not returned as kept favorites.
3. **Hold the ids in `useLinkImport`.** Reset them at import start. If the import fails partway, keep what was saved, using the ids reported so far.
4. **Update `ImportProgressModal`.** Add the button, the confirm step, the in-progress state and the result line. A failure shows `Couldn't move the links to Trash` and lets the user try again.
5. **Add tests:** ids returned on finish and cancel; batching and favorites in the service; the button's visibility, confirm and failure states in the modal.

## Acceptance criteria

- [ ] After importing 3 new links and 2 duplicates, the summary offers to move 3 links, and the 2 duplicates aren't affected.
- [ ] Nothing is deleted until the confirmation is accepted.
- [ ] After confirming, the 3 links are in Trash, can be restored, and no longer show on the dashboard after a reload.
- [ ] A link imported as a favorite stays, and the result says 1 was kept.
- [ ] A cancelled import offers to move only what it saved.
- [ ] An import that saved nothing shows no button.
- [ ] A failed move shows an error, moves nothing further and can be tried again.
- [ ] Categories and tags the import created are still there afterwards.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes (please confirm):** the summary modal only, with no migration. It covers mistakes spotted right away and is much smaller. **No:** an `import_batch_id` column with an import history. It would also catch mistakes found days later, and can be added later. Links imported before it existed couldn't be undone either way.
- **Yes:** move to Trash, not permanent delete, so the undo can itself be undone.
- **Yes:** keep favorites, because `deleteLink` treats that protection as a real invariant.
- **No:** removing created tags and categories. Another link may be using them by then.

## Risks

| Risk | Mitigation |
| --- | --- |
| The user closes the modal, then wants to undo | The button can't help then. The confirm text and spec limits make this explicit, and a batch column is the follow-up. |
| A large import makes a very long `in` filter | Updates go in batches of 200. |
| A batch fails midway | The result reports failure, retry is safe because soft-deleting twice changes nothing visible. |
| Open dashboard tabs still show the links | Same as other changes made outside the list: they update after ↻ or a reload. |

## What is **not** in this spec

- Undo after closing the modal, or an import history.
- Removing created categories, tags, domain rules or preferences.
- A general bulk delete.

Each one of those, if it lands, goes in its own spec.
