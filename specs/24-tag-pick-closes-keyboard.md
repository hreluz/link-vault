# SPEC 24 — Adding a tag closes the keyboard

> **Status:** Approved
> **Depends on:** SPEC 17, SPEC 23
> **Date:** 2026-10-30
> **Objective:** In every `useTagInput` chip input, adding a tag (tapping a suggestion, Space/Tab completion, Return or comma) blurs the input, so the on-screen keyboard closes on iOS.

## Why this spec exists

On iPhone (iOS Safari), picking a tag leaves the keyboard open. It covers the rest of the form and the Save button, and the user has to dismiss it by hand. That's on purpose in the code today:

- The suggestion row uses `onMouseDown` + `preventDefault`, so tapping it never takes focus away from the input.
- Space/Tab/Return/comma call `preventDefault` on keydown and leave focus where it is.

The user wants each added tag to end the typing: the input loses focus and the keyboard goes down. To add another tag, tap the field again. They chose the same rule on every device, desktop included.

## Scope

**In:**

- **Inputs:** the same set as SPEC 17/23, all powered by `useTagInput`:
  - the link add/edit form (`TagsField` → `components/TagChipsInput.tsx`);
  - the import form's "Tags for imported links" (`TagChipsInput`);
  - `app/dashboard/link/BulkTagModal.tsx` (its own `<input>` markup over `useTagInput`).
- **Actions that blur the input once a tag is added:**
  - tapping/clicking a row in `TagSuggestionsDropdown`;
  - Space completing to a suggestion, or saving the typed text (SPEC 23), including the Android trailing-space path in `onInputChange`;
  - Tab completing to a suggestion (SPEC 17);
  - Return/Enter adding the highlighted row or the typed text;
  - comma adding the typed text.
- **Only when a tag was actually added.** Space, Return or comma on an empty input adds nothing and keeps focus.
- **Every device**, desktop included.
- **Tab with no suggestions open** keeps today's behavior: it saves the typed text and the browser moves focus to the next field. No explicit blur there, so the browser's own Tab navigation still works.
- After the blur, the typed text is empty, so the suggestion list is closed.
- Tests for the hook and both components, plus a CLAUDE.md note in feature #3.

**Out of scope (for future specs):**

- `SearchBar` (`useSearchTagSuggestions`) and `TagMergeForm`.
- Paste. Pasting several tags at once keeps focus in the input, as today.
- Backspace removing the last chip, and the ✕ button on a chip. Neither adds a tag.
- A setting to choose "keep typing" vs "close keyboard".
- Moving focus somewhere specific (e.g. the Save button) after the blur.
- Scrolling the form after the keyboard closes.

## Data model

No new data, no DB change.

```ts
// lib/hooks/links/useTagInput.ts — one optional options argument
useTagInput(
  initialTags: string,
  onChange: (tags: string) => void,
  availableTags: string[] = [],
  options?: {
    /** Called right after a tag is added by a pick or a confirm key (not paste, not
     *  Tab-with-no-suggestions). Components blur their input here. */
    onTagAdded?: () => void
  },
)
```

The return shape is unchanged.

## Implementation plan

1. **`useTagInput` reports added tags.**
   - Accept `options.onTagAdded` and keep it in a ref, so a new inline callback each render is fine.
   - Call it from `selectSuggestion` (covers dropdown taps, Space/Tab/Enter on a suggestion, and the Android trailing-space pick).
   - Call it from `confirmText` only when a tag was added (non-empty trimmed text). That covers Space/Enter/comma on typed text and the Android trailing-space confirm.
   - Don't call it for the Tab fallthrough with no suggestions open. That branch saves the text but lets the browser move focus.
   - Don't call it from `onPaste`.

   Tests in `tests/hooks/links/useTagInput.test.ts`:
   - `rea` + Space with `react` available → `onTagAdded` called once;
   - `rea` + Enter, `rea` + comma, `zzz` + Space (no match) → called once each;
   - `selectSuggestion('react')` → called once;
   - `onInputChange('rea ')` with `react` available → called once;
   - Space, Enter or comma on an empty input → not called;
   - `rea` + Tab with no matching tags → `rea` added, not called;
   - pasting `a, b` → not called;
   - no `options` passed → nothing throws (existing tests still pass).
