# SPEC 26 — Remove link selection mode and bulk actions

> **Status:** Approved
> **Depends on:** SPEC 25
> **Date:** 2026-11-02
> **Objective:** Remove the dashboard's selection mode and every bulk action, along with the code and tests that only they use, so each link card behaves one way.

## Why this spec exists

The user finds selection mode useless and confusing. Long-press is an invisible way in, on a card that already handles taps and swipes. The mode also swaps the header, hides the card's icons and pauses the move-to-end timers, which is a lot of behavior for something rarely used.

Removal has a known cost: there is no longer a way to change many links at once. After a bad import, the links have to be deleted or recategorized one at a time. The user accepted this.

## Scope

**In:**

- **Ways into the mode:** the long-press on `LinkCard` and the header's `Select` button are removed.
- **Selection UI:**
  - the selection checkbox, selected ring and `selected` header state (`N selected`, `Cancel`);
  - `BulkActionToolbar`, `BulkDeleteModal`, `BulkCategoryModal` and `BulkTagModal`.
- **Selection logic:**
  - the `useLinksSelection` and `useLinkBulkMutations` hooks;
  - the `handleBulk*` and `handleSelectAllMatching` handlers and `selectingAllMatching` in `useLinkList`.
- **Bulk services:** `bulkUpdateStatus`, `bulkSoftDelete`, `bulkUpdateCategory`, `bulkAddTags` and the `BulkSoftDeleteResult` type in `lib/services/links.ts`.
- **Tests:** the tests for all of the above are deleted, and tests that mention selection mode are updated.
- **Rename:** `SELECT_ALL_MATCHING_CAP` becomes `MATCHING_LINK_IDS_CAP`, because free-text search and alphabetical sort still use it and "select all" no longer exists. The value stays 2000.
- **Docs:** `CLAUDE.md`, `README.md` and `ENCRYPTION.md`.

**Must keep working, unchanged:**

- `getMatchingLinkIds` and the `search_link_ids` RPC, which `useLinkListQuery` uses for search and alphabetical sort.
- `matchesLocalFilters` and `syncTagsByName`, which other code uses.
- Single delete, swipe-to-delete and the `deleteLink` favorite protection.
- `useTagInput`'s `onTagAdded` option, which `TagChipsInput` still uses.
- The status, tag and category filters, including selecting several statuses or tags in a filter.

**Out of scope (for future specs):**

- A replacement for mass cleanup, such as "undo this import".
- A new long-press action on cards.
- Any other change to the header or card layout.
- Editing older specs. They stay as a record of what was built at the time.

## Data model

This feature introduces no new data and no DB change. No migration is needed, because `search_link_ids` stays in use.

```ts
// lib/services/links.ts — renamed, same value
export const MATCHING_LINK_IDS_CAP = 2000

// app/dashboard/link/LinkCard.tsx — props removed
isSelectionMode, isSelected, onSelect, onLongPress
```

## Implementation plan

1. **Remove the UI.** All of this goes in one step, because removing only the header's `Cancel` would strand anyone who long-pressed into the mode.
   - `LinkCard`:
     - remove the four props, the long-press timer and pointer handlers, `handleCardClick` and the checkbox;
     - remove the `ml-8` and `select-none` classes that depend on the mode;
     - always render the icon row and the title link;
     - `showLastOpened` becomes `isLastOpened`;
     - `onSwipeDelete` becomes `link.is_favorite ? undefined : onDelete`.
   - `LinkGrid`: stop passing the four props.
   - `LinkListHeader`: remove the `Select` button and the `isSelectionMode` branch.
   - `LinkList`: remove `BulkActionToolbar`.
   - Delete `BulkActionToolbar.tsx`, `BulkDeleteModal.tsx`, `BulkCategoryModal.tsx` and `BulkTagModal.tsx`.

   Tests:
   - delete `tests/components/BulkTagModal.test.tsx`;
   - in `tests/components/LinkCard.test.tsx`, delete the three selection-mode assertions and cases, and add one: a 600 ms pointer hold doesn't change the card and its title link stays rendered;
   - in `tests/components/LinkListHeader.test.tsx`, delete the two "absent in selection mode" cases, change "sits left of the Select button" so ↻ sits directly left of `Add link`, and add one: no `Select links` button is rendered;
   - in `tests/app/dashboard/link/LinkGrid.test.tsx`, drop the selection fields from the mock context.
2. **Remove the hooks.**
   - `useLinkList`:
     - remove `useLinksSelection`, the handlers, `selectingAllMatching`, and the `getMatchingLinkIds` and cap imports;
     - `pausedAll` becomes `modals.editingLink !== null`.
   - `useLinks`: remove `useLinkBulkMutations`.
   - Delete `useLinksSelection.ts` and `useLinkBulkMutations.ts`.

   Tests:
   - delete `tests/hooks/links/list/useLinksSelection.test.ts` and `useLinkBulkMutations.test.ts`;
   - in `useLinkList.test.ts`, delete "does not move while selection mode is active" and the bulk mocks;
   - in `useLinks.test.ts`, delete the `handleBulkStatusChange` case and the bulk mocks, and update the header comment.
