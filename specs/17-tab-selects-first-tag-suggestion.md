# SPEC 17 — Tab picks the first tag suggestion

> **Status:** Approved
> **Depends on:** none
> **Date:** 2026-10-25
> **Objective:** In every tag chip input, pressing Tab while tag suggestions are open adds the first suggestion (or the one highlighted with the arrow keys). The first row is marked so the user can see which tag Tab will add.

## Why this spec exists

When you type in the tags field of the add/edit link form, matching existing tags appear. Today, pressing Tab with nothing highlighted saves exactly what was typed (e.g. `rea`) as a new tag, so a half-typed word ends up as a junk tag. The user expects Tab to complete to the first suggestion, as in most autocomplete UIs.

## Scope

**In:**

- **Where:** every input built on `useTagInput` (`lib/hooks/links/useTagInput.ts`):
  - the link add/edit form (`TagsField` → `TagChipsInput`);
  - the import form's "Tags for imported links" (`TagChipsInput`);
  - `BulkTagModal`.
- **Tab with suggestions open:**
  - if a row is highlighted with ↑/↓ (`selectedIndex >= 0`), Tab adds that row (same as today);
  - otherwise Tab adds `suggestions[0]`;
  - in both cases the typed text is cleared, the list closes, focus stays in the input (`preventDefault`), and `onChange` fires with the new tag list.
- **Tab with no suggestions open** (none match, the input is empty, or the list was closed with Escape): unchanged. A non-empty typed text is confirmed as a tag, and focus moves to the next field.
- **Enter is unchanged.** With a highlighted row it adds that row. With no highlight it saves the typed text exactly, which is still how you create a new tag whose name is part of an existing one (e.g. `react` when `react-native` exists).
- **Comma and space are unchanged** (they confirm the typed text).
- **Exact match first:** when the typed text (trimmed, lower-cased) equals one of the matching tags, that tag goes to the top of `suggestions`. The others keep their current order, and the 8-item cap still applies after reordering. So "first option" is always the best match.
- **Visual hint:** when the list is open and nothing is highlighted, the first row gets a lighter "Tab target" style, different from the full arrow-key highlight. As soon as ↑/↓ highlights a row, only that row is styled. Pressing ↑ back to no highlight shows the hint on row 0 again.
  - `TagSuggestionsDropdown` gets an optional `hintIndex?: number` prop (default: none). Only `TagChipsInput` and `BulkTagModal` pass it (`hintIndex={selectedIndex < 0 ? 0 : undefined}`), so `SearchBar` and `TagMergeForm` look the same as today.
- Tests for the hook and the dropdown, and a CLAUDE.md note in feature #3.

**Out of scope (for future specs):**

- `SearchBar` / `useSearchTagSuggestions` (the `#tag` search box): Tab there keeps today's behavior.
- `TagMergeForm`'s target picker.
- Enter adding the first suggestion.
- Fuzzy matching or ranking beyond the exact-match-first rule.
- A visible `Tab` key badge in the dropdown.
- Mobile keyboards (no Tab key), which stay unchanged.

## Data model

No new data, no DB change. Only the hook's internal logic and one optional component prop change.

```ts
// components/TagSuggestionsDropdown.tsx
interface Props {
  suggestions: string[]
  selectedIndex: number
  onSelect: (tag: string) => void
  /** Row styled as the Tab target when nothing is highlighted; omit for no hint. */
  hintIndex?: number
}
```

`useTagInput`'s return shape is unchanged.

## Implementation plan

1. **Exact match first.** In `useTagInput`'s `suggestions` memo, after filtering and before `.slice(0, 8)`, move the tag that equals `currentInput.trim().toLowerCase()` to index 0.

   Tests in `tests/hooks/links/useTagInput.test.ts`:
   - typing `react` with available `['react-native', 'react']` gives `suggestions[0] === 'react'`;
   - with no exact match the order is unchanged.
