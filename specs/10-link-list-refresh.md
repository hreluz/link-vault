# SPEC 10 — Refresh button for the link list

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-10-18
> **Objective:** Add a ↻ button to the Links tab header that reloads links, tags and categories in place, without a page reload and without re-asking for the vault password.

## Why this spec exists

The dashboard link list loads once and then only changes through this tab's own mutations. Links saved from another device or tab, or by an import, don't appear until the page reloads. A page reload wipes the in-memory vault key (`VaultContext`), so the user must type their password again. It also re-locks unlocked private tags. The only way to see fresh data today costs a password prompt.

## Scope

**In:**

- **A refresh button** in `LinkListHeader`, left of `Select`.
  - It is an icon-only ↻ button with `aria-label="Refresh links"`, styled as the secondary/ghost button (same classes as `Select`).
  - It is shown only in the normal header. The selection-mode header (`N selected` + Cancel) has no refresh button.
  - While a refresh runs, the icon spins (`animate-spin`), the button is disabled, and `aria-busy="true"` is set.
- **What a refresh reloads:**
  - the link list's page 1 (40 links) with the current filters, search, sort and favorites mode;
  - the Branch B candidate cache in `useLinkListQuery` is dropped, so search and alphabetical sort re-fetch and re-decrypt;
  - the private tag ids (`getPrivateTagIds`);
  - the tags cache (`refetchTags()` from `TagsContext`);
  - the categories shown on cards and filter chips (`useCategoryList` in `LinkGrid` and `ActiveFilterChips`).
- **Loading UX.** The current cards and count stay visible during the refresh. There is no skeleton. When page 1 arrives it replaces the list in place, and `totalCount` updates.
- **Pagination.** Extra pages already loaded by infinite scroll are dropped. The list is back to page 1. Scroll position is not changed.
- **Feedback.**
  - Success is silent: the list and count update and the icon stops spinning.
  - Failure keeps the current list and count, stops the spinner, and shows the toast `Failed to refresh links` (`destructive`).
- **Never touched by a refresh:** the vault key (`VaultContext`), unlocked private tags (`UnlockedTagsContext`), filters, search text, sort and favorites mode.
- **Race safety.** If a filter changes while a refresh is in flight, the refresh's result is discarded. The filter change's own fetch wins.
- Tests for the paginated hook, the list query hook, the category hook, the composed list hook and the header button.

**Out of scope (for future specs):**

- Pull-to-refresh gesture on mobile.
- Automatic refetch on tab focus (`visibilitychange`) or on an interval.
- Realtime updates (Supabase subscriptions).
- Refresh buttons on other pages (Organize, Trash).
- Reloading every page already loaded to keep the user's place.
- Scrolling to top after a refresh.
- A success toast.
- Error handling for the normal first load and filter-change fetches in `usePaginatedQuery` (they still have none).

## Data model

No persisted data. In-memory API changes only:

```ts
// lib/hooks/shared/usePaginatedQuery.ts
export type PaginatedQuery<T> = {
  // ...existing: items, setItems, totalCount, hasMore, loading, loadingMore, loadMore
  /** Refetches page 1 with the current params, keeping current items visible until it resolves. Rejects if the fetch fails. */
  refresh: () => Promise<void>
  refreshing: boolean
}
```

```ts
// lib/hooks/links/list/useLinkListQuery.ts — new return values
refresh: () => Promise<void>   // drops contentCacheRef, re-reads private tag ids, then calls the paginated refresh
refreshing: boolean
```

```ts
// lib/hooks/categories/useCategoryList.ts
useCategoryList(reloadKey?: number)   // refetches whenever reloadKey changes; default 0
```

```ts
// lib/hooks/links/list/useLinkList.ts — new return values (exposed via LinkListContext)
refreshing: boolean
refreshKey: number               // bumped on every successful refresh; passed to useCategoryList
handleRefresh: () => void        // runs the refresh, refetchTags(), bumps refreshKey, toasts on failure
```

## Implementation plan

1. **Paginated refresh.** In `lib/hooks/shared/usePaginatedQuery.ts`:
   - add `refreshing` to the page state and `refresh()` to the return value;
   - `refresh()` sets `refreshing`, takes a new request id, and fetches page 1 with the current params;
   - on success it replaces `items`, `fetchedCount` and `totalCount` and clears `refreshing`, unless the request id is stale;
   - on failure it clears `refreshing`, keeps the state, and rethrows;
   - a params change during a refresh clears `refreshing` (via the existing reset).

   Tests in `tests/hooks/shared/usePaginatedQuery.test.ts`:
   - after `loadMore`, `refresh` leaves exactly page 1 with the new `totalCount`;
   - items stay visible and `loading` stays false while refreshing; `refreshing` is true;
   - a failed fetch keeps the old items, clears `refreshing` and rejects;
   - a params change during the refresh discards its result.
2. **List query refresh.** In `lib/hooks/links/list/useLinkListQuery.ts`:
   - add `refresh()` that sets `contentCacheRef.current = null`, re-reads `getPrivateTagIds()`, then awaits the paginated `refresh()`;
   - return `refresh` and `refreshing`; pass them through `useLinks`.

   Tests in `tests/hooks/links/list/useLinkListQuery.test.ts`:
   - with a text search active, `refresh` calls `getMatchingLinkIds`/`getLinksByIds` again;
   - `refresh` calls `getPrivateTagIds` again.
