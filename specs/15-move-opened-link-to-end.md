# SPEC 15 — Move an opened link to the end of the list after 30 seconds

> **Status:** Approved
> **Depends on:** SPEC 10
> **Date:** 2026-10-23
> **Objective:** 30 seconds after the user opens a link from the dashboard list, its card moves to the end of the list and that position is saved, so after a refresh the not-yet-opened links come first; the countdown pauses (then restarts from 30 s) while the user is editing or acting on links.

## Why this spec exists

When the user works through their links, opening one advances it from Unread to Watching (`handleLinkOpen` in `useLinkList`), but the card stays in the same place. The next link to check is below an already-opened one, and after a few opens the top of the list is full of links already seen. The user wants opened links to get out of the way on their own, with a delay long enough that a quick look back at the card (or an edit) isn't disrupted.

**Amendment (2026-10-23):** the first draft kept the move in memory only, so a refresh brought back the original order. The user wants the move tracked, so that after a refresh the list starts with links not opened yet. The move is now saved in a new `links.moved_to_end_at` column, and the list SQL sorts on it.

While working on this, a bug turned up: **single status changes are never saved.** `handleStatusChange` in `useLinkMutations` only updates the list in memory. This covers the automatic Unread → Watching on open and changes made from the ··· menu / `BottomSheet`. After a refresh those links are back to their old status. Only `bulkUpdateStatus` and the edit form write `status`. The rule "setting a link back to Unread clears the mark" needs the status to be saved, so this spec fixes it too.

## Scope

**In:**

- **Trigger:** every link opened from its card (`onOpen` → `handleLinkOpen`), whatever its status (unread, watching, read, archived), starts a 30 s timer for that link.
- **The move, at the end of the timer:**
  - the card moves to the end of the currently loaded list (`rawLinks`) right away;
  - `links.moved_to_end_at` is set to the current time in the DB;
  - pages loaded later by infinite scroll append after it as usual.
- **Order after a refresh / reload, in every sort mode (newest, oldest, status, alphabetical), with any filters, search and the All/Favorites mode:**
  - links with `moved_to_end_at = null` come first, in the normal order for the sort;
  - then moved links, by `moved_to_end_at` ascending (the most recently moved one is last).
- **Opening a moved link again** starts a new timer; when it ends, the card moves to the very end again and `moved_to_end_at` is updated to the new time.
- **If saving the move fails:** the card goes back to the position it had before the move. Its `moved_to_end_at` is restored, and the toast `Failed to move link` (`destructive`) is shown.
- **Clearing the mark:** when a link's status changes to `unread`, from any path (··· menu, edit form, bulk), a DB trigger sets `moved_to_end_at = null`. The card stays where it is on screen. After a refresh it is back in its normal place.
- **Status changes are saved (bug fix):**
  - `handleStatusChange` now calls a new `updateLinkStatus(id, status)`;
  - it stays optimistic, as today;
  - on failure the old status (and old `moved_to_end_at`) is restored, and the toast `Failed to update status` (`destructive`) is shown;
  - the existing `Moved to <Status>` toast is unchanged.
- **Several pending links:** each opened link keeps its own timer. Opening link B doesn't touch link A's timer.
- **Reopening a pending link** restarts its timer at 30 s.
- **The timer keeps running while the dashboard tab is hidden**, so after reading a link in another tab the user comes back to a list where it has already moved.
- **Pause and restart.** While any of these is true, the affected timers stop. When it ends, they restart from the full 30 s:
  - the Edit link modal is open (`editingLink !== null`) → **all** pending timers;
  - selection mode is active (`isSelectionMode`) → **all** pending timers;
  - the card's ··· menu / mobile `BottomSheet` is open for a pending link (`activeLink?.id`) → **that link's** timer only.
  - A link opened while a pause applies to it waits for the pause to end, then gets its 30 s.
- **Cancel (timer dropped, nothing saved, card stays where it is):**
  - any filter, search, sort or All/Favorites change (`filterParams` changes);
  - ↻ Refresh (`handleRefresh`);
  - the link leaves the loaded list (deleted, or pruned by a status/favorite change that no longer matches the filter). A timer that ends for a link no longer in `rawLinks` does nothing.
