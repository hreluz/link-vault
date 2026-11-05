# SPEC 36 — Undo the last move from the top bar

> **Status:** Approved
> **Depends on:** SPEC 16, SPEC 34
> **Date:** 2026-11-05
> **Objective:** The Undo for the last move-to-end moves from the list header to a ↶ icon button in the sticky top bar, so it's reachable at any scroll position, and a saved undo scrolls the restored card into view and pulses it.

## Why this spec exists

SPEC 16 put the Undo button in `LinkListHeader`, at the top of the list. On a phone the user is usually far down the list when a card moves to the end (SPEC 15, SPEC 25). To undo, they have to scroll all the way back up. After the undo, the card goes back to its old index, which is often off-screen, so the user can't see that it worked.

The sticky top bar (`DashboardHeader`) is always on screen, so Undo moves there.

## Scope

**In:**

- **Undo leaves the list header.** `LinkListHeader` no longer renders the Undo button. ↻ and `+` stay where they are.
- **↶ icon button in the top bar.** A new `HeaderUndoButton` (`app/dashboard/link/HeaderUndoButton.tsx`):
  - It sits in `DashboardHeader`'s right-hand group, directly left of the theme toggle (and right of the email on `sm:` and up).
  - It's icon-only at every breakpoint: the same ↶ SVG as today's Undo (`aria-hidden`), with no text.
  - It's styled like `ThemeToggleButton`: `h-11 w-11 sm:h-9 sm:w-9 rounded-xl`, the ghost border and surface colours with dark pairs, `focus-ring`, and the icon in `text-surface-600 dark:text-surface-300`.
  - `aria-label="Undo last move"`, `title="Move <displayTitle(link)> back"`, the same as today's button.
  - It renders only while there's a move to undo (`lastMovedLink` set). Otherwise there is no placeholder, and the header doesn't shift when it's absent.
  - It's disabled (`disabled:opacity-60`, `disabled:cursor-not-allowed`) while `undoingMove` is true.
  - It shows only on `/dashboard`, the page that renders the link list. Other dashboard pages never show it.
  - It has SPEC 16's lifetime unchanged. It goes away when the slot empties (undo saved, filter/sort/search change, ↻, reload, the link leaving the list). There is no time limit.
- **Header slot.** `DashboardHeader` lives in the dashboard layout, outside `LinkListContext`. Two pieces connect them:
  - A small `DashboardHeaderSlotProvider` (`lib/context/DashboardHeaderSlotContext.tsx`), mounted in `app/dashboard/layout.tsx` around the header and the page. It holds the slot element in state.
  - `DashboardHeader` renders an empty slot `<div className="contents">` and registers it through a callback ref.
  - `LinkList` renders `HeaderUndoButton`, which portals (`createPortal`) into that slot when it exists and renders nothing when it doesn't.
- **Scroll to the restored card.** After every successful undo:
  - `useLinkList.handleUndoMove` awaits `useLinkMutations`' `handleUndoMove()` (which already returns `true` when saved, SPEC 16). On `true` it sets a new `restoredLinkId: string | null`.
  - `LinkGrid` reacts to `restoredLinkId` after render. It finds the card by a new `data-link-id={link.id}` attribute on `LinkCard`'s `<article>`.
  - If the card isn't fully visible between the bottom of `DashboardHeader` and the bottom of the viewport, it calls `scrollIntoView({ block: 'center', behavior })`. `behavior` is `'smooth'`, or `'auto'` when `prefers-reduced-motion: reduce` matches. If the card is already visible, it doesn't scroll.
  - It then moves focus to the card's title link (marked `data-card-title`) with `focus({ preventScroll: true })`, because the Undo button that had focus disappears.
- **Pulse.** The restored card shows the same ring overlay the "Last opened" card uses (`ring-2 ring-inset ring-primary-500 motion-safe:animate-pulse`) for 1500 ms.
  - With reduced motion, the ring shows without the animation.
  - `LinkCard`'s overlay condition becomes just `pulse`.
  - `LinkGrid` passes `pulse={(returnPulse && isLastOpened) || link.id === restoredLinkId}`.
  - A 1500 ms timer in that same effect calls `clearRestoredLink()`, which ends the pulse. Setting state only from the timer callback keeps the `react-hooks/set-state-in-effect` lint rule happy.
  - `clearRestoredLink` is stable (`useCallback`), so the effect runs once per undo.
