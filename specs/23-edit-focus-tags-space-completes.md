# SPEC 23 — Edit opens on Tags, and Space completes a tag suggestion

> **Status:** Implemented
> **Depends on:** SPEC 17
> **Date:** 2026-10-30
> **Objective:** Opening the Edit link modal puts focus straight in the Tags input on every device. In every tag chip input, Space now does what Tab does when suggestions are open, so mobile users (who have no Tab key) can complete to a suggestion too.

## Why this spec exists

Editing a link is mostly about re-tagging it, but the Edit modal lands in Title on desktop and focuses nothing on touch screens. That costs a tap or a Tab every time.

SPEC 17 made Tab add the highlighted (or else the first) tag suggestion. Phones have no Tab key, so on mobile a half-typed word like `rea` still becomes a junk `#rea` tag when the user presses Space. Space should behave like Tab, the same on desktop and mobile.

## Scope

**In:**

- **Edit modal focus on Tags:**
  - When `EditLinkModal` opens, focus goes to the Tags chip input (`TagsField` → `TagChipsInput`'s `<input>`). Today it goes to Title (desktop) or the panel (touch).
  - This applies on every device, touch screens included. That's an explicit exception to `useDialog`'s "focus the panel on coarse pointers" rule.
  - The Add link modal is unchanged: URL on desktop, the panel on touch.
  - Title loses its `data-autofocus` in edit mode.
- **Space = Tab in every `useTagInput` input** (link add/edit form `TagChipsInput`, the import form's "Tags for imported links" `TagChipsInput`, `BulkTagModal`):
  - **Suggestions open, a row highlighted with ↑/↓:** Space adds that row.
  - **Suggestions open, nothing highlighted:** Space adds `suggestions[0]` (exact match first, as in SPEC 17).
  - In both cases the typed text is cleared, the list closes, focus stays in the input, and `onChange` fires.
  - **No suggestions open** (no match, or dismissed with Escape): Space confirms the typed text as today.
  - **Empty input:** Space does nothing, as today.
  - Same behavior on desktop and mobile.
- **Android fallback:** many Android keyboards send `e.key === 'Unidentified'` on keydown, so the space reaches the input value instead.
  - `onInputChange` treats a value that ends in whitespace like a Space press on the text before it. The suggestions are computed for that text, then the same Space rule runs.
  - Whitespace anywhere else in the value is removed (tag names can't contain spaces).
- **Unchanged:** Enter (highlighted row, else typed text), comma (typed text), Tab (SPEC 17), Backspace, paste (`onPaste` already splits on whitespace).
- The row-0 hint style from SPEC 17 stays as it is. It now also marks the Space target.
- Tests for the hook, `TagChipsInput`, `useDialog` and the edit form focus, plus a CLAUDE.md note in feature #3.

**Out of scope (for future specs):**

- `SearchBar` (`useSearchTagSuggestions`) and `TagMergeForm`. Space is a normal character there.
- Focus changes in the Add link modal, or in any other dialog.
- Forcing the on-screen keyboard open on iOS. Safari may not open it for focus that isn't directly from a tap. Focus still lands in Tags, and the next tap on the field opens the keyboard.
- A visible "Space" or "Tab" key badge in the dropdown.
- Enter picking the first suggestion.

## Data model

No new data, no DB change.

```ts
// lib/hooks/shared/useDialog.ts — focus rule on open
// [data-autofocus="always"] → focused on every device, touch included
// [data-autofocus]          → focused on fine pointers only (unchanged)
// none / touch              → the panel (unchanged)

// components/TagChipsInput.tsx — Props gets one optional field
/** Puts data-autofocus="always" on the input, so a dialog focuses it on open. */
autoFocusInDialog?: boolean
```

`useTagInput`'s return shape is unchanged. Internally, the suggestion matching is pulled out into a helper that takes the text, so `onInputChange` can compute suggestions for the new value before state updates.

## Implementation plan

1. **`useDialog` honors `data-autofocus="always"` on touch.** On open, look for `[data-autofocus="always"]` first and focus it on any device. Otherwise keep today's rule (coarse → panel, fine → `[data-autofocus]` or panel).

   Tests in `tests/hooks/shared/useDialog.test.tsx`:
   - with `(pointer: coarse)` mocked, `data-autofocus="always"` → that element is focused;
   - with `(pointer: coarse)`, plain `data-autofocus` → the panel is focused (unchanged);
   - with a fine pointer, `data-autofocus="always"` → that element is focused.
2. **Edit modal lands in Tags.**
   - Add `autoFocusInDialog` to `TagChipsInput`, rendered as `data-autofocus={autoFocusInDialog ? 'always' : undefined}` on the `<input>`.
   - `TagsField` passes `autoFocusInDialog={mode === 'edit'}`.
   - Remove `data-autofocus` from `TitleField`, along with its comment.

   Tests: rendering `EditLinkModal` (or `LinkForm` in edit mode inside `useDialog`) focuses the Tags input, on both fine and coarse pointers. In add mode the URL input keeps `data-autofocus` and the Tags input has none.
3. **Space = Tab in `onKeyPress`.**
   - Include `' '` in the "highlighted row" branch (alongside Enter/Tab).
   - Include `' '` in the "nothing highlighted, suggestions open → `suggestions[0]`" branch (alongside Tab only, not Enter).
   - The fallthrough (no suggestions) still confirms the typed text and returns true.

   Tests in `tests/hooks/links/useTagInput.test.ts`:
   - `rea` + Space with `react` available → `confirmedTags` gains `react`, not `rea`; `currentInput` is `''`; returns true;
   - ↓↓ then Space → the second suggestion is added;
   - Space after Escape → `rea` is confirmed;
   - Space with no matching tags → typed text confirmed (the existing `space confirms current input as a tag` test still passes, since its `availableTags` is empty, so check that);
   - `rea` + Enter (no highlight) → `rea` is added (unchanged);
   - `rea` + comma → `rea` is added (unchanged).
4. **Android trailing-space fallback in `onInputChange`.**
   - Extract the matching logic from the `suggestions` memo into a helper, e.g. `matchesFor(text)`.
   - In `onInputChange`, after the existing `#`/`,` cleanup: if the value ends in whitespace and the trimmed text is non-empty, apply the Space rule to the trimmed text.
     - Matches exist and the list wasn't dismissed → add the highlighted match (only if `selectedIndex` still points into the new match list) or else the first one.
     - Otherwise → confirm the trimmed text.
   - Otherwise, strip all whitespace from the value and continue as today.

   Tests:
   - `onInputChange('rea ')` with `react` available → `#react` added, input cleared;
   - `onInputChange('zzz ')` with no match → `zzz` added;
   - `onInputChange(' ')` on an empty input → nothing added, input stays `''`;
   - `onInputChange('re a')` → `currentInput` is `rea`.

   In `tests/components/TagChipsInput.test.tsx`:
   - typing `rea` then pressing Space renders a `#react` chip;
   - firing a change event with `rea ` renders a `#react` chip.
5. **Docs.** In CLAUDE.md feature #3, say that Space behaves like Tab in the `useTagInput` inputs (including a trailing space typed by mobile keyboards). Also say that the Edit link modal opens with focus in Tags on every device (`data-autofocus="always"` in `useDialog`).

## Acceptance criteria

- [ ] On desktop, opening Edit from a card focuses the Tags input with the cursor in it.
- [ ] On a touch device (or with `(pointer: coarse)` emulated), opening Edit focuses the Tags input.
- [ ] Opening Add link still focuses URL on desktop and the panel on touch.
- [ ] In the add-link form, typing `rea` with an existing `react` tag and pressing Space adds `#react` and leaves the input empty.
- [ ] Same in the edit form, the import form's "Tags for imported links", and `BulkTagModal`.
- [ ] Pressing ↓ twice then Space adds the second suggestion.
- [ ] Typing a word with no matching tags and pressing Space adds it as typed.
- [ ] After Escape closes the list, Space adds the typed text.
- [ ] Typing `rea` and pressing Enter or comma adds `#rea`.
- [ ] On an Android keyboard that reports `Unidentified` for Space, typing `rea` then Space adds `#react` (verified with a change event carrying a trailing space).
- [ ] Space in `SearchBar` and in the Organize → Tags merge picker still types a space / behaves as before.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** Edit focuses Tags on every device, as the user asked ("always"). **No:** desktop-only, or scrolling to Tags without focus on mobile.
- **Yes:** a `data-autofocus="always"` value in `useDialog`, so other dialogs keep the keyboard-safe touch rule. **No:** dropping the coarse-pointer rule for every dialog.
- **Yes:** Space = Tab on all devices. One rule, and the user asked for it to be "the same in both". **No:** touch-only Space completion.
- **Yes:** Enter and comma keep saving the typed text. That's the way to create a new tag whose name is part of an existing one (e.g. `rea` when `react` exists), and Escape-then-Space also works.
- **Yes:** detect a trailing space in `onInputChange` as well as keydown `' '`. Many Android keyboards never send a usable keydown for Space. **No:** keydown only, which would leave the feature broken on Android.
- **Yes:** same set of inputs as SPEC 17 (`useTagInput`). **No:** `SearchBar` or `TagMergeForm`, where Space is part of the text.

## Risks

| Risk | Mitigation |
| --- | --- |
| A user who pressed Space to save a half-typed new tag now gets an existing one | Enter, comma and Escape-then-Space still save the typed text. The row-0 hint shows what Space will add. |
| Android autocorrect rewrites the word when Space is pressed (`rea` → `real `) | The rule runs on whatever text the keyboard leaves, so the result matches what the user sees typed. |
| On iOS the keyboard doesn't open on modal-open focus | Focus is still in Tags. One tap opens the keyboard. Documented as out of scope. |
| Both keydown `' '` and the trailing-space path fire for one press | Keydown handling calls `preventDefault`, so the space never reaches the value. The trailing-space path only runs when keydown didn't handle it. |

## What is **not** in this spec

- Space completion in `SearchBar` or `TagMergeForm`.
- Focus changes in Add link or other dialogs.
- Forcing the iOS keyboard open.
- Key badges in the dropdown, Enter picking the first suggestion.

Each one of those, if it lands, goes in its own spec.
