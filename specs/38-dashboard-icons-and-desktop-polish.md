# SPEC 38 — Dashboard SVG icons and desktop polish

> **Status:** Approved
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

- **SVG icons as components.** Every icon is its own component in `components/icons/`, and callers only write `<StarIcon filled className="h-5 w-5" />`. **No raw `<svg>` markup anywhere in `app/` or `components/` outside `components/icons/`.**
  - **Shared base `Icon`** (`components/icons/Icon.tsx`). It renders the `<svg>` wrapper with `aria-hidden="true"`, `fill="none"`, `stroke="currentColor"`, `strokeLinecap="round"` and `strokeLinejoin="round"`, defaulting to `viewBox="0 0 20 20"` and `strokeWidth={1.6}`. Each icon file only supplies its `<path>`s, so the boilerplate lives in one place. `viewBox`, `strokeWidth` and `fill` can be overridden so existing icons keep their exact geometry.
  - **Barrel export** from `components/icons/index.ts`, so callers do `import { StarIcon, GearIcon } from '@/components/icons'`.
  - **New icons:** `StarIcon` (with a `filled` prop), `LinkIcon`, `FolderIcon`, `GearIcon`, `SunIcon`, `MoonIcon`, `SearchIcon`, `FilterIcon` and `TrashIcon`, plus whatever the BottomSheet status icons need.
  - **Every existing inline `<svg>` moves there with no visual change**, keeping its current `viewBox` (16, 20 or 24) and stroke width. That covers `LinkCard` (3), `HeaderUndoButton`, `LinkListHeader`, `LinkForm/ExpandToggle`, `LinkForm/UrlField`, `components/UnlockTagModal`, and on Organize `TrashCard` (3), `TrashHeader` (2), `TagList` (2), `PrivateTagPasswordSection` (2) and `TagRow`. Duplicates (e.g. two identical trash or lock glyphs) merge into one component.
  - **Guard test** (`tests/components/icons/noInlineSvg.test.ts`). It scans `.tsx` files under `app/` and `components/`, excluding `components/icons/`, and fails listing each file that contains `<svg`.
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
- Tests for the icon components, the no-inline-SVG guard, the empty-state button and the favorite Delete tap.
- `CLAUDE.md` updated: a Conventions rule that icons live in `components/icons/` (built on `Icon`, imported from the barrel), that no other file writes raw `<svg>`, and that the guard test enforces it. Also the grid/container width.

**Must keep working, unchanged:**

- Category emoticons and the emoji picker.
- Delete protection for favorites, which `deleteLink` still enforces.
- 1, 2 and 3 columns below `xl`.

**Out of scope (for future specs):**

- Replacing emoji on Organize, Config or auth pages. Their existing inline SVGs do move, though; see above.
- An icon library dependency.
- Redesigning the header or logo.

## Data model

This feature introduces no new data and no DB change.

```tsx
// components/icons/Icon.tsx: the only place that writes <svg>
export type IconProps = {
  className?: string
  viewBox?: string      // default '0 0 20 20'
  strokeWidth?: number  // default 1.6
  fill?: string         // default 'none'
}

export function Icon({ className, viewBox = '0 0 20 20', strokeWidth = 1.6, fill = 'none',
  children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox={viewBox} className={className} fill={fill}
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  )
}

// components/icons/StarIcon.tsx: a concrete icon is just its paths
export function StarIcon({ filled = false, className }: { filled?: boolean; className?: string }) {
  return <Icon className={className} fill={filled ? 'currentColor' : 'none'}><path d="…" /></Icon>
}

// components/icons/index.ts
export { Icon } from './Icon'
export { StarIcon } from './StarIcon'
// …one line per icon

// Caller
import { StarIcon } from '@/components/icons'
<StarIcon filled={link.is_favorite} className="h-5 w-5" />
```

## Implementation plan