- **Cards clear the top bar.** Cards get `scroll-mt-20`, so a scroll that lands a card at the top doesn't hide it behind the 69px sticky header.
- **Failure.** A failed undo works as SPEC 16 says: the card stays at the end, the `Failed to undo move` toast shows, and the slot is kept, so the ↶ button stays for a retry. There is no scroll, no pulse and no focus move.
- **Tests**, one file per unit (see Implementation plan).
- **`CLAUDE.md`**: feature 5 says Undo is a ↶ icon in the top bar (not left of ↻) and mentions the scroll-to-card and pulse after a saved undo. The "Touch targets" notes mention the header slot.

**Must keep working, unchanged:**

- SPEC 16's undo semantics: old index, previous `moved_to_end_at`, `shiftServerOffset(+1)`, pending timer cancelled, one slot.
- The "Last opened" ring, pill and tab-return pulse (`useReturnPulse`).
- `DashboardHeader`'s logo scroll-to-top, theme toggle and Sign out, at every breakpoint and on every dashboard page.
- ↻ and `+` in `LinkListHeader`.

**Out of scope (for future specs):**

- Undoing more than the last move (a history/stack). SPEC 16 already rules this out.
- A "tap to undo" toast when a move happens.
- A sticky list header or a floating undo pill.
- Scroll-to-card for other actions (restore from Trash, Send to end).
- Moving ↻ or `+` into the top bar.

## Data model

No DB change and no new persisted data.

```ts
// lib/context/DashboardHeaderSlotContext.tsx
interface DashboardHeaderSlot {
  slot: HTMLElement | null                       // the header's empty slot, once mounted
  setSlot: (el: HTMLElement | null) => void      // DashboardHeader's callback ref
}

// lib/hooks/links/list/useLinkList.ts: added to the returned shape (and LinkListContext)
restoredLinkId: string | null        // set after a saved undo, cleared by LinkGrid after the pulse
clearRestoredLink: () => void        // stable (useCallback)
handleUndoMove: () => Promise<void>  // was () => void; awaits the mutation

// app/dashboard/link/HeaderUndoButton.tsx: no props.
// It reads lastMovedLink / undoingMove / handleUndoMove from LinkListContext and the slot from DashboardHeaderSlotContext.
```

## Implementation plan

