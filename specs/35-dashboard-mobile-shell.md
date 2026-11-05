# SPEC 35 — Dashboard mobile shell: safe areas, toasts, sheets and swipe

> **Status:** Draft
> **Depends on:** SPEC 34
> **Date:** 2026-11-05
> **Objective:** On phones, the bottom nav, sheets and toasts clear the iPhone home indicator and each other, every sheet behaves as a real dialog, and swipe-left reveals a Delete button instead of deleting.

## Why this spec exists

The 2026-11-05 dashboard review found:

- **No safe-area support.** There's no `viewportFit: 'cover'`, and the bottom nav and sheets have no `env(safe-area-inset-bottom)` padding.
- **Toasts cover the nav.** sonner toasts (`bottom-right`) land on top of the fixed mobile bottom nav.
- **The Edit modal can run off-screen.** Unlike Add, it has no height cap, and the form uses `vh`, which ignores mobile browser bars and the on-screen keyboard.
- **Three sheets aren't dialogs.** BottomSheet, FilterSheet and UnlockTagModal skip `useDialog`, so they have no Escape, no focus trap and no dialog role. BottomSheet has no Close button on mobile.
- **Swipe deletes with no confirm.** It deletes once the swipe passes 40% of the card, with no hint and no confirm step.

## Scope

**In:**

- **Viewport.** Add `export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }` in `app/layout.tsx`, keeping any existing theme-colour settings.
- **Safe-area padding:**
  - The mobile bottom nav gets `pb-[env(safe-area-inset-bottom)]`.
  - The dashboard layout's `pb-20 sm:pb-0` becomes `pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0`.
  - FilterSheet, BottomSheet and UnlockTagModal replace their fixed bottom spacers with `pb-[max(1rem,env(safe-area-inset-bottom))]` on mobile.
- **Toasts:**
  - sonner `<Toaster>` gets `mobileOffset={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}`, so toasts sit above the nav. Its desktop position is unchanged.
  - `ToastProvider`'s container gets `role="status"` and `aria-live="polite"`. Clickable toasts become `<button>`s. Its `bottom-24` includes the safe-area inset.
- **Modal heights:**
  - `EditLinkModal`'s panel gets `maxHeight: '90dvh'`, like `AddLinkModal`.
  - `LinkForm`'s `max-h-[70vh]` becomes `max-h-[70dvh]`.
  - FilterSheet's `max-h-[60vh]` becomes `max-h-[60dvh]`.
- **Dialog semantics.** BottomSheet, FilterSheet and UnlockTagModal adopt `useDialog` (`lib/hooks/shared/useDialog.ts`), which gives them a dialog role named by the heading, Escape to close, a focus trap and focus return.
  - BottomSheet gets a Close (✕) button at every breakpoint. On mobile it's 44px.
  - The BottomSheet drag handle becomes purely decorative (`aria-hidden`). Drag-to-dismiss isn't added.
  - UnlockTagModal: the password input gets a visible or visually hidden label. `autoFocus` is replaced by `useDialog`'s `data-autofocus`, so touch screens don't pop the keyboard (matching the Add/Edit modals). The lock SVG gets `aria-hidden`.
- **Snap-open swipe** in `SwipeableCard`:
  - A left swipe past the threshold (40% of the width, unchanged) snaps the card open by a fixed 88px, revealing a real red `<button aria-label="Delete link">` underneath.
  - Tapping that button calls `onSwipeDelete`, and the existing delete flow runs (soft delete, undo toast).
  - A swipe below the threshold, a swipe back to the right, a tap on the card itself, or a touch anywhere outside the card closes it.
  - Only one card is open at a time: opening another closes the previous one.
  - On a favorite, tapping Delete shows the existing "Unfavorite to delete" toast and closes the card.
  - With `prefers-reduced-motion: reduce`, the card moves without the 0.25s transition.
  - The revealed button is hidden from assistive tech and from tab order while the card is closed. The card's own Delete button (SPEC 34) stays the accessible path.
- Tests for SwipeableCard, BottomSheet, FilterSheet and UnlockTagModal behaviour.
- `CLAUDE.md` updated: the swipe description (feature 10), the toast offset and sheet dialogs.

**Must keep working, unchanged:**

- The delete undo toast and favorite protection, which `deleteLink` enforces.
- FilterSheet stays a bottom sheet below `sm` and a centred modal from `sm` up.
- The Add/Edit modals' existing `useDialog` behaviour, including `data-autofocus="always"` on Tags in Edit.
- Desktop toast position (`bottom-right`).