1. **Create `components/icons/`** with `Icon`, the barrel `index.ts`, and the guard test. The test fails at this point, listing the 11 files that still have inline SVGs.
2. **Move every existing inline `<svg>`** into named icon components (LinkCard, the 5 other dashboard files, the 5 Organize files), keeping each one's `viewBox` and stroke width, until the guard test passes. No visual change.
3. **Add the new icons** and swap them in: favorite, nav, theme toggle, search, filters, swipe delete, BottomSheet status.
4. **Make the desktop tabs sticky** under the header. Check that the combined height doesn't hide the first card or FilterSheet.
5. **Widen the container and grid** at `xl` and `2xl`.
6. **Add the empty-state `Add link` button** and the responsive placeholder.
7. **Favorite Delete tap:** switch to `aria-disabled` and show the toast. Check that the swipe path and the button path give the same message.
8. **Update `CLAUDE.md`** with the icons convention and the new widths.
9. **Playwright screenshots** at 1440×900 and 1920×1080 (sticky tabs while scrolled, 4 columns) and at 390×844 (icons in light and dark mode, with two accent presets). Also take one Organize → Trash and Tags screenshot, to confirm the moved icons look the same.

## Acceptance criteria

- [ ] No interactive or stateful control on `/dashboard` uses an emoji as its icon. Category emoticons, the logo and empty-state illustrations are allowed.
- [ ] No `.tsx` file under `app/` or `components/` outside `components/icons/` contains `<svg`, and the guard test enforces it.
- [ ] Inside `components/icons/`, `<svg>` appears only in `Icon.tsx`, except for an icon that the base can't express (see Risks). Every other icon file renders `Icon`.
- [ ] Every icon is imported from `@/components/icons`.
- [ ] The moved icons (LinkCard, Undo, header `+`, More options, UrlField, unlock modal, Trash, Tags) look the same as before.
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
- **Yes:** one icon per component, so callers never write SVG markup. **No:** SVG inline at each call site, which is noisy and duplicates the same glyph in several places.
- **Yes:** a shared `Icon` base with overridable `viewBox`, `strokeWidth` and `fill`. **No:** repeating the full `<svg>` attributes in every icon file. The overrides let existing 16/24-unit icons move without being redrawn.
- **Yes:** move every existing inline SVG, Organize included, so the rule holds across the whole codebase. **No:** converting only `/dashboard`, which would leave exceptions the guard test would have to allow.
- **Yes:** enforce it with a CLAUDE.md rule plus a Vitest guard test. **No:** an ESLint `no-restricted-syntax` rule, which means more lint config for the same result.
- **Yes:** keep category emoticons and the logo as emoji. They are user content and brand, not controls.
- **Yes:** `aria-disabled` plus a toast for favorite Delete, so touch users learn why it won't delete. **No:** hiding the button, which would shift the action row.
- **Yes:** 4 columns only at `xl`. At `lg` the 3-column cards are already about 320px wide.

## Risks

| Risk | Mitigation |
| --- | --- |
| Sticky header plus sticky tabs take too much height on short laptop screens | Together they are about 100px. Check at 1366×768. If it's too tall, make the tabs part of the header row. |
| 4 columns makes thumbnails and titles cramped | At `xl:max-w-6xl` each card is about 270px. Compare screenshots. Fall back to 3 columns with a wider container. |
| Tests query the star by its emoji text | Update them to query by `aria-label`. |
| A moved icon changes size or weight because it got the 20-unit default | Pass each icon's original `viewBox` and `strokeWidth` through `Icon`. Compare before/after screenshots of the affected controls. |
| An existing SVG uses fill instead of stroke (e.g. a spinner), so the base defaults don't fit | `Icon`'s `fill` and `strokeWidth` overrides cover it. If one still doesn't fit, it gets its own `<svg>` inside `components/icons/`, which the guard allows. |

## What is **not** in this spec

- Icons on non-dashboard pages.
- Header or logo redesign.
- Touch, focus, safe areas, contrast and motion (SPECs 34–36).