1. **Header slot context.** Add `DashboardHeaderSlotProvider` and `useDashboardHeaderSlot()`, mount the provider in `app/dashboard/layout.tsx`, and render the slot `div` in `DashboardHeader` left of `ThemeToggleButton`. Tests: the slot registers, the hook throws outside the provider (or returns a null slot, matching the other contexts' pattern), and the header still renders everything it rendered before.
2. **`HeaderUndoButton`** plus `tests/components/HeaderUndoButton.test.tsx`:
   - it renders nothing without a slot or without `lastMovedLink`;
   - it portals into the slot;
   - it's icon-only with `aria-label` and `title`;
   - click calls `handleUndoMove`;
   - it's disabled while `undoingMove`;
   - it has the `h-11 w-11` touch target and `focus-ring`.
3. **Move the button.** `LinkList` renders `HeaderUndoButton`, and `LinkListHeader` drops its Undo. Update `tests/components/LinkListHeader.test.tsx`: its Undo cases are removed, and a new case checks that no Undo renders even with `lastMovedLink` set. The app works: Undo lives in the top bar and works without scroll yet.
4. **`restoredLinkId` in `useLinkList`.** `handleUndoMove` awaits the mutation, sets `restoredLinkId` on `true` and leaves it alone on `false`. Expose a stable `clearRestoredLink`. Tests in the existing `useLinkList` test file cover both cases.
5. **`LinkCard` markers.** Add `data-link-id` and `scroll-mt-20` on the `<article>` and `data-card-title` on the title link, and make the overlay condition `pulse`. Update the `LinkCard` tests: it pulses without being last-opened, and the markers are present.
6. **Scroll, focus and pulse in `LinkGrid`.** Add the effect described in Scope. Tests:
   - it scrolls when the card is off-screen and not when it's visible;
   - it uses `'auto'` under reduced motion;
   - the title gets focus;
   - the pulse shows while `restoredLinkId` is set, and `clearRestoredLink` is called at 1500 ms, not before;
   - it scrolls once across re-renders;
   - when the card isn't in the list, it only clears.
7. **`CLAUDE.md`** update.
8. **Playwright check** at 390×844 (light) and 1440×900 (dark), plus 390×844 with reduced motion:
   - Send to end on a card well down the list, then scroll further down: ↶ is visible in the top bar and absent from the list header.
   - Tap ↶: the card is back at its old index, in view, pulsing and focused, and ↶ is gone.
   - Header undo with the card already visible: the page doesn't move.
   - After a reload the order is kept.
   - On `/dashboard/organize` there is no ↶.
   - There are no console errors.

   Screenshots go in `.verification-screenshots/spec-36-header-undo-move_<date>/`. Any links the run moves get undone before it ends.

## Acceptance criteria

- [ ] With a move to undo, a ↶ icon button is visible in the top bar, left of the theme toggle, at 390×844 and at 1440×900, at any scroll position.
- [ ] `LinkListHeader` shows no Undo button, with or without a move to undo.
- [ ] With no move to undo, there's no ↶ in the top bar and the top bar's other controls don't shift.
- [ ] ↶ has no visible text, `aria-label="Undo last move"` and `title="Move <title> back"`, is 44px square on phones (36px from `sm`), and shows the `focus-ring` outline on keyboard focus.
- [ ] ↶ is disabled while an undo is saving.
- [ ] Tapping ↶ puts the card back at its old index and saves its previous `moved_to_end_at` (SPEC 16 behaviour). After a reload the card is still there.
- [ ] After a saved undo, if the restored card was off-screen it is scrolled into view, not hidden under the top bar. It shows the pulse ring for about 1.5 s and its title link has focus.
- [ ] After a saved undo with the card already fully visible, the page doesn't move.
- [ ] With `prefers-reduced-motion: reduce`, the scroll is instant and the ring doesn't animate.
- [ ] A failed undo shows `Failed to undo move`, doesn't scroll, pulse or move focus, and keeps ↶ visible.
- [ ] A filter/sort/search change, ↻, or a reload removes ↶.
- [ ] ↶ never appears on other dashboard pages (Organize, Config).
- [ ] `npm test` passes. `npm run lint` and `npx tsc --noEmit` report no new errors compared with `main`.
- [ ] No console errors during the Playwright run.

## Decisions

- **Yes:** Undo in the sticky top bar. It's always on screen, takes no extra vertical space, and needs no scroll detection.
- **No:** a sticky chip under the top bar. This was the first draft, discarded in favour of a fixed spot the user already looks at.
- **No:** a floating pill at the bottom, which would compete with toasts and the bottom nav.
- **No:** a sticky list header, which costs about 70px all the time.
- **Yes:** move the Undo, rather than duplicating it. There's one place to look, and never two Undo buttons on screen.
- **Yes:** icon-only at every breakpoint, matching the theme toggle next to it. The meaning is carried by `aria-label` and `title`.
- **Yes:** a portal into a header slot through a small layout-level context. `DashboardHeader` stays in the layout and knows nothing about links. The button only exists where `LinkList` is mounted, so other pages never show it.
- **No:** lifting `LinkListContext` into the layout. It would run the link list's hooks on every dashboard page.
- **Yes:** scroll to the restored card after any saved undo, only when it's off-screen, and pulse it with the existing "Last opened" ring style, so there's no new visual language.
- **Yes:** move focus to the restored card's title link (`preventScroll`), because the focused ↶ disappears after a saved undo. Not asked explicitly; it's an a11y follow-on of the scroll decision.
- **Yes:** on failure, no scroll, and ↶ stays for a retry (SPEC 16's slot rule).
- **Numbering:** this spec takes 36. The earlier drafts were renumbered: contrast/dark/motion is now SPEC 37, and icons/desktop polish is now SPEC 38. The cross-references in SPEC 34 and SPEC 35 were updated.

## Risks

| Risk | Mitigation |
| --- | --- |
| Crowded top bar on narrow phones (logo, ↶, theme, Sign out) | ↶ is icon-only, the same size as the theme toggle. Checked at 390px. At 320px the email is already hidden below `sm`. |
| SPEC 38's sticky desktop tabs sit under the header, so "fully visible" should start below them | The visibility check uses the bottom of the sticky header. SPEC 38 should extend it to the tabs (and bump `scroll-mt-*`) on `sm:` and up. |
| The slot isn't mounted when `HeaderUndoButton` first renders | The slot is state set by a callback ref, so the button re-renders and portals as soon as it exists. Until then it renders nothing. |
| Smooth `scrollIntoView` reaches the infinite-scroll sentinel and loads a page | Harmless: `loadMore` drops already-loaded ids (SPEC 21). Checked in Playwright. |

## What is **not** in this spec

- An undo history or stack.
- A toast with "tap to undo" when a link moves.
- A sticky list header or a floating undo pill.
- Scroll-to-card for Trash restore, Send to end or other actions.
- Moving ↻ or `+` into the top bar.

Each one of those, if it lands, goes in its own spec.
