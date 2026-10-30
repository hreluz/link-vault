# SPEC 21 — Keep moved links at the true end of the list, not the end of page 1

> **Status:** Approved
> **Depends on:** SPEC 15, SPEC 16, SPEC 19
> **Date:** 2026-10-29
> **Objective:** While more pages are left to load, a moved card (`moved_to_end_at` set) is held back from the dashboard list, and it reappears at the very end, oldest move first, once the last page has loaded, so scrolling shows new links instead of ones already opened.

## Why this spec exists

SPEC 15 moves an opened card "to the end of the list" 30 s after it is opened. In practice it goes to the end of the **loaded** list (`handleMoveToEnd` in `useLinkMutations` appends it to `rawLinks`). When the next page arrives, `usePaginatedQuery.loadMore` appends it **after** the moved cards.

On mobile the user works through page 1, opening links, and they move away as expected. Then the user scrolls down, and the first thing they hit is the cards they already opened, sitting between page 1 and page 2. Infinite scroll only triggers after them, because the scroll sentinel sits below them. As the user put it: "it is not really at the end, it is at the end of the 1st page".

The DB side is already correct. After a refresh, `search_links` returns moved links last. Only the in-session list is wrong.

## Scope

**In:**

- **The hold-back rule:** while `hasMore` is true, every loaded link with `moved_to_end_at !== null` is left out of the displayed list (`links`).
  - This covers cards moved in this session and links moved in an earlier session that happen to arrive in a loaded page.
  - Both text search / alphabetical sort (Branch B) and the server-sorted list (Branch A) follow it.
- **When the last page has loaded** (`hasMore` false), the held-back links are shown at the end of the list. Unmoved links come first in their loaded order, then moved ones by `moved_to_end_at` ascending (the most recently moved is last). This is the same rule as `movedLinksLast` and the `search_links` RPC.
- **Short lists:** when page 1 is already the whole list (`hasMore` false from the start), the move behaves as today. The card visibly goes to the bottom.
- **Held-back links stay loaded.** They remain in `rawLinks`. Only the displayed list drops them, so:
  - the header counts `N links (M unread)` still include them (SPEC 19 `correctedCounts` is unchanged);
  - the SPEC 16 `Undo` button stays available for a held-back card. Its `title` still uses that link's title. Pressing it puts the card back at its old index with its previous `moved_to_end_at`, and the card shows again when that value is `null`;
  - a held-back link is not treated as "left the list". Its Undo slot is not cleared, and the SPEC 15 "left list" cancel does not fire for it.