2. **`TagChipsInput` blurs on add.** Pass `{ onTagAdded: () => inputRef.current?.blur() }` to `useTagInput`. Keep the dropdown's `onMouseDown` `preventDefault`, so the tap reaches `onSelect` before any blur, and the blur is explicit.

   Tests in `tests/components/TagChipsInput.test.tsx`:
   - focus the input, type `rea`, press Space → `#react` chip rendered and `document.activeElement` is not the input;
   - focus, type `rea`, mouse-down on the `#react` row → chip rendered and the input is not focused;
   - type `zzz`, press Enter → chip rendered and the input is not focused;
   - press Space on an empty focused input → it stays focused.
3. **`BulkTagModal` blurs on add.** Add an input ref (or reuse one if it exists) and pass the same `onTagAdded` blur.

   Test in the BulkTagModal test file (create it if missing): typing `rea` + Space adds the chip and the input loses focus.
4. **Docs.** In CLAUDE.md feature #3, say that adding a tag in the `useTagInput` inputs (suggestion tap, Space/Tab completion, Enter, comma) blurs the input on every device, so the mobile keyboard closes. Tab with no suggestions still moves to the next field, and paste keeps focus.

## Acceptance criteria

- [ ] On an iPhone (iOS Safari), in the Add link form, typing `rea` and tapping `#react` in the list adds the chip and the keyboard closes.
- [ ] On iOS, typing `rea` and pressing Space adds `#react` and the keyboard closes.
- [ ] On iOS, typing `zzz` and pressing Return adds `#zzz` and the keyboard closes.
- [ ] Same three checks in the Edit link modal, the import form's "Tags for imported links", and `BulkTagModal`.
- [ ] Tapping the Tags field again after a pick reopens the keyboard and lets you add another tag.
- [ ] On desktop, clicking a suggestion, Tab/Space completion, Enter and comma each add the tag and leave the input unfocused.
- [ ] On desktop, typing a word with no matching tags and pressing Tab adds it and moves focus to the next field.
- [ ] Space, Return or comma on an empty Tags input keeps focus in it.
- [ ] Pasting `a, b` into the Tags input adds both chips and keeps focus in it.
- [ ] Inside the Edit link modal, Escape still closes the modal after a tag pick blurred the input.
- [ ] `SearchBar` behavior is unchanged.
- [ ] `npm test` passes, including the new tests.

## Decisions

- **Yes:** blur the input, which is what closes the iOS keyboard. **No:** moving focus to another element. That could open another keyboard or scroll the page.
- **Yes:** every add action blurs (tap, Space, Tab, Enter, comma), as the user chose. **No:** "close on tap, stay open on Space", which keeps the keyboard up in the common case.
- **Yes:** every device, as the user chose. **No:** touch-only (coarse pointer). Desktop users now click the field again to add a second tag.
- **Yes:** a callback option on `useTagInput` (`onTagAdded`). The hook knows when a tag was added, and the components own the input element. **No:** a `blurOnAdd` flag inside the hook, because the hook has no access to the DOM.
- **Yes:** Tab with no suggestions keeps the browser's own focus move. **No:** blurring there too, which would drop focus to `<body>` instead of the next field.
- **Yes:** paste keeps focus. It isn't one of the user's three actions, and pasting is often followed by more typing.

## Risks

| Risk | Mitigation |
| --- | --- |
| Desktop users adding several tags in a row now have to click back each time | The user's explicit choice. If it hurts, a touch-only rule is a small follow-up spec. |
| Inside a dialog, focus lands on `<body>` after the blur | `useDialog` listens for Escape and Tab on `document`, so Escape still closes the modal and Tab moves back to the first focusable element. |
| SPEC 23's Space keydown and the Android trailing-space path both fire for one press | Unchanged from SPEC 23: keydown calls `preventDefault`, so only one path adds the tag and calls `onTagAdded` once. |
| The tap on a suggestion blurs the input before `onSelect` runs | The row's `onMouseDown` `preventDefault` stays, so the pick runs first and the blur is explicit. |

## What is **not** in this spec

- `SearchBar` or `TagMergeForm`.
- Blurring after paste, Backspace or chip removal.
- A "keep typing" setting, or a touch-only rule.
- Focusing another element or scrolling after the keyboard closes.

Each one of those, if it lands, goes in its own spec.
