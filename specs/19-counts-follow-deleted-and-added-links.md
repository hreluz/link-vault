# SPEC 19 — Header counts follow deleted and added links

> **Status:** Approved
> **Depends on:** none (follows up the unread count in the list header, added on branch `spec-19-unread-count` without a spec)
> **Date:** 2026-10-26
> **Objective:** The list header's `N links (M unread)` drops at once when a loaded link is deleted or leaves the list, comes back on Undo, and goes up when a new link is added, with no refetch.

## Why this spec exists

The header reads `N links (M unread)`. The database counts are already right: `filtered_links` only returns `deleted_at is null` rows. The bug is in the client.

`useLinkListQuery` corrects the server's `unread_count` for loaded links whose status changed since they were fetched. It does this by walking `rawLinks`. A deleted link is removed from `rawLinks`, so it is never walked, and its "unread" is never taken off. The count stays too high until ↻ or a reload.

`N links` has the same problem: it is the server's `total_count` with no correction at all. A link added with "+ Add link" is missing from both counts, which is the same bug in the other direction.

## Scope

**In:**

- **Both counts** in `LinkListHeader`: `totalCount` (`N links`) and `unreadCount` (`(M unread)`).
- **When a loaded link leaves `rawLinks`**, both counts drop at once. That covers:
  - single delete (🗑 on the card, swipe-to-delete), during the 2 s undo window;
  - bulk delete (only the links really removed; favorites it skips stay counted);
  - a link pruned because it no longer matches the active filters after an edit, status change or favorite toggle (`pruneIfMismatched`).
- **When it comes back** (Undo on the toast, a `blocked`/`error` delete result, a bulk delete rollback), the counts go back up.
- **When a new link is added** to `rawLinks` (`handleCreate`, which only adds it when it matches the current filters), `N` goes up by 1, and `M` goes up by 1 if the link is unread.
- **Status changes keep working** as today (unread → watching lowers `M` by 1, and so on).
- **The adjustment is local:** no extra RPC or refetch. ↻, a filter change, or a reload replaces everything with fresh server counts.
- **"Select all N"** in `BulkActionToolbar` and the "all selected" check read the same `totalCount`, so they use the corrected value too.
- Tests and a CLAUDE.md update.

**Out of scope (for future specs):**

- Re-asking the server for counts after each change.
- Links changed outside this list (Trash restore, import, another tab or device). Those still show up only after ↻ or a reload.
- The existing race where `loadMore` can bring back a link that is in its 2 s undo window. This spec doesn't change it.
- Any change to the database or the `search_links` RPC.
- When the `(M unread)` part is shown (still only with no status filter).

## Data model

No database change.

`usePaginatedQuery` (`lib/hooks/shared/usePaginatedQuery.ts`) also keeps the items exactly as fetched, before any local `setItems` change. It stays domain-agnostic:

```ts
type PageState<T, M> = {
  items: T[]          // what callers see and mutate via setItems
  fetchedItems: T[]   // as returned by fetchPage: replaced on page 1 / refresh, appended on loadMore
  // ...existing fields
}

export type PaginatedQuery<T, M = undefined> = {
  // ...existing fields
  fetchedItems: T[]
}
```

`setItems` never touches `fetchedItems`. The existing `requestId` stale guards apply to both, so they always describe the same fetch.

`useLinkListQuery` (`lib/hooks/links/list/useLinkListQuery.ts`) derives both counts by comparing `rawLinks` with `fetchedItems`. It drops today's `fetchedStatuses` state.

```
fetched  = fetchedItems by id
current  = rawLinks by id

totalCount  = server totalCount
            − (fetched ids not in current)
            + (current ids not in fetched)

unreadCount = meta.unreadCount
            + Σ over fetched ids: [current is unread] − [fetched is unread]   (absent counts as not unread)
            + (current links not in fetched that are unread)
```

Both are clamped at 0. `hasMore` still comes from the server count and the number of fetched rows (`fetchedCount < server totalCount`), so pagination doesn't change.

## Implementation plan