3. **Remove the services and rename the cap.**
   - Delete the four functions and `BulkSoftDeleteResult` from `lib/services/links.ts`.
   - Rename the constant in `lib/services/links.ts` and update the comment on `getMatchingLinkIds`, so it no longer mentions "select all".

   Tests:
   - delete `tests/services/links-bulk.test.ts`, which only covers the four functions;
   - update the name in `tests/services/links.test.ts` and in the `useLinkList.test.ts` mock if it is still needed there.
4. **Docs.**
   - `CLAUDE.md`:
     - delete feature #11, leaving other numbers alone because other text refers to them;
     - remove `BulkTagModal` from #3 and from "Tag privacy";
     - remove the selection-mode mentions from #5, including the pause and the hidden Send to end button;
     - remove the bulk behavior from #6, keeping the `deleteLink` invariant;
     - in "Link list pagination", remove `useLinkBulkMutations`, the "bulk delete" count example, the `Select all` bullet and "hidden in selection mode" on ↻;
     - remove `useLinkBulkMutations` from "Tags data".
   - `README.md`: delete the Bulk actions bullet and remove "bulk-action" from Favorites.
   - `ENCRYPTION.md`: name `MATCHING_LINK_IDS_CAP` and drop the reference to the bulk-action feature.

## Acceptance criteria

- [ ] The dashboard header has no `Select` button, on phone or desktop.
- [ ] Holding a card for over 500 ms on a phone or with a mouse doesn't enter any selection state, and no checkbox appears.
- [ ] A normal tap on a card still opens the link.
- [ ] Swiping a card left still deletes it, and a favorited card still can't be swipe-deleted.
- [ ] The card's trash icon still deletes a link, and is still disabled with `Unfavorite to delete` on a favorite.
- [ ] Opened links still move to the end after the saved delay, and the pause still applies while the edit modal or that link's ··· menu is open.
- [ ] Free-text search and alphabetical sort still return results, with `search_link_ids` called with `p_limit: 2000`.
- [ ] Filtering by several statuses or tags still works.
- [ ] Tags can still be added in the link form and the import form, and the input still blurs after a tag is added.
- [ ] `grep -rEi "bulk|isSelectionMode|useLinksSelection|onLongPress|SELECT_ALL_MATCHING_CAP" app components lib tests`, with `-i` matching the words in any case, finds nothing except the "bulk lookups" comment in `lib/services/category-domains.ts`.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** remove everything, including the code, as the user chose. Unused code keeps costing attention, and git history can bring it back. **No:** removing only long-press and keeping the `Select` button. That fixes accidental entry but keeps the mode and its complexity.
- **No:** keeping bulk delete only for import cleanup, as the user chose. It would keep most of the selection code for a rare need.
- **Yes:** accept one-at-a-time cleanup, as the user chose. Individual delete and swipe-to-delete remain. **No:** planning a replacement tool here. If mass cleanup becomes a real problem, a tool built for it fits better than generic selection.
- **Yes:** delete the bulk service functions, as the user chose. **No:** keeping them for later, where they would sit unused and could drift out of step with the rest of the code.
- **Yes:** keep `getMatchingLinkIds` and `search_link_ids`. They aren't bulk-only, because search and alphabetical sort depend on them.
- **Yes:** rename the cap, because the old name describes a feature that no longer exists. This wasn't discussed with the user; it is a name change with no behavior change.
- **Yes:** long-press does nothing on the card now. The browser's or phone's own long-press behavior on links takes over, and the app doesn't touch it.
- **Yes:** remove the UI in a single step, so no commit leaves a way into the mode with no way out.

## Risks

| Risk | Mitigation |
| --- | --- |
| A bad import means removing many links one at a time | Accepted by the user. A dedicated tool can get its own spec if this becomes a real problem. |
| Removing bulk code also removes something search needs | `getMatchingLinkIds` and `search_link_ids` are named as kept, and the search and sort criterion covers them. |
| `useLinkListQuery` search tests break through the shared service file | The rename only touches the constant, and `npm test` covers those tests. |
| Native long-press menus on phones look like a leftover of the feature | They are the browser's own behavior on links. The acceptance criteria only require that no app selection state appears. |

## What is **not** in this spec

- A mass-cleanup replacement, such as "undo this import".
- A new long-press action on cards.
- Changes to filters, including selecting several statuses or tags.
- Other changes to the header or card layout.
- Database changes.
- Edits to older specs.

Each one of those, if it lands, goes in its own spec.
