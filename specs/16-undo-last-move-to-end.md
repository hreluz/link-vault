# SPEC 16 — Undo the last move-to-end from the list header

> **Status:** Approved
> **Depends on:** SPEC 15
> **Date:** 2026-10-25
> **Objective:** After an opened link's card moves to the end of the list (SPEC 15), an "Undo" button in the list header puts the most recently moved card back where it was and restores its saved `moved_to_end_at`, so a refresh keeps it there.

## Why this spec exists

SPEC 15 moves an opened card to the end 30 s after it is opened, silently. Sometimes the user opens a link only for a quick look and wants it to stay where it was. Today the only way back is setting it to Unread, which also changes its status. The user wants a one-press undo for the last move.

## Scope

**In:**

- **The button:**
  - a ghost button in `LinkListHeader`, to the left of ↻, with a ↶ icon and the text `Undo`;
  - `aria-label="Undo last move"`, `title="Move <title> back"` (the link's decrypted `title`, or its URL when there is no title);
  - shown only when there is a move to undo; not shown in selection mode (the selection header replaces the normal one, as today);
  - disabled (`disabled:opacity-60`) while the undo is being saved.
- **What counts as "the last move":** the most recent move of SPEC 15 whose save succeeded (`markLinkMovedToEnd` returned true). A failed move, which already rolls back, never fills the slot.
- **One slot only.** A new successful move replaces it. After an undo the slot is empty and the button disappears.
- **What undo does:**
  - the card goes back to the index it had in the loaded list just before the move (clamped to the list length);
  - its `moved_to_end_at` goes back to the value it had before the move (`null`, or the earlier time if it had been moved before), on screen and in the DB;
  - after a refresh it sits where that value puts it (its normal place when `null`);
  - the status is not touched (an Unread → Watching from the open stays);
  - if that link has a pending SPEC 15 timer (it was reopened after moving), the timer is cancelled;
  - the "Last opened" ring and pill stay on the card.
- **On failure** (the DB update errors): the card goes back to the end with the moved `moved_to_end_at`, the toast `Failed to undo move` (`destructive`) shows, and the slot is kept so the user can retry.
- **No success toast.** The card visibly returns.
- **The slot is dropped (button disappears, nothing saved):**
  - any filter, search, sort or All/Favorites change (`filterParams` changes);
  - ↻ Refresh (`handleRefresh`) or a page reload (the slot is in memory only);
  - the link leaves the loaded list (deleted, or pruned by a status/favorite change that no longer matches the filter).
- **Infinite scroll stays consistent:** a saved undo shifts the server order back by one, so it calls `shiftServerOffset(+1)` (the opposite of the move's `-1`).
- Tests for the mutation, the composition in `useLinkList` and the header button, plus a CLAUDE.md note in feature #5.

**Out of scope (for future specs):**

- Undoing more than the last move (a history / stack).
- A toast with "tap to undo" when the move happens.
- A keyboard shortcut (e.g. Ctrl/Cmd+Z).
- Undoing a pending move before its 30 s end (cancelling a timer by hand).
- Reverting the Unread → Watching status set on open.
- A time limit on the undo.
- Remembering the slot across page loads.
- A "Reset order" action that clears every mark (still deferred from SPEC 15).

## Data model

No DB change. `moved_to_end_at` from SPEC 15 is reused; undo writes its previous value through the existing `markLinkMovedToEnd`, widened to accept `null`.

```ts
// lib/services/links.ts — signature widened, body unchanged
/** Sets moved_to_end_at to `at` (ISO string, or null to clear); true on success. */
export async function markLinkMovedToEnd(id: string, at: string | null): Promise<boolean>
```

```ts
// lib/hooks/links/list/useLinkMutations.ts
interface LastMove {
  id: string
  index: number                    // index in rawLinks just before the move
  previousMovedAt: string | null   // moved_to_end_at before the move
  movedAt: string                  // moved_to_end_at set by the move
}

// options (4th parameter) gains:
{ onMovedToEnd: () => void; onMoveUndone: () => void }   // useLinks wires onMoveUndone to shiftServerOffset(+1)

// new return values:
lastMove: LastMove | null
undoingMove: boolean
handleUndoMove: () => Promise<boolean>   // true when the undo was saved
clearLastMove: () => void
```

```ts
// lib/hooks/links/list/useLinkList.ts — new return values (flow into LinkListContext)
lastMovedLink: LinkWithTags | null   // the loaded link for lastMove.id, for the button's title
undoingMove: boolean
handleUndoMove: () => void
```

## Implementation plan

1. **Service.** Widen `markLinkMovedToEnd`'s `at` to `string | null` in `lib/services/links.ts`. No behavior change.
2. **Record the last move.** In `useLinkMutations`:
   - add `lastMove` state (`null`);
   - in `handleMoveToEnd`, on a successful save, set `lastMove` to `{ id, index, previousMovedAt, movedAt: at }` before calling `onMovedToEnd()`;
   - a failed move leaves `lastMove` unchanged;
   - add `clearLastMove()`.

   Tests in `tests/hooks/links/list/useLinkMutations.test.ts`:
   - a successful move sets `lastMove` with the old index and old `moved_to_end_at`;
   - a failed move leaves it `null`;
   - a second move replaces it.
3. **Undo mutation.** In `useLinkMutations`, add `handleUndoMove()`:
   - no-op returning false if `lastMove` is null or its id is not in `rawLinks`;
   - set `undoingMove` true;
   - optimistically move the link to `Math.min(index, rest.length)` with `moved_to_end_at: previousMovedAt`;
   - await `markLinkMovedToEnd(id, previousMovedAt)`;
   - on success: clear `lastMove`, call `onMoveUndone()`, return true;
   - on failure: put the link back at the end with `moved_to_end_at: movedAt`, keep `lastMove`, show `addToast('Failed to undo move', 'destructive')`, return false;
   - set `undoingMove` false in both cases.

   `useLinks` passes `onMoveUndone: () => shiftServerOffset(1)` and returns the four new values.

   Tests:
   - undo puts a moved link back at its old index and saves `previousMovedAt` (null and non-null cases);
   - success clears `lastMove` and calls `onMoveUndone`;
   - failure puts it back at the end, keeps `lastMove`, shows the toast, doesn't call `onMoveUndone`;
   - no `lastMove` → no service call.
4. **Composition.** In `lib/hooks/links/list/useLinkList.ts`:
   - `handleUndoMove`: read `lastMove.id`, remove it from `pendingMoveIdsRef` and `cancelMove(id)`, then call the mutation's `handleUndoMove()`;
   - `cancelPendingMoves()` (↻) and the `filterKey` effect also call `clearLastMove()`;
   - the effect on `links` also calls `clearLastMove()` when `lastMove.id` is no longer loaded;
   - derive `lastMovedLink` from `links` and return it with `undoingMove` and `handleUndoMove`.

   Tests in `tests/hooks/links/list/useLinkList.test.ts` (fake timers):
   - open a link, advance 30 s, `handleUndoMove()` → the link is back at its old index and `markLinkMovedToEnd(id, null)` was called; its status stays `watching`;
   - move, reopen, undo, advance 30 s → it does not move again;
   - a filter change, `handleRefresh`, or deleting the link clears `lastMovedLink`.
5. **Header button.** In `app/dashboard/link/LinkListHeader.tsx`:
   - read `lastMovedLink`, `undoingMove`, `handleUndoMove` from `useLinkListContext()`;
   - when `lastMovedLink` is set, render the ghost button (same classes as ↻, `px-3`) with an inline ↶ SVG and `Undo`, `aria-label`/`title` as in Scope, `disabled={undoingMove}`.

   Tests in a new `tests/app/dashboard/link/LinkListHeader.test.tsx` (or the existing header test if one exists), with a mocked context:
   - hidden when `lastMovedLink` is null;
   - shown with `aria-label="Undo last move"` and the link's title in `title`;
   - click calls `handleUndoMove`; disabled while `undoingMove`.
6. **Docs.** In CLAUDE.md feature #5, after the move-to-end sentence: an `Undo` button in `LinkListHeader` restores the last saved move (old position and previous `moved_to_end_at`, status untouched, cancels that link's pending timer; `handleUndoMove` in `useLinkMutations`, composed in `useLinkList`); one slot only, dropped on filter/sort/search change, ↻, reload, or the link leaving the list; a failed undo shows `Failed to undo move`.

## Acceptance criteria

- [ ] No `Undo` button shows on a fresh dashboard load.
- [ ] 30 s after opening a link, its card moves to the end and an `Undo` button appears next to ↻.
- [ ] Hovering the button shows `Move <that link's title> back`.
- [ ] Pressing `Undo` puts the card back at the position it had before the move, and the button disappears.
- [ ] After pressing `Undo` and refreshing, a link that had never been moved before is in its normal place (not at the end).
- [ ] Undoing the second move of a link that had been moved once before puts it back where the first move left it, also after a refresh.
- [ ] The link's status after undo is the same as before pressing it (an auto Unread → Watching stays Watching).
- [ ] Moving A then B leaves `Undo` pointing at B; pressing it restores B only, and A stays at the end.
- [ ] Reopening a moved link and pressing `Undo` before 30 s: the card returns and does not move again after 30 s.
- [ ] Changing a filter, search, sort or All/Favorites mode, clicking ↻, or reloading hides the `Undo` button.
- [ ] Deleting the moved link hides the `Undo` button.
- [ ] In selection mode the `Undo` button is not shown.
- [ ] With the network offline, pressing `Undo` leaves the card at the end, shows `Failed to undo move`, and the button stays.
- [ ] Rapid double-click on `Undo` triggers a single save.
- [ ] After a move and an undo, scrolling to load all pages shows every link exactly once.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** A header button next to ↻. The move is silent and can happen while the tab is hidden, so a short toast would often be missed. **No:** a "tap to undo" toast at move time; it would also reverse SPEC 15's "no success toast" decision.
- **Yes:** One slot, the last move only. The user asked for "the last one". **No:** a history stack; deferred.
- **Yes:** Restore both position and the saved `moved_to_end_at`. An undo that a refresh silently reverts would be misleading. **No:** in-memory only.
- **Yes:** Restore the previous `moved_to_end_at` value, not always `null`. A link moved twice goes back to where its first move left it, which matches the screen.
- **No:** Revert the Unread → Watching status. The link was opened; undo is only about order.
- **Yes:** Drop the slot on filter/search/sort change, refresh, reload, or the link leaving the list. The saved index is meaningless once the list is rebuilt. **No:** a time limit.
- **Yes:** Undo cancels that link's pending move timer. Otherwise the card would jump away again 30 s later.
- **Yes:** Icon plus `Undo` text. A button that appears and disappears needs a visible label.
- **No:** Success toast. Only failure shows one, like the move.
- **Yes:** On failure, keep the slot so the user can retry.
- **Yes:** Reuse `markLinkMovedToEnd` with `at: string | null` instead of a new service. Same single-column update.
- **Yes:** `shiftServerOffset(+1)` on a saved undo, mirroring the move's `-1`.
- **Yes:** Undo state and mutation in `useLinkMutations`; slot clearing and timer cancel in `useLinkList`. Cross-concern coordination belongs in the composing hook ("Splitting overloaded hooks").

## Risks

| Risk | Mitigation |
| --- | --- |
| The stored index is stale when other cards moved or were removed after the move | Clamped to the list length; the card lands close to where it was. After a refresh the DB order is exact. |
| Undo shifts the server order under offset pagination | `shiftServerOffset(+1)` per saved undo, and `loadMore` already drops duplicate ids (SPEC 15). At worst one link appears only after a refresh. |
| The user presses `Undo` while the move save is still in flight | The slot is only filled after the move's save succeeds, so the button isn't shown yet. |
| Double press saves twice | Button disabled while `undoingMove`; the slot is cleared on success. |

## What is **not** in this spec

- An undo history / stack.
- A "tap to undo" toast at move time.
- A keyboard shortcut.
- Cancelling a pending move by hand.
- Reverting the status set on open.
- A time limit, or remembering the slot across reloads.
- A "Reset order" action.

Each one of those, if it lands, goes in its own spec.