3. **Category reload key.** In `lib/hooks/categories/useCategoryList.ts`, add the optional `reloadKey` argument to the effect's dependencies. Existing callers keep working.

   Test: changing `reloadKey` calls `getCategories` again (new or existing test file under `tests/hooks/categories/`).
4. **Composed handler.** In `lib/hooks/links/list/useLinkList.ts`:
   - add `refreshKey` state and `handleRefresh()`;
   - `handleRefresh` ignores calls while `refreshing`, calls `refetchTags()` from `useTagsContext`, awaits the list `refresh()`, then bumps `refreshKey`;
   - on failure it shows `addToast('Failed to refresh links', 'destructive')`;
   - return `refreshing`, `refreshKey` and `handleRefresh`.

   Pass `refreshKey` to `useCategoryList` in `LinkGrid.tsx` and `ActiveFilterChips.tsx`.

   Tests in `tests/hooks/links/list/useLinkList.test.ts`:
   - `handleRefresh` calls `refetchTags` and the list refresh;
   - a failed refresh shows the destructive toast;
   - filters and `UnlockedTagsContext` are unchanged after a refresh.
5. **Header button.** In `app/dashboard/link/LinkListHeader.tsx`:
   - add the ↻ button (inline SVG, as in `LinkCard.tsx`) left of `Select` in the normal header only;
   - wire `onClick={handleRefresh}`, `disabled={refreshing}`, `aria-busy={refreshing}`, and `animate-spin` on the icon while refreshing;
   - include dark-mode pairs as on `Select`.

   Tests in a new `tests/components/LinkListHeader.test.tsx` (mocked `LinkListContext`):
   - the button renders with `aria-label="Refresh links"` and calls `handleRefresh` on click;
   - it is disabled with `aria-busy="true"` while `refreshing`;
   - it is absent in selection mode.
6. **Docs.** In CLAUDE.md, add one clause to the "Link list pagination" section: a ↻ button in the list header reloads page 1, the tags cache and categories in place, keeping the vault unlocked.

## Acceptance criteria

- [ ] The Links tab header shows a ↻ button with `aria-label="Refresh links"` next to `Select`.
- [ ] A link added from a second browser tab appears in the first tab after clicking ↻, and the count goes up by one.
- [ ] Clicking ↻ never shows the vault-locked screen or a password prompt.
- [ ] Private tags unlocked before the refresh are still unlocked after it, and their links stay visible.
- [ ] A tag created in another tab appears in tag autocomplete after clicking ↻.
- [ ] A category renamed in another tab shows its new name on cards after clicking ↻.
- [ ] With a text search active, a link added elsewhere that matches the search appears after clicking ↻.
- [ ] While refreshing, the existing cards stay visible (no skeleton), the icon spins, and the button is disabled.
- [ ] After scrolling to load more than 40 links, clicking ↻ leaves at most 40 links loaded, and infinite scroll still loads more.
- [ ] Filters, search text, sort and the All/Favorites mode are the same before and after a refresh.
- [ ] With the network offline, clicking ↻ keeps the current list and shows the toast `Failed to refresh links`.
- [ ] In selection mode the ↻ button is not shown.
- [ ] The button renders in light and dark mode, and the header fits at 375 px with no horizontal scroll.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** A header button. It works the same on desktop and mobile and is easy to test.
- **No:** Pull-to-refresh. It needs gesture code that can clash with `SwipeableCard` and the browser's own pull-to-reload.
- **No:** Auto-refresh on tab focus. It can be added later; an explicit button is enough to fix the password-prompt problem.
- **Yes:** Reload links, tags and categories together. Fresh links can reference tags or categories this tab has never seen.
- **Yes:** Keep the list visible and spin the icon. A skeleton flash on every refresh feels like a page reload.
- **Yes:** Back to page 1, filters kept, scroll untouched. Reloading every loaded page costs more requests and decryption.
- **Yes:** A new `refresh()` in the generic `usePaginatedQuery`, not a fake params change. The params-change path resets to the skeleton, and other future paginated lists (Trash) can reuse `refresh()`.
- **Yes:** A `reloadKey` argument on `useCategoryList`. Each component owns its own copy of the list, and a key is the smallest change that refreshes the long-lived ones. Modals fetch on mount, so they are fresh already.
- **No:** Moving categories into a shared context. Bigger change than this feature needs.
- **Yes:** Hide the button in selection mode. A refresh could remove links whose ids are selected.
- **Yes:** Silent success, toast on failure. Wording follows the existing `Failed to …` toasts.
- **Yes:** Never touch `VaultContext` or `UnlockedTagsContext`. Avoiding the password prompt is the point of the feature.

## Risks

| Risk | Mitigation |
| --- | --- |
| A refresh resolves after a filter change and shows links for the old filters | The refresh takes a request id; a params change bumps it, and stale results are discarded. |
| An optimistic mutation in flight is overwritten by refreshed data | The server already has the mutation or will shortly; a second refresh shows the final state. Accepted. |
| Repeated clicks fire overlapping fetches | The button is disabled while refreshing, and `handleRefresh` ignores calls while `refreshing`. |
| Refreshed tag/category data is still stale in an open modal | Modals load on open; closing and reopening shows fresh data. Accepted. |

## What is **not** in this spec

- Pull-to-refresh.
- Auto-refresh on focus or interval.
- Realtime subscriptions.
- Refresh on Organize or Trash.
- Keeping all loaded pages or scrolling to top.
- A success toast.
- Error handling for first-load and filter-change fetches.

Each one of those, if it lands, goes in its own spec.
