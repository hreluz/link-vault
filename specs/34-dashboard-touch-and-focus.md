# SPEC 34 — Dashboard touch targets and keyboard focus

> **Status:** Approved
> **Depends on:** SPEC 18, SPEC 25
> **Date:** 2026-11-05
> **Objective:** Every control on `/dashboard` is at least 44px tall on phones, shows a visible focus ring for keyboard users, and announces its state to screen readers. The card actions move to their own row at the bottom of the card.

## Why this spec exists

A UI/UX review of the dashboard (2026-11-05) found the card's five action buttons are 32px on phones and 40px on desktop, 4px apart, with Delete next to Favorite. The whole card is a stretched link, so a near-miss opens the URL. Pills, chips and header buttons are 20–40px. None of the dashboard chrome has a `focus-visible` style, and toggles and menus don't expose their state (`aria-pressed`, `aria-expanded`, `aria-current`).

At 44px, five buttons take 252px of the card's 318px top row on a 390px phone, which leaves about 66px for the category pill. So the actions move to their own row instead of shrinking the category.

## Scope

**In:**

- **LinkCard action row.**
  - Delete, Favorite, Edit, Send to end and `···` move out of the top row into a bottom action row, separated by a top border (`border-t border-surface-200 dark:border-surface-700`).
  - The order is Delete, Favorite, Edit, Send to end, then `···` pushed right with `ml-auto`.
  - Buttons are `h-11 w-11 lg:h-10 lg:w-10` (Favorite included) with `gap-2`.
  - The row stays `relative z-10` above the stretched title link.
  - The layout is the same at every breakpoint. The category pill gets the full top row.
- **A shared focus style.**
  - One `@utility focus-ring` in `app/globals.css`, giving `outline-2 outline-offset-2 outline-primary-600` on `:focus-visible` (`outline-primary-400` in dark mode).
  - It is applied to every button and link on the dashboard: card actions, nav items (desktop and mobile), header buttons (logo, ThemeToggle, Logout), LinkListHeader buttons, FavoritesToggle, StatusTabBar, Filters, FilterSheet chips and accordions, LinkGrid "Try again" and "Clear filters", BottomSheet buttons, and ExpandToggle ("More options").
- **Minimum heights on touch screens:**
  - FavoritesToggle and StatusTabBar pills: `min-h-11 sm:min-h-9`.
  - FilterSheet chips and the any/all tag-mode toggle: `min-h-11 sm:min-h-9`.
  - LinkListHeader Undo, ↻ and +: `min-h-11 min-w-11` below `sm`.
  - ThemeToggleButton: `h-11 w-11 sm:h-9 sm:w-9`.
  - BottomSheet status buttons: `min-h-11`.
  - LinkGrid "Try again": `py-3`.
  - LinkGrid "Clear filters": padded to `min-h-11` on mobile.
  - ExpandToggle and the Auto-fetch toggle in `UrlField`: `min-h-11` hit area. The visible text size doesn't change.
- **ARIA state:**
  - FavoritesToggle and StatusTabBar pills: `aria-pressed`.
  - Nav items (desktop and mobile): `aria-current="page"` on the active one.
  - Filters button: `aria-haspopup="dialog"` and `aria-expanded`.
  - `···`: `aria-haspopup="dialog"` and `aria-expanded`.
  - FilterSheet accordion headers and ExpandToggle: `aria-expanded`.
  - The Auto-fetch toggle: `role="switch"` and `aria-checked`. Its visible text stays its accessible name, with no overriding `aria-label`.
  - SearchBar: a visually hidden `<label>` ("Search links").
  - "⭐ Favorites": the emoji gets `aria-hidden`.
- Tests updated for the new card structure and ARIA attributes.
- `CLAUDE.md` updated: the card action row and the `focus-ring` utility under Design system.

**Must keep working, unchanged:**

- What each card action does: delete protection for favorites, Send to end, Edit and the `···` BottomSheet.
- Tapping the card's title or empty space still opens the link (stretched link).
- The desktop grid still shows 1, 2 and 3 columns.