1. **`fetchedItems` in `usePaginatedQuery`.**
   - Set it next to `items` on the page-1 load and on `refresh`. Append the page on `loadMore`: the whole page, including ids it drops from `items` as already loaded, de-duplicated by id. Clear it on a params reset.
   - Expose it.
   - Keep `hasMore` as it is.

   Tests in `tests/hooks/shared/usePaginatedQuery.test.ts`:
   - `fetchedItems` matches the first page;
   - it grows on `loadMore` and is replaced on `refresh`;
   - `setItems` changes `items` but not `fetchedItems`;
   - a stale refresh doesn't change it.
2. **Corrected counts in `useLinkListQuery`.**
   - Replace the `fetchedStatuses` state and the `rawLinks.reduce` with the formulas in Data model.
   - Return the corrected `totalCount` and `unreadCount`.
   - `hasMore` is passed through unchanged.

   Tests in `tests/hooks/links/list/useLinkListQuery.test.ts`:
   - removing an unread loaded link lowers both counts by 1, and removing a read one lowers only `totalCount`;
   - putting it back restores both;
   - adding a new unread link raises both, and a new read link raises only `totalCount`;
   - the existing status-change tests still pass;
   - `hasMore` doesn't change when a link is removed;
   - after `refresh`, the counts are the server's again.
3. **Wiring check.** Nothing to change in `useLinks`, `useLinkList` or `LinkListHeader`, which already pass `totalCount`/`unreadCount` through.

   Add tests in `tests/hooks/links/list/useLinkList.test.ts` against the composed hook:
   - `handleDeleteById` on an unread link lowers `totalCount` and `unreadCount` at once;
   - clicking the toast's undo puts them back;
   - `handleCreate` with an unread link raises both.
4. **Docs.** In CLAUDE.md's "Link list pagination" note on the header counts, say that both counts follow loaded links that are removed, restored or added, with no refetch, and that changes made outside the list show up after ↻.

## Acceptance criteria

- [ ] With no filters, deleting an unread link from its card changes the header from `N links (M unread)` to `N−1 links (M−1 unread)` right away.
- [ ] Deleting a read link changes only `N`, to `N−1`.
- [ ] Pressing the undo toast after a delete puts both numbers back.
- [ ] Bulk-deleting 3 unread links, when 1 of the selected links is a favorite and is skipped, lowers `N` and `M` by exactly the number really deleted.
- [ ] Adding a new link (status Unread) raises `N` and `M` by 1.
- [ ] Opening an unread link still lowers `M` by 1 and leaves `N` unchanged.
- [ ] After deleting a link and pressing ↻, the header shows the same numbers it showed before ↻.
- [ ] Scrolling to the end still loads every remaining page after a delete (pagination unaffected).
- [ ] `npm test` passes, including the new tests.

## Decisions

- **Yes:** fix `N links` and `(M unread)` together, so the two numbers always agree. **No:** fixing only the unread count.
- **Yes:** the counts drop the moment the card disappears and come back on Undo or a failed delete. **No:** waiting the ~2 s until `deleteLink` succeeds; the header would disagree with the list on screen.
- **Yes:** adjust locally by comparing `rawLinks` with the fetched items. It needs no network calls and extends the status adjustment already there. **No:** refetching counts after each change; that adds an RPC per change and lags behind the UI.
- **Yes:** `fetchedItems` lives in `usePaginatedQuery`, under the same stale guards as `items`. A per-fetch map kept in `useLinkListQuery` could drift from the items after a stale or reset fetch. **No:** extending today's `fetchedStatuses` map.
- **Yes:** new links count too. Otherwise "+ Add link" leaves both counts one short until refresh.
- **Yes:** `hasMore` keeps using the server count. The adjusted total would make pagination stop one page early after a delete.

## Risks

| Risk | Mitigation |
| --- | --- |
| A link removed and then returned by `loadMore` counts twice or not at all | Ids are de-duplicated in `fetchedItems` and compared by id, so each id contributes at most once. A test covers a repeated id. |
| Corrected `totalCount` feeds "Select all N" while the server cap or the matching set differs | "Select all" already re-reads ids from the server (`getMatchingLinkIds`). Only the label number changes. |
| A count going negative because of a race | Both counts are clamped at 0. |

## What is **not** in this spec

- A server refetch of the counts.
- Syncing changes made outside the list (Trash, import, other tabs).
- Any database or RPC change.

Each one of those, if it lands, goes in its own spec.