**Out of scope (for future specs):**

- Merging the two toast systems into one.
- Drag-down to dismiss sheets.
- Turning the Add/Edit modals into full-screen sheets on mobile.
- Swipe-right actions (e.g. favorite or mark read).

## Data model

This feature introduces no new data and no DB change.

```ts
// components/SwipeableCard.tsx — props unchanged
interface Props {
  onSwipeDelete?: () => void
  children: React.ReactNode
}
// Internal: open state, and a module-level "currently open card" closer so only one stays open.
const REVEAL_PX = 88
```

## Implementation plan

1. **Viewport and safe areas.** Add the viewport export, and the padding on the nav, layout and sheets. Check on an iPhone-sized Playwright viewport. Real insets can only be confirmed on a device, through the mobile-preview tunnel.
2. **Toasts.** Add sonner's `mobileOffset`, and `aria-live` plus button semantics to `ToastProvider`.
3. **Modal heights.** Cap the Edit modal at `90dvh`, and switch the form and FilterSheet to `dvh`.
4. **Move the sheets onto `useDialog`.** BottomSheet first (add the Close button), then FilterSheet, then UnlockTagModal (label and autofocus). Add tests for Escape, the focus trap and focus return in each.
5. **Snap-open swipe.** Rewrite `onTouchEnd`, add the revealed button, the outside-touch close, the one-open-at-a-time rule and the reduced-motion check. Update `tests/components/SwipeableCard.test.tsx`.
6. **Playwright verification** at 390×844: nav, toast, each sheet, and swipe open/close/delete.

## Acceptance criteria

- [ ] `app/layout.tsx` exports a `viewport` with `viewportFit: 'cover'`.
- [ ] The bottom nav, FilterSheet, BottomSheet and UnlockTagModal pad by the bottom safe-area inset on mobile.
- [ ] A toast on a 390px viewport sits fully above the bottom nav. On desktop it's still bottom-right.
- [ ] `ToastProvider` toasts are announced (`aria-live="polite"`), and clickable ones can be reached and activated with the keyboard.
- [ ] The Edit modal with "More options" open never exceeds 90% of the dynamic viewport height, and its footer buttons stay visible.
- [ ] BottomSheet, FilterSheet and UnlockTagModal each close on Escape, trap Tab inside, return focus to their opener, and are announced as dialogs.
- [ ] BottomSheet has a visible Close button on mobile.
- [ ] Opening UnlockTagModal on a touch screen doesn't pop up the keyboard. Its input has an accessible name.
- [ ] A left swipe past 40% snaps the card open and shows a Delete button. Nothing is deleted until it is tapped.
- [ ] A short swipe, a swipe back, a tap on the card or a touch outside closes an open card. Opening a second card closes the first.
- [ ] Tapping Delete on a non-favorite deletes it with the usual undo toast. On a favorite it shows "Unfavorite to delete" and deletes nothing.
- [ ] With reduced motion on, the swipe snaps with no transition.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** snap-open with a tap to confirm, the iOS Mail pattern. **No:** keeping the 40% auto-delete, which deletes by accident while scrolling.
- **Yes:** keep the 40% threshold for opening. Only what happens after it changes.
- **Yes:** fix both toast systems in place. **No:** merging them into sonner in this spec, which would touch every toast call site.
- **Yes:** reuse `useDialog` for the sheets, which is already proven on Add/Edit. **No:** a second dialog helper.
- **No:** drag-to-dismiss on BottomSheet. The handle becomes decorative, and the Close button and the backdrop are the ways out.

## Risks

| Risk | Mitigation |
| --- | --- |
| `viewportFit: 'cover'` lets content slide under the notch or status bar on iOS in landscape | The header is sticky inside the normal flow. Check landscape on a device. Add `pt-[env(safe-area-inset-top)]` to the header only if needed. |
| The outside-touch close listener fires on the touch that opened the card | Register it after the open transition, and ignore touches inside the open card. |
| `useDialog`'s focus trap breaks FilterSheet's scrollable lists | `focusableIn` already filters to visible elements. Covered by a test that tabs through the sheet. |
| `dvh` isn't supported on very old browsers | All supported targets (iOS 15.4+, Chromium 108+) have it. |

## What is **not** in this spec

- Merging the toast systems.
- Drag-to-dismiss sheets, and full-screen modals on mobile.
- Contrast, dark mode and motion beyond the swipe (SPEC 36).
- SVG icons and desktop polish (SPEC 37).