**Out of scope (for future specs):**

- Safe areas, toasts, sheet dialog semantics and swipe behaviour (SPEC 35).
- Contrast and dark-mode colour fixes (SPEC 37).
- Replacing emoji with SVG icons (SPEC 38).
- Pages other than `/dashboard`, such as Organize, Config and auth.

## Data model

This feature introduces no new data and no DB change.

```css
/* app/globals.css */
@utility focus-ring {
  &:focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: 2px;
  }
  .dark &:focus-visible { outline-color: var(--color-primary-400); }
}
```

Check how dark mode is selected in `globals.css` (class or `data-theme`) and match that selector.

## Implementation plan

1. **Add the `focus-ring` utility** to `app/globals.css`. Check that it renders in light and dark mode and with every accent preset.
2. **Restructure LinkCard.** Move the actions into the bottom row and give the category the full top row. Update `tests/components/LinkCard.test.tsx` for the new structure; the queries by `aria-label` should keep working.
3. **Apply the minimum heights and `focus-ring`** to the header, nav, LinkListHeader, FavoritesToggle, StatusTabBar, SearchBar, FilterSheet, LinkGrid, BottomSheet and LinkForm toggles.
4. **Add the ARIA attributes** listed in Scope, with tests: `aria-pressed` on the pills, `aria-current` on the nav, `aria-expanded` on Filters and `···`, and `role="switch"` on Auto-fetch.
5. **Verify in Playwright** (port 3500, 390×844 and 1440×900), measuring button boxes with `getBoundingClientRect` and tabbing through the page.

## Acceptance criteria

- [ ] On a 390px viewport, every button and link on `/dashboard` measures at least 44px tall. Text links inside sentences are exempt.
- [ ] Card action buttons are 44×44 below `lg` and 40×40 at `lg`, with at least 8px between them.
- [ ] The category pill shows a typical name ("YouTube", "Article") without truncating on a 390px phone.
- [ ] Tabbing through the dashboard shows a visible focus ring on every interactive element, in light and dark mode.
- [ ] Mouse clicks don't show the focus ring (it's `:focus-visible` only).
- [ ] Screen readers announce the pressed state of the All/Favorites and status pills, the current nav page, and whether Filters, `···`, the accordions and "More options" are expanded.
- [ ] The Auto-fetch toggle is announced as a switch with its on/off state.
- [ ] The search input has an accessible name.
- [ ] Tapping a card's empty space or title still opens the link, and tapping an action button never does.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** a separate action row at every breakpoint. **No:** moving Delete and Send to end into `···` on mobile (they would be one tap further away), and **no** to keeping them inline (the category pill would shrink to about 66px).
- **Yes:** 40px buttons at `lg`. Mouse users don't need 44px, and the 3-column cards are narrower.
- **Yes:** `min-h-11 sm:min-h-9` for pills, so desktop keeps its compact look.
- **Yes:** a single `focus-ring` utility instead of repeating `focus-visible:` classes, so the ring looks the same everywhere and can be changed in one place.
- **Yes:** outlines rather than `ring-*` for focus. Rings collide with the existing `ring-1` card borders and the "Last opened" accent ring.

## Risks

| Risk | Mitigation |
| --- | --- |
| Cards get about 52px taller, so fewer fit on screen | Accepted trade-off (confirmed by the user). The description is still clamped to 2 lines. |
| The action row's `z-10` conflicts with the stretched link | Same pattern as today's top row. Covered by a test that clicks each action and checks no link opened. |
| Swipe-to-delete still uses the old 40% commit until SPEC 35 | SPEC 35 changes it. The card's Delete button is now 44px, so there's an easy alternative in the meantime. |

## What is **not** in this spec

- Safe areas, toasts, sheets and swipe (SPEC 35).
- Contrast, dark mode and motion (SPEC 37).
- SVG icons and desktop layout polish (SPEC 38).