- **Empty displayed list with more pages left:** if every loaded link is held back (e.g. all 40 of page 1 were opened and moved), the grid does not show the "No links match" / "No favorites" empty state. It keeps the scroll sentinel, so the next page loads.
- **Setting a held-back link to Unread** (only possible via bulk status, since the card isn't visible) clears `moved_to_end_at` (SPEC 15 trigger and local update). The card then reappears where it sits in `rawLinks`, which is the end of what was loaded at the time it moved. This is accepted.
- Tests for the query hook, the composition in `useLinkList` and `LinkGrid`, plus a CLAUDE.md note in feature #5.

**Out of scope (for future specs):**

- Inserting later pages *above* moved cards while keeping those cards rendered.
- Any indicator of how many cards are held back (e.g. "3 opened links at the end").
- Moving a card that is set back to Unread to its normal position on screen (still deferred from SPEC 15).
- Changing the 30 s delay, pause rules or Undo behavior of SPEC 15 / 16.
- Fixing the stale `moved_to_end_at` inside the Branch B candidate cache (dedupe already covers it, see Risks).
- Server/RPC or migration changes.

## Data model

No DB change and no new persisted data.

```ts
// lib/hooks/links/list/useLinkListQuery.ts — return value
links: LinkWithTags[]        // CHANGED: displayed list. While hasMore, links with moved_to_end_at !== null are left out;
                             // when !hasMore, movedLinksLast(loadedLinks)
loadedLinks: LinkWithTags[]  // NEW: every loaded link after the private-tag filter (what `links` is today), in rawLinks order
```

`useLinks` passes `loadedLinks` through. `useLinkList` uses `loadedLinks` (not `links`) wherever it asks "is this link still loaded?":

- the effect that cancels pending move timers for links that left the list;
- the effect that calls `clearLastMove()` when `lastMove.id` is gone;
- `lastMovedLink`;
- `rememberMoveTitle` in `handleLinkOpen`.

`links` stays the value used for rendering (`LinkGrid`, `LinkListContext`). `usePaginatedQuery`, `useLinkMutations`, `LinkFilterParams` and the RPCs do not change.

## Implementation plan

1. **Split displayed vs loaded in `useLinkListQuery`.**
   - Rename the current private-tag-filtered list to `loadedLinks` and return it.
   - Derive `links`: when `hasMore`, `loadedLinks.filter(l => l.moved_to_end_at === null)`; otherwise `movedLinksLast(loadedLinks)`.
   - `useLinks` returns `loadedLinks` too.

   Tests in `tests/hooks/links/list/useLinkListQuery.test.ts`:
   - with `hasMore` true, a link whose `moved_to_end_at` was set via `setRawLinks` is missing from `links` but present in `loadedLinks`, and `totalCount`/`unreadCount` are unchanged;
   - after the last page loads, it is at the end of `links`;
   - several held-back links appear oldest move first;
   - a page-1 link that came from the server already moved (`moved_to_end_at` set) is held back while `hasMore` is true;
   - with `hasMore` false from the start, a moved link is at the end of `links` immediately;
   - the same holds for Branch B (alphabetical sort or a text search).
2. **Use `loadedLinks` for the bookkeeping in `useLinkList`.**
   - Point the "left list" effect, `lastMovedLink` and `rememberMoveTitle` at `loadedLinks`, as listed in the Data model.

   Tests in `tests/hooks/links/list/useLinkList.test.ts` (fake timers, a mocked `getLinksPage` with more than one page):
   - open a page-1 link and advance 30 s → it is gone from `links`, and `lastMovedLink` still points at it;
   - `handleUndoMove()` → it is back in `links` at its old index, and `markLinkMovedToEnd(id, null)` was called;
   - `loadMore()` until `hasMore` is false → the moved link is the last item of `links`;
   - the next page's links come right after the remaining page-1 links (the reported bug).
3. **Grid empty state.** In `app/dashboard/link/LinkGrid.tsx`, show the empty states only when `results.length === 0 && !hasMore`. When the list is empty but `hasMore` is true, render the (empty) grid plus the sentinel, so the next page loads.

   Tests in a new `tests/app/dashboard/link/LinkGrid.test.tsx` (mocked context):
   - `links: []`, `hasMore: true` → no "No links match the current filters." text, and the sentinel is rendered;
   - `links: []`, `hasMore: false` → the empty state shows as today.
4. **Docs.** In CLAUDE.md feature #5, after "its card moves to the end of the loaded list", add: while more pages are left to load, moved links (`moved_to_end_at` set) are held back from the displayed list. They show at the very end, oldest move first, once the last page has loaded (`links` vs `loadedLinks` in `useLinkListQuery`). Held-back links still count in the header and can still be undone.

## Acceptance criteria

- [ ] With more than 40 links, opening a page-1 link makes its card disappear from the list 30 s later.
- [ ] After opening and moving several page-1 links, scrolling down shows the remaining page-1 cards and then page-2 cards, with no opened card between them.
- [ ] After scrolling until no pages are left, the moved cards are at the very bottom, oldest move first.
- [ ] That bottom order matches the order after ↻ / reload.
- [ ] With 40 or fewer matching links, a moved card goes to the bottom visibly (no change from today).
- [ ] The header `N links (M unread)` does not change when a card is moved and held back.
- [ ] The `Undo` button still appears after a held-back move, and hovering it shows `Move <that link's title> back`.
- [ ] Pressing `Undo` brings the card back where it was before the move.
- [ ] Moving all 40 cards of page 1 shows no empty-state message, and page 2 loads.
- [ ] The same behavior holds with a text search and with alphabetical sort.
- [ ] Scrolling through every page after several moves shows each link exactly once.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** Hold moved cards back from the displayed list while pages remain, and show them once the last page has loaded. The user chose to take moved cards out of the list and keep them hidden until the last page. This puts them at the real end, as the user expected.
- **No:** Insert later pages above moved cards while still rendering them at the bottom. The moved cards would still be reachable mid-scroll, and inserting above them can make the viewport stick on them.
- **No:** Keep moved cards out until ↻ / reload. They would never be at the end of a fully scrolled list, which disagrees with the order after a refresh.
- **Yes:** The rule is `moved_to_end_at !== null`, not only "moved this session". The server already sends earlier moves last. The same rule means a page boundary that lands inside them can't show them early.
- **Yes:** Held-back cards still count in `N links (M unread)`. They still match the filter and weren't deleted. This was the user's choice.
- **Yes:** Undo keeps working for a held-back card. This was the user's choice. That's why held-back links stay in `rawLinks` and `useLinkList` checks `loadedLinks`, not `links`.
- **Yes:** Both branches (server sort and Branch B search / alphabetical). One rule everywhere, as in SPEC 15.
- **Yes:** Hide in a derived value (`links` vs `loadedLinks`), with no change to `usePaginatedQuery` or the mutations. It is the smallest change, and offsets, dedupe and counts keep working as they are.
- **Yes:** Numbered 21, not 20. The branch name `spec-20-move-to-end-debug-logs` is already used in git history.

## Risks

| Risk | Mitigation |
| --- | --- |
| The opened card (with the "Last opened" ring) vanishes from view after 30 s on long lists | Accepted. That is the point of the move, and `Undo` brings it back. |
| A displayed list made only of held-back links shows an empty state and stops loading | Empty states only show when `!hasMore`. The sentinel stays rendered (step 3). |
| A page loads only held-back links, so nothing new appears and the sentinel stays in view | The sentinel observer is re-created when `loadingMore` toggles, so it fires again and loads the next page. |
| Branch B's candidate cache keeps the old `moved_to_end_at` for a moved link | The cached order is unchanged, so slicing doesn't skip anything. `loadMore` drops the already-loaded id, so the moved copy in `rawLinks` wins. |
| Code that should see every loaded link reads `links` | `useLinkList` bookkeeping moves to `loadedLinks`, and step 2's tests cover the Undo slot and the move timers. |

## What is **not** in this spec

- Rendering moved cards below later pages instead of holding them back.
- A "N opened links at the end" indicator.
- Repositioning a card set back to Unread.
- Changes to SPEC 15 / 16 timing, pausing or Undo.
- Fixing the Branch B cache's stale `moved_to_end_at`.
- Any DB / RPC change.

Each one of those, if it lands, goes in its own spec.