- **Infinite scroll stays consistent after a saved move:**
  - a saved move shifts the server order by one, so the next page's offset is corrected;
  - a link already in the list is never added twice.
- **No extra UI:** no countdown, no animation, no success toast. The "Last opened" ring and pill (`lastOpenedId`) stay on the card and move with it.
- Tests for the status fix, the move mutation, the timer hook, the client-side ordering, the pagination fixes and the composition in `useLinkList`. A CLAUDE.md note goes in feature #5 and the Link table, plus the plaintext column list in ENCRYPTION.md.

**Out of scope (for future specs):**

- A "Reset order" action that clears every mark at once.
- Carrying `moved_to_end_at` in the v2 export / import (imported links start unmoved; a v2 restore doesn't restore it).
- A visible countdown or a move animation.
- A user preference for the delay or an on/off switch.
- Moving links opened from anywhere other than the dashboard card (e.g. the edit form's "Open ↗").
- Moving the card back on screen right away when it is set to Unread.
- Auto-scrolling after a move.
- Fixing the existing order of text-search results beyond putting moved links last (Branch B candidates come back from `getLinksByIds` in `.in()` order).

## Data model

**DB — new migration `supabase/migrations/0019_link_moved_to_end.sql`:**

```sql
alter table public.links add column moved_to_end_at timestamptz null;

-- Setting a link back to Unread makes it "new" again.
create function public.clear_moved_to_end_on_unread() returns trigger
language plpgsql as $$
begin
  if new.status = 'unread' and old.status is distinct from 'unread' then
    new.moved_to_end_at := null;
  end if;
  return new;
end;
$$;

create trigger links_clear_moved_to_end_on_unread
  before update of status on public.links
  for each row execute function public.clear_moved_to_end_on_unread();
```

The same migration drops and recreates `filtered_links`, `search_links` and `search_link_ids` (same parameters as in `0010_encryption.sql`, re-granted to `authenticated`), because the return type changes:

- `filtered_links` and `search_links` also return `moved_to_end_at`;
- `search_links` orders by `f.moved_to_end_at asc nulls first` before the existing sort keys;
- `search_link_ids` orders by `f.moved_to_end_at asc nulls first, f.created_at desc`.

`authenticated` already has `update` on `links` (`0009_table_grants.sql`), so no new grant is needed. `moved_to_end_at` is plaintext, like `status` and `created_at`. It is a structural timestamp, not link content.

**TypeScript:**

```ts
// lib/types/database.ts — links Row/Insert/Update and search_links Returns
moved_to_end_at: string | null

// lib/services/links.ts
LinkRow / LinkWithTags: moved_to_end_at: string | null   // also set in createLink / updateLink return values

/** Saves the new status; true on success. */
export async function updateLinkStatus(id: string, status: LinkStatus): Promise<boolean>

/** Sets moved_to_end_at to `at` (ISO string); true on success. */
export async function markLinkMovedToEnd(id: string, at: string): Promise<boolean>
```

```ts
// lib/hooks/links/list/useMoveOpenedToEnd.ts (new)
export const MOVE_TO_END_DELAY_MS = 30_000

export function useMoveOpenedToEnd(options: {
  onMove: (id: string) => void        // called when a link's timer ends
  pausedAll: boolean                  // editingLink !== null || isSelectionMode
  pausedId: string | null             // activeLink?.id ?? null
}): {
  schedule: (id: string) => void      // start (or restart) the 30 s timer for id
  cancel: (id: string) => void
  cancelAll: () => void
}
```

```ts
// lib/hooks/links/list/useLinkListQuery.ts — new return value
shiftServerOffset: (delta: number) => void  // corrects later page offsets after a saved reorder; reset on params change / refresh

// lib/hooks/links/list/useLinkMutations.ts
// new 4th parameter: { onMovedToEnd: () => void } — called after a successful save (useLinks wires it to shiftServerOffset(-1))
handleMoveToEnd: (id: string) => void  // optimistic move + save + rollback; no-op if id absent
```

`LinkFilterParams` and the `usePaginatedQuery` API do not change.

## Implementation plan

1. **Save single status changes (bug fix).**
   - Add `updateLinkStatus(id, status)` in `lib/services/links.ts`, a single-row `update({ status })`.
   - In `useLinkMutations.handleStatusChange`:
     - keep the optimistic update and the toast;
     - when the new status is `unread`, also set `moved_to_end_at: null` locally (same as the trigger);
     - await the service;
     - on failure, restore the previous status and `moved_to_end_at` and show `addToast('Failed to update status', 'destructive')`.

   Tests in `tests/hooks/links/list/useLinkMutations.test.ts`:
   - success calls `updateLinkStatus(id, status)`;
   - failure restores the old status and shows the toast;
   - changing to `unread` clears `moved_to_end_at` locally.
2. **Migration and types.**
   - Write `0019_link_moved_to_end.sql` as in the Data model.
   - Update `lib/types/database.ts`.
   - Add `moved_to_end_at` to `LinkRow`/`LinkWithTags`, and to the explicit return objects of `createLink` and `updateLink`.
   - Add `moved_to_end_at` to the plaintext list for `links` in ENCRYPTION.md §4.

   Check locally:
   - `supabase db reset` applies cleanly;
   - `search_links` returns the column;
   - updating a row to `unread` nulls it.

   Fix test fixtures that build `LinkWithTags` objects (add `moved_to_end_at: null`).
3. **Client-side ordering (Branch B).** In `useLinkListQuery`'s `fetchPage` Branch B, after text filtering and the alphabetical sort, stably reorder so links with `moved_to_end_at = null` come first in their current order, followed by moved links by `moved_to_end_at` ascending.

   Tests in `tests/hooks/links/list/useLinkListQuery.test.ts`:
   - with alphabetical sort, unmoved links come first alphabetically, then moved ones by move time;
   - the same holds with a text search.
4. **Pagination fixes.**
   - In `usePaginatedQuery.loadMore`, drop items whose id is already in `items` before appending (still counting them in `fetchedCount`). This needs an id getter: constrain `T` to `{ id: string }`, or pass a `getId` option.
   - In `useLinkListQuery`:
     - keep a `serverOffsetShiftRef`, reset to 0 on params change and on `refresh`;
     - Branch A passes `offset + shift` to `getLinksPage`;
     - expose `shiftServerOffset`.

   Tests:
   - `usePaginatedQuery`: a page that repeats a loaded id doesn't duplicate it;
   - `useLinkListQuery`: after `shiftServerOffset(-1)`, the next `getLinksPage` call uses offset 39 instead of 40; a filter change resets it.
5. **Move mutation.** In `useLinkMutations`, add `handleMoveToEnd(id)`:
   - no-op if the id is not in `rawLinks`;
   - remember the link's index and old `moved_to_end_at`;
   - take `at = new Date().toISOString()`;
   - optimistically move the link to the end with `moved_to_end_at: at`;
   - await `markLinkMovedToEnd(id, at)`;
   - on success call `onMovedToEnd()`;
   - on failure put the link back at its old index (clamped to the list length) with its old `moved_to_end_at`, and show `addToast('Failed to move link', 'destructive')`.

   `useLinks` passes `{ onMovedToEnd: () => shiftServerOffset(-1) }` and returns `handleMoveToEnd`.

   Tests:
   - moves a middle link to the end and saves it;
   - unknown id does nothing and calls no service;
   - failure restores the position and shows the toast;
   - `onMovedToEnd` is called only on success.
6. **Timer hook.** Create `lib/hooks/links/list/useMoveOpenedToEnd.ts`:
   - keeps one pending entry per id (a `Map` in a ref) holding its `setTimeout` handle;
   - `schedule(id)` clears any existing timer for id and starts a new 30 s one. If the id is paused, it is kept pending with no timer;
   - when a timer ends, the entry is removed and `onMove(id)` is called (through a ref, so the latest callback is used);
   - when `pausedAll` turns true, all timers are cleared but the entries are kept. When it turns false, every pending entry gets a fresh 30 s timer. `pausedId` works the same way for its own entry;
   - `cancel`/`cancelAll` clear timers and remove entries. All timers are cleared on unmount.

   Tests in a new `tests/hooks/links/list/useMoveOpenedToEnd.test.ts` with fake timers:
   - `onMove` fires at 30 s, not at 29.9 s;
   - two scheduled ids fire independently at their own 30 s marks;
   - rescheduling an id at 20 s makes it fire at 50 s;
   - `pausedAll` at 20 s for 60 s → no fire; after unpause it fires 30 s later;
   - `pausedId` pauses only that id; others still fire;
   - scheduling while paused fires 30 s after the pause ends;
   - `cancel` and `cancelAll` prevent firing; unmount clears timers.
7. **Composition.** In `lib/hooks/links/list/useLinkList.ts`:
   - call `useMoveOpenedToEnd({ onMove: handleMoveToEnd, pausedAll: modals.editingLink !== null || selection.isSelectionMode, pausedId: modals.activeLink?.id ?? null })`;
   - `handleLinkOpen` also calls `schedule(id)`;
   - `handleRefresh` calls `cancelAll()` before refreshing;
   - an effect on `filters.filterParams` calls `cancelAll()`;
   - when a pending id is no longer in `links`, call `cancel(id)`.

   Tests in `tests/hooks/links/list/useLinkList.test.ts`:
   - opening a link moves it to the end of `links` after 30 s and calls `markLinkMovedToEnd`; `lastOpenedId` still points at it;
   - with `editingLink` set, it doesn't move; 30 s after closing it, it does;
   - with `activeLink` set to the link, it doesn't move; another opened link still does;
   - selection mode pauses it;
   - a filter change or `handleRefresh` before 30 s cancels the move and saves nothing.
8. **Docs.** In CLAUDE.md:
   - add `moved_to_end_at` to the Link table: `string | null`, set when the card is moved to the end after being opened; cleared by a DB trigger when status becomes `unread`;
   - in feature #5, add:
     - single status changes are saved (`updateLinkStatus`);
     - 30 s after a link is opened, its card moves to the end of the loaded list and `moved_to_end_at` is saved (`useMoveOpenedToEnd`), so unmoved links sort first after a refresh in every sort mode;
     - the countdown pauses and restarts at 30 s while the edit modal, selection mode, or that link's ··· menu is open;
     - a filter/sort/search change or ↻ refresh cancels it.

## Acceptance criteria

- [ ] Opening an Unread link, then refreshing, shows it as Watching (the status is saved).
- [ ] Changing a link's status from the ··· menu survives a refresh.
- [ ] Opening a link from its card moves that card to the end of the loaded list 30 s later, whatever its status.
- [ ] The card does not move before 30 s, and refreshing before 30 s leaves it in its normal place.
- [ ] After the move, a refresh (↻ or page reload) shows every unmoved link first, then moved links, with the most recently moved one last.
- [ ] That order holds in newest, oldest, status and alphabetical sort, and with a text search, a filter, or Favorites mode.
- [ ] Opening A, then B 10 s later: A moves at 30 s, B at 40 s; after a refresh B is after A.
- [ ] Reopening a moved link moves it to the very end again after 30 s, and it stays last after a refresh.
- [ ] Reopening a pending link restarts its 30 s.
- [ ] With the dashboard tab hidden for more than 30 s after opening a link, the card has already moved when the user comes back.
- [ ] While the Edit link modal is open (for any link), no card moves. After closing it, pending cards move 30 s later.
- [ ] While a pending link's ··· menu / bottom sheet is open, that card doesn't move, but other pending cards still do. After closing, it moves 30 s later.
- [ ] While selection mode is active, no card moves. After leaving it, pending cards move 30 s later.
- [ ] Changing a filter, search, sort or All/Favorites mode, or clicking ↻, before 30 s leaves the card where it is, and nothing is saved.
- [ ] Setting a moved link back to Unread (··· menu, edit form or bulk) puts it back in its normal place after a refresh.
- [ ] With the network offline when the 30 s end, the card returns to its previous position and the toast `Failed to move link` appears.
- [ ] A link deleted before its 30 s doesn't reappear or cause an error.
- [ ] The "Last opened" ring and pill stay on the moved card.
- [ ] After several moves, scrolling to load all pages shows every link exactly once (no duplicates, none missing).
- [ ] `supabase db reset` applies migration 0019 with no errors.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes (amended):** Save the move in the DB. The user wants a refresh to show which links are new. **No:** in-memory only, which was the first draft.
- **Yes:** Save when the 30 s move happens, not when the link is opened. The screen and the DB never disagree, and a refresh before 30 s doesn't jump the link.
- **Yes:** A `moved_to_end_at timestamptz` column, plaintext. It's structural like `status`/`created_at`. Being a timestamp also gives the order among moved links.
- **Yes:** Moved links last, oldest move first. That's the same order the screen produces without a refresh.
- **Yes:** All four sort modes, including alphabetical (client-side). One rule everywhere.
- **Yes:** Clear the mark when status becomes Unread, with a DB trigger. It covers the ··· menu, the edit form and bulk changes without each path remembering it.
- **No:** A "Reset order" action in this spec. Deferred to its own spec.
- **No:** Carry the mark in the v2 export. Order is a reading-session detail; imported links start fresh.
- **Yes:** Fix the unsaved single status change here. The Unread reset depends on it, and so does "after a refresh I know what's new".
- **Yes:** On a failed save, put the card back and show a toast. The screen should not show an order that a refresh would undo silently.
- **Yes:** Any opened link moves, not only unread → watching. One simple rule: "I opened it, push it away".
- **Yes:** One timer per opened link; reopening restarts it. This matches how the user works through the list.
- **Yes:** Keep counting while the tab is hidden. The usual flow is reading the link in another tab.
- **Yes:** Pause all timers for the edit modal (any link) and selection mode; pause only that link's timer for its ··· menu. Restart from 30 s after a pause; the user asked for this explicitly ("reset the time after it is closed").
- **Yes:** Cancel on filter/search/sort change, refresh, or the link leaving the list. The list is rebuilt in those cases, so a pending move has no meaning.
- **Yes:** Correct the next page offset and drop duplicate ids. A saved move shifts the server order under offset pagination; without the fix, the next page would skip one link and later repeat the moved one.
- **No:** Countdown, animation or success toast. A silent reorder is the smallest change.
- **Yes:** Timer logic in its own hook (`useMoveOpenedToEnd`), composed in `useLinkList`, with the reorder as a mutation in `useLinkMutations`. This follows "Splitting overloaded hooks".

## Risks

| Risk | Mitigation |
| --- | --- |
| A card jumps away while the user is about to tap it | 30 s delay, and the ··· menu / edit modal / selection mode pause it. Accepted for a plain tap on the card. |
| Offset pagination skips or repeats a link after a saved move | `shiftServerOffset(-1)` per saved move, and `loadMore` drops ids already loaded. |
| Setting a loaded link to Unread moves it back into the server order mid-session, which can push one link past the next page boundary | Accepted: duplicates are dropped; at worst one link appears only after a refresh. |
| Return type change on the RPCs breaks a caller | Parameters stay identical; only a column is added. `getLinksPage` and the `database.ts` types are updated in the same step. |
| Many pending timers | One `setTimeout` per opened link, cleared on cancel and unmount; at most a few dozen. |
| A timer ends after the list was rebuilt (refresh, filter change) | `cancelAll()` runs on both; `handleMoveToEnd` is a no-op for an id not in `rawLinks`. |
| Saving status now hits the DB on every open | One small single-row update, the same cost as the favorite toggle. |

## What is **not** in this spec

- A "Reset order" action.
- `moved_to_end_at` in export / import.
- Countdown or animation.
- A preference for the delay or an on/off switch.
- Links opened from outside the dashboard card.
- Moving a card back on screen when it's set to Unread.
- Auto-scrolling after a move.
- Fixing the order of text-search candidates beyond moved-last.

Each one of those, if it lands, goes in its own spec.