2. **Tab picks the first.** In `onKeyPress`, change the Tab branch: if `suggestions.length > 0`, call `selectSuggestion(suggestions[selectedIndex >= 0 ? selectedIndex : 0])` and return true. Leave the Enter branch as it is. The comma/space/Enter/Tab-without-suggestions fallthrough (`confirmCurrent`) stays as it is.

   Tests:
   - `rea` + Tab with `react` suggested → `confirmedTags` gains `react`, not `rea`; `currentInput` is `''`; `onChange` is called with it; returns true;
   - with ↓↓ then Tab → the second suggestion is added (existing test still passes);
   - `rea` + Enter with no highlight → `rea` is added (unchanged);
   - Tab with no suggestions → typed text confirmed and returns false (existing test still passes);
   - Tab after Escape (dismissed) → typed text confirmed and returns false;
   - update `returns true for Tab when suggestions are open` to also assert the first suggestion was added.
3. **Dropdown hint.** Add `hintIndex` to `TagSuggestionsDropdown`. A row with `i === hintIndex && i !== selectedIndex` gets a muted style, e.g. `bg-surface-50 text-surface-900 dark:bg-surface-800 dark:text-surface-100`, which is lighter than the `primary-*` selected style. Pass `hintIndex={selectedIndex < 0 ? 0 : undefined}` from `TagChipsInput` and `BulkTagModal`.

   Tests in `tests/components/TagSuggestionsDropdown.test.tsx` (new, or extend `TagChipsInput.test.tsx`):
   - with `hintIndex=0, selectedIndex=-1`, row 0 has the hint class;
   - with `selectedIndex=1`, row 1 has the selected class and no row has the hint class;
   - without `hintIndex`, no row has the hint class.

   In `TagChipsInput.test.tsx`: typing `rea` then pressing Tab renders a `#react` chip.
4. **Docs.** In CLAUDE.md feature #3, change "keyboard-navigable with ↑/↓, Tab/Enter to select" to say that Tab adds the highlighted suggestion or else the first one (an exact match is listed first, and the first row is marked as the Tab target), Enter adds the highlighted suggestion or else the typed text, and `SearchBar` keeps highlight-only Tab.

## Acceptance criteria

- [ ] In the add-link form, typing `rea` with an existing `react` tag and pressing Tab adds a `#react` chip and leaves the input empty with focus still in it.
- [ ] Same in the edit-link form, the import form's "Tags for imported links", and `BulkTagModal`.
- [ ] Pressing ↓ twice then Tab adds the second suggestion.
- [ ] Typing `rea` and pressing Enter (no highlight) adds `#rea`.
- [ ] Typing `react` with `react-native` and `react` both existing lists `react` first, and Tab adds `#react`.
- [ ] Typing a word with no matching tags and pressing Tab adds it as a tag and moves focus to the next field.
- [ ] After Escape closes the list, Tab adds the typed text and moves focus.
- [ ] When the list opens, the first row shows the hint style. After ↓ the highlighted row shows the selected style and the hint is gone.
- [ ] The search box (`SearchBar`) and the Organize → Tags merge picker look and behave as before.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** apply to every `useTagInput` input. They share one hook, so they stay consistent. **No:** link form only, which would need an opt-in flag and make the inputs disagree.
- **No:** change `SearchBar`. It uses a separate hook and was not requested; deferred.
- **Yes:** Tab = accept a suggestion, Enter = keep the typed text. **No:** Enter also picks the first, which would remove the easy way to create a new tag that is a substring of an existing one.
- **Yes:** an exact match goes first, so the first row is always the best match and Tab never replaces `react` with `react-native`. **No:** keeping the raw order.
- **Yes:** a lighter hint on row 0 rather than setting `selectedIndex` to 0. Setting `selectedIndex` would also change Enter. **No:** a `Tab` badge (deferred), and no hint at all, which would leave the Tab target invisible.
- **Yes:** `hintIndex` is an optional prop, so `SearchBar` and `TagMergeForm` are untouched.

## Risks

| Risk | Mitigation |
| --- | --- |
| A user who relied on Tab to save a half-typed new tag now gets an existing one | Enter, comma and space still save the typed text. The row-0 hint shows what Tab will do. |
| The exact-match reorder pushes a match out of the 8-item cap | Reorder before slicing; only the exact match moves, and it is always kept. |

## What is **not** in this spec

- Tab completion in `SearchBar` or `TagMergeForm`.
- Enter picking the first suggestion.
- Fuzzy ranking, a `Tab` key badge.

Each one of those, if it lands, goes in its own spec.
