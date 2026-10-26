# SPEC 18 — Delete icon on the link card

> **Status:** Approved
> **Depends on:** none
> **Date:** 2026-10-25
> **Objective:** Move "Delete link" out of the ··· sheet and into a trash icon button on the link card, placed first in the card's button row, like the Edit icon.

## Why this spec exists

Today deleting a link from the card takes two steps: open ··· and press "Delete link" at the bottom of the sheet. Edit already has its own icon on the card. The user wants delete to be one click too, so the ··· sheet becomes a status picker only.

## Scope

**In:**

- **The new button** in `LinkCard` (`app/dashboard/link/LinkCard.tsx`):
  - first in the button row, before the favorite star: 🗑 ☆ ✎ ···;
  - an inline trash SVG, same size and ghost style as the Edit button (`h-8 w-8`, `lg:h-10 lg:w-10`, `text-surface-400`), with a red hover (`hover:text-red-600 hover:bg-red-50`, `dark:hover:text-red-400 dark:hover:bg-red-900/20`);
  - `aria-label="Delete link"`, `title="Delete"`;
  - shown on every viewport (mobile and desktop);
  - hidden in selection mode, like the other row buttons.
- **Click on a non-favorite link:** calls the card's existing `onDelete` (`handleDeleteById(link.id)` from `LinkGrid`). Same as today's ··· Delete: immediate soft-delete with the 2 s undo toast. No confirm dialog.
- **Favorited link:** the button is shown but `disabled` (`disabled:cursor-not-allowed disabled:opacity-40`, no red hover), with `title="Unfavorite to delete"`. Clicking does nothing.
- **The ··· sheet** (`app/dashboard/link/BottomSheet.tsx`):
  - remove the whole delete section (the "Delete link" button and the 🔒 "Unfavorite to delete" note);
  - remove the `onDelete` prop;
  - `LinkModals` stops passing `onDelete={handleDelete}`;
  - the ··· button keeps `aria-label="Link options"`.
- **Swipe-to-delete is unchanged** (still disabled for favorites and in selection mode).
- **Bulk delete is unchanged.**
- Tests for the card button and the sheet, plus a CLAUDE.md update in feature #6.

**Out of scope (for future specs):**

- A confirm dialog before deleting.
- Renaming the ··· button or adding other actions to the sheet.
- Changing swipe-to-delete or bulk delete.
- Removing `handleDelete` from `useLinkList` if other code still uses it (only remove it if nothing else does; see step 3).

## Data model

No new data, no DB change. `LinkCard` already takes `onDelete?: () => void`; `BottomSheet` loses its `onDelete` prop:

```ts
// app/dashboard/link/BottomSheet.tsx
interface Props {
  link: LinkWithTags | null
  onStatusChange: (id: string, status: LinkStatus) => void
  onClose: () => void
}
```

The favorite rule stays enforced in `useLinkMutations.handleDelete` and `deleteLink` (`.eq('is_favorite', false)`); the disabled button is only the UI side.

## Implementation plan

1. **Card button.** In `LinkCard`, render the trash button first inside the button row (`!isSelectionMode` block), when `onDelete` is set. `disabled={link.is_favorite}`, `title` and `aria-label` as in Scope, `onClick={onDelete}`.

   Tests in `tests/components/LinkCard.test.tsx`:
   - the `Delete link` button is the first button in the row, before `Add to favorites`;
   - clicking it on a non-favorite calls `onDelete` once;
   - on a favorite it is disabled, has `title="Unfavorite to delete"`, and clicking does not call `onDelete`;
   - in selection mode it is not rendered;
   - without `onDelete` it is not rendered.
2. **Sheet.** In `BottomSheet`, delete the delete section and the `onDelete` prop. In `LinkModals`, stop passing it.

   Tests (new `tests/app/dashboard/link/BottomSheet.test.tsx`, or an existing sheet test if one is found):
   - the sheet renders the four status options;
   - there is no `Delete link` button and no `Unfavorite to delete` text, for both a favorite and a non-favorite link.
3. **Cleanup.** If `handleDelete` in `useLinkList` (the `activeLink`-based one) has no other caller after step 2, remove it from `useLinkList` and `LinkListContext`, and update its tests. Keep `handleDeleteById`.
4. **Docs.** In CLAUDE.md feature #6, change "single delete (the "···" menu and `BottomSheet`)" to "single delete (the 🗑 icon on `LinkCard`, disabled with an "Unfavorite to delete" tooltip for favorites)". In feature #5, the `BottomSheet` mention for status changes stays.

## Acceptance criteria

- [ ] Each link card shows a trash icon as the first button in its row, before the star, on mobile and desktop widths.
- [ ] Clicking the trash icon on a non-favorite link removes the card at once and shows the undo toast; Undo brings it back.
- [ ] On a favorited link the trash icon is grayed out, hovering shows `Unfavorite to delete`, and clicking does nothing.
- [ ] In selection mode the trash icon is not shown.
- [ ] Opening ··· shows only the status picker: no "Delete link" button and no 🔒 note.
- [ ] Swipe-left still deletes a non-favorite link and still does nothing for a favorite.
- [ ] Bulk delete works as before.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** move delete out of ··· onto the card, as the user asked. **No:** keep it in both places; two delete paths with different looks is clutter.
- **Yes:** first in the row, before the star (user's choice). **No:** after Edit or after ···.
- **Yes:** same behavior as today (soft-delete + 2 s undo toast). Delete is already reversible, so a confirm dialog only adds a click. **No:** confirm dialog.
- **Yes:** for favorites, show the icon disabled with an `Unfavorite to delete` tooltip. The layout doesn't shift when starring, and the reason is visible. **No:** hiding it, or an enabled button that only toasts.
- **Yes:** ··· sheet becomes status only, keeping its `Link options` label. **No:** renaming it in this spec.
- **Yes:** keep the server-side favorite guard; the disabled button is not the only protection.

## Risks

| Risk | Mitigation |
| --- | --- |
| A delete button first in the row, next to the star, is easy to hit by mistake | Delete is a soft-delete with a 2 s undo toast, and the item stays in Trash. |
| Four buttons crowd the header row on narrow phones | Same `h-8 w-8` size as Edit; the category pill already shrinks. Check at 360 px width during verification. |
| `handleDelete` is removed while something else still uses it | Step 3 removes it only when no caller is left; the type check catches leftovers. |

## What is **not** in this spec

- A confirm dialog.
- New actions or a rename for the ··· sheet.
- Changes to swipe-to-delete or bulk delete.

Each one of those, if it lands, goes in its own spec.
