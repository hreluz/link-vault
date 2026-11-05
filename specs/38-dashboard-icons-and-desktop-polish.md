# SPEC 38 — Dashboard SVG icons and desktop polish

> **Status:** Draft
> **Depends on:** SPEC 34
> **Date:** 2026-11-05
> **Objective:** Interactive and stateful icons on the dashboard become inline SVGs that follow the theme. On desktop, the section tabs stay visible while scrolling, the grid uses wide screens, and empty states offer an Add link button.

## Why this spec exists

The 2026-11-05 dashboard review found the dashboard uses emoji as UI icons in several places:

- the favorite star ⭐/☆, whose two glyphs come from different fonts and render at different sizes
- the nav 🔖🗂️⚙️
- the theme toggle ☀️/🌙
- the search 🔍 and filters ⚡
- the BottomSheet status icons
- the swipe 🗑️

Emoji look different on every OS, can't take the accent colour, and don't show active or hover states.

On desktop it also found:

- The section tabs scroll away while the header stays.
- The grid stops at 3 columns inside `max-w-5xl`, so wide screens have a lot of empty space.
- Empty states have no way to add a link.
- The favorite's delete protection is explained only in a `title` tooltip, which touch users never see.

## Scope

**In:**

- **Inline SVG icons**, hand-written with `viewBox="0 0 20 20"`, `fill="none"`, `stroke="currentColor"` and `strokeWidth="1.6"`, matching the existing LinkCard icons. Each is `aria-hidden="true"`. They live in `components/icons/` as small components, for example `StarIcon` (with a `filled` prop), `LinkIcon`, `FolderIcon`, `GearIcon`, `SunIcon`, `MoonIcon`, `SearchIcon`, `FilterIcon` and `TrashIcon`. The existing inline LinkCard icons move there too.
- **Replacements:**
  - LinkCard favorite: `StarIcon`. Filled uses `text-amber-400`, the fixed favorite semantic; unfilled uses `text-surface-500`.
  - Mobile and desktop nav icons.
  - ThemeToggleButton.
  - The SearchBar search icon, and the Filters button icon.
  - The swipe Delete button from SPEC 35, and the BottomSheet status icons.
- **Kept as emoji:** user-chosen category emoticons, the header logo 🔖 and the decorative empty-state illustrations. They are content or brand, not controls.
- **Sticky desktop tabs.** The `sm:` section tabs in `DashboardNav` become `sticky` directly under the sticky header, with the same background, so they stay visible while scrolling.
- **Wider grid on large screens.** The dashboard content wrapper goes from `max-w-5xl` to `xl:max-w-6xl 2xl:max-w-7xl`, and LinkGrid adds `xl:grid-cols-4`. The header and nav containers widen to match.
- **Empty-state Add link.** The "No links yet" state (not the filtered-empty one) gets a primary `Add link` button that opens the Add Link modal, using the same handler as the header's `+`.
- **Shorter SearchBar placeholder.** On mobile it's `Search or #tag`. From `sm` up it keeps the full text, swapped by breakpoint.
- **Explaining favorite delete protection.** Tapping the disabled Delete on a favorite shows the existing "Unfavorite to delete" toast, instead of doing nothing. The button stays `aria-disabled`, not `disabled`, so it can receive the tap.
- Tests for the icon components, the empty-state button and the favorite Delete tap.
- `CLAUDE.md` updated: `components/icons/` under Conventions, and the grid/container width.

**Must keep working, unchanged:**

- Category emoticons and the emoji picker.
- Delete protection for favorites, which `deleteLink` still enforces.
- 1, 2 and 3 columns below `xl`.

**Out of scope (for future specs):**

- Replacing emoji on Organize, Config or auth pages.
- An icon library dependency.
- Redesigning the header or logo.

## Data model

This feature introduces no new data and no DB change.

```tsx
// components/icons/StarIcon.tsx
export function StarIcon({ filled = false, className }: { filled?: boolean; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className}
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">{/* path */}</svg>
  )
}
```

## Implementation plan

1. **Create `components/icons/`** and move the existing LinkCard SVGs into it, with no visual change.
2. **Add the new icons** and swap them in: favorite, nav, theme toggle, search, filters, swipe delete, BottomSheet status.
3. **Make the desktop tabs sticky** under the header. Check that the combined height doesn't hide the first card or FilterSheet.
4. **Widen the container and grid** at `xl` and `2xl`.
5. **Add the empty-state `Add link` button** and the responsive placeholder.
6. **Favorite Delete tap:** switch to `aria-disabled` and show the toast. Check that the swipe path and the button path give the same message.
7. **Playwright screenshots** at 1440×900 and 1920×1080 (sticky tabs while scrolled, 4 columns) and at 390×844 (icons in light and dark mode, with two accent presets).

## Acceptance criteria

- [ ] No interactive or stateful control on `/dashboard` uses an emoji as its icon. Category emoticons, the logo and empty-state illustrations are allowed.
- [ ] Every new icon follows the current text colour, including the accent colour on the active nav item, in light and dark mode.
- [ ] Filled and unfilled stars are the same size and shape.
- [ ] On desktop, the section tabs stay visible below the header after scrolling.
- [ ] At 1280px and wider, the grid shows 4 columns.
- [ ] With no links at all, the empty state shows `Add link`, which opens the Add Link modal.
- [ ] Tapping Delete on a favorite shows "Unfavorite to delete" and deletes nothing.
- [ ] The SearchBar placeholder isn't truncated on a 390px phone.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** hand-written inline SVG in `components/icons/`. **No:** lucide-react or another icon library (a new dependency for about ten icons).
- **Yes:** keep category emoticons and the logo as emoji. They are user content and brand, not controls.
- **Yes:** `aria-disabled` plus a toast for favorite Delete, so touch users learn why it won't delete. **No:** hiding the button, which would shift the action row.
- **Yes:** 4 columns only at `xl`. At `lg` the 3-column cards are already about 320px wide.

## Risks

| Risk | Mitigation |
| --- | --- |
| Sticky header plus sticky tabs take too much height on short laptop screens | Together they are about 100px. Check at 1366×768. If it's too tall, make the tabs part of the header row. |
| 4 columns makes thumbnails and titles cramped | At `xl:max-w-6xl` each card is about 270px. Compare screenshots. Fall back to 3 columns with a wider container. |
| Tests query the star by its emoji text | Update them to query by `aria-label`. |

## What is **not** in this spec

- Icons on non-dashboard pages.
- Header or logo redesign.
- Touch, focus, safe areas, contrast and motion (SPECs 34–36).
