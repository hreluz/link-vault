# SPEC 37 — Dashboard contrast, dark mode and reduced motion

> **Status:** Approved
> **Depends on:** SPEC 34
> **Date:** 2026-11-05
> **Objective:** Meaningful text on the dashboard meets 4.5:1 contrast in light and dark mode, every state (loading, empty, error, status badges) has a dark-mode style, and animations stop when the OS asks for reduced motion.

## Why this spec exists

The 2026-11-05 dashboard review found three problems:

- **Low contrast.** `text-surface-400` on `surface-card` is about 2.5:1. It's used for meaningful text: `site_name`, "Uncategorized", the BottomSheet labels and idle icon buttons. The unstarred favorite uses `surface-300`, and the Archived badge is about 2.4:1.
- **Light blocks in dark mode.** The LinkGrid skeleton, empty states and error states, plus the status badges in `app/dashboard/config.ts`, have no `dark:` classes, so they show as light blocks.
- **Motion ignores the OS setting.** Only the import progress bar respects `prefers-reduced-motion`.

## Scope

**In:**

- **Contrast (light mode).** Meaningful text and icons that use `text-surface-400` or `text-surface-300` on card or page backgrounds move to `text-surface-500` (or darker), keeping their dark-mode pairs readable (`dark:text-surface-400`). This covers:
  - LinkCard: `site_name`, "Uncategorized", idle action icons and the unstarred favorite.
  - BottomSheet: `site_name` and the "Status" label.
  - UnlockTagModal: the hint.

  Placeholders stay `surface-400`, as the design system says.
- **Status badges** (`app/dashboard/config.ts`). They keep their literal hue classes (exempt from the token rule). Each gets a dark pair, for example `dark:bg-slate-800 dark:text-slate-300`, `dark:bg-indigo-900/40 dark:text-indigo-300` and `dark:bg-emerald-900/40 dark:text-emerald-300`. Archived text moves to `text-slate-500` (light), up from about 2.4:1 to 4.35:1 (accepted exception, see Decisions).
- **LinkGrid states:**
  - Skeletons: `dark:bg-surface-800`.
  - Empty-state text: `dark:text-surface-400`.
  - Error box: `dark:bg-red-950/40 dark:text-red-300`.
  - "Try again" and "Clear filters": dark variants.
  - Loading skeletons get `aria-busy="true"` on the grid, and a visually hidden "Loading links…" status.
- **`INPUT`** in `app/dashboard/link/LinkForm/styles.ts`: `bg-white` becomes `bg-surface-card`, per the design system.
- **Reduced motion:**
  - The ↻ `animate-spin` gets `motion-reduce:animate-none`.
  - The `animate-pulse` on the skeleton and the card image placeholder gets `motion-reduce:animate-none`.
  - The FilterSheet accordion and the ExpandToggle chevron transitions get `motion-reduce:transition-none`.
  - `useScrollToTop` checks `matchMedia('(prefers-reduced-motion: reduce)')` and jumps instead of animating.
- **`CLAUDE.md` updated:** the status-badge note under Design system, which now has dark pairs.

**Must keep working, unchanged:**

- The accent and surface families, which keep resolving through `primary-*`/`surface-*`.
- The "Last opened" ring's `motion-safe:` pulse, which is already correct.
- The import progress bar's reduced-motion rule.

**Out of scope (for future specs):**

- Contrast on pages other than `/dashboard`.
- Changing the surface ramps' lightness values in `globals.css`.
- SVG icons (SPEC 38).

## Data model

This feature introduces no new data and no DB change. `STATUS_CONFIG` keeps its shape; only the `badge` class strings change.

## Implementation plan

1. **Contrast swaps** in LinkCard, BottomSheet and UnlockTagModal. Check each pair with a contrast checker in light and dark mode, using the default surface family (Slate) and the lightest one (Neutral).
2. **Status badge dark pairs and Archived contrast** in `config.ts`.
3. **LinkGrid dark states** and loading semantics.
4. **`INPUT` background token.**
5. **Reduced motion:** the Tailwind variants, then `useScrollToTop`, with a unit test that mocks `matchMedia`.
6. **Playwright screenshots** in dark mode: the list, the loading skeleton, the empty state and the error state. Use Chromium's `reducedMotion: 'reduce'` context option to confirm the spinner and pulse stop.

## Acceptance criteria

- [ ] `site_name`, "Uncategorized", the BottomSheet labels and idle card icons measure at least 4.5:1 (text) or 3:1 (icons) against their background, in light and dark mode, with every surface family.
- [ ] All four status badges measure at least 4.5:1 in light and dark mode, except Archived in light mode, which measures 4.35:1 (accepted exception).
- [ ] In dark mode, no skeleton, empty state, error box or badge shows a light background.
- [ ] `INPUT` uses no `bg-white`.
- [ ] With reduced motion on, the ↻ spinner, the skeleton pulse, the image placeholder pulse and the chevron rotations don't animate, and the logo scroll-to-top jumps instantly.
- [ ] The loading grid is announced as busy.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** move meaningful text to `surface-500`. **No:** changing the `surface-400` token itself, which would also darken every placeholder.
- **Yes:** keep literal hues for the status badges, which CLAUDE.md exempts, and just add dark pairs.
- **Yes:** accept 4.35:1 for the light-mode Archived badge (`slate-500` on `slate-100`), 0.15 short of 4.5:1 but up from 2.4:1. **No:** switching its background to `slate-50` (4.55:1) to clear the threshold.
- **Yes:** Tailwind's `motion-reduce:` variants rather than a global `* { animation: none }` rule, so intended motion (like the import sweep's existing rule) stays controlled per element.

## Risks

| Risk | Mitigation |
| --- | --- |
| Darker idle icons make cards look busier | `surface-500` is still muted. Compare before and after screenshots. |
| A custom accent hex makes the focus outline or badges low-contrast | Out of scope here. The accent ramp's existing WCAG warning covers custom hexes. |

## What is **not** in this spec

- Touch targets and focus (SPEC 34).
- Safe areas, toasts, sheets and swipe (SPEC 35).
- SVG icons and desktop polish (SPEC 38).
