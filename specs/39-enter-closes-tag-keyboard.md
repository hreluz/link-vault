# SPEC 39 — Enter closes the tag keyboard, Space keeps it open

> **Status:** Approved
> **Depends on:** SPEC 17, SPEC 23, SPEC 24
> **Date:** 2026-11-18
> **Objective:** In every `useTagInput` chip input, only Enter blurs the input (and closes the mobile keyboard), while Space, Tab, comma and tapping a suggestion add the tag and keep focus.

## Why this spec exists

SPEC 24 made every added tag blur the input, so the iOS keyboard closed after each tag. In practice, adding several tags now means tapping the field again for each one. The user wants two separate gestures:

- **Space** (and the other ways of adding a tag) means "next tag", so the keyboard stays up.
- **Enter / Return** means "I'm done", so the keyboard goes down, whether or not Enter added a tag.

This replaces SPEC 24's "every add blurs" rule.

## Scope

**In:**

- **Inputs:** every `useTagInput` chip input. Today that's only `components/TagChipsInput.tsx`, used by:
  - the link add/edit form (`TagsField`);
  - the import form's "Tags for imported links".
- **Enter blurs the input in every case:**
  - Enter with a highlighted suggestion adds it, then blurs.
  - Enter with typed text adds the typed text, then blurs.
  - Enter on an empty input adds nothing, then blurs. It still calls `preventDefault`, so the form is not submitted.
- **These keep focus after adding a tag:**
  - Space completing to a suggestion or saving the typed text (SPEC 23), including the Android trailing-space path in `onInputChange`;
  - Tab completing to a suggestion (SPEC 17);
  - comma;
  - tapping or clicking a row in `TagSuggestionsDropdown`.
- **Tab with no suggestions open** is unchanged: it saves the typed text, and the browser moves focus to the next field.
- **Every device**, desktop included.
- Tests for the hook and the component.
- CLAUDE.md feature #3 updated.
- SPEC 24's header gets a `> **Superseded by:** SPEC 39` line. Its status stays `Implemented`.

**Out of scope (for future specs):**

- `SearchBar` (`useSearchTagSuggestions`) and `TagMergeForm`.
- Paste, Backspace and chip removal. They keep focus, as today.
- Escape. It still only closes the suggestion list.
- A setting to choose the behaviour, or a touch-only rule.
- Moving focus to a specific element (e.g. Save) or scrolling after the blur.
- Submitting the form with Enter from the Tags field.

## Data model

No new data, no DB change. The `useTagInput` option is renamed, because it no longer means "a tag was added":

```ts
// lib/hooks/links/useTagInput.ts
useTagInput(
  initialTags: string,
  onChange: (tags: string) => void,
  availableTags: string[] = [],
  options?: {
    /** Called on every Enter keypress, after any tag Enter adds (including on an
     *  empty input). Components blur their input here. */
    onEnter?: () => void
  },
)
```

`onTagAdded` is removed. Its only caller is `TagChipsInput`. The return shape is unchanged.

## Implementation plan

1. **`useTagInput`: replace `onTagAdded` with `onEnter`.**
   - Keep the callback in a ref, as today, so a new inline callback on each render is fine.
   - In `onKeyPress`, call `onEnter` on every `Enter`:
     - after `selectSuggestion` for a highlighted row;
     - after `confirmText` for typed text;
     - on an empty input too.
     Return `true` in all three cases.
   - `selectSuggestion`, `confirmText` and `onInputChange` (Android trailing space) no longer call any callback. The `notify` parameter on `confirmText` goes away.
   - Don't call it from `onPaste`, Space, Tab, comma or dropdown picks.

   Tests in `tests/hooks/links/useTagInput.test.ts`: rewrite the `describe('options.onTagAdded')` block as `describe('options.onEnter')`:
   - `rea` + Enter → `#rea` added, `onEnter` called once;
   - `rea` + ArrowDown + Enter with `react` available → `#react` added, called once;
   - Enter on an empty input → nothing added, called once, and `onKeyPress` returns `true`;
   - `rea` + Space, `rea` + Tab (suggestion open), `rea` + comma, `zzz` + Space → tag added, not called;
   - `selectSuggestion('react')` → not called;
   - `onInputChange('rea ')` with `react` available → `#react` added, not called;
   - `rea` + Tab with no matching tags → `rea` added, not called;
   - pasting `a, b` → not called;
   - a new `onEnter` passed on rerender is the one called;
   - no `options` passed → nothing throws.
2. **`TagChipsInput`: blur on Enter only.** Pass `{ onEnter: () => inputRef.current?.blur() }`. Keep the dropdown's `onMouseDown` `preventDefault`, which now does what it did before SPEC 24: the tap never takes focus from the input.

   Tests in `tests/components/TagChipsInput.test.tsx`: rewrite the `describe('blur on add')` block as `describe('Enter blurs, other adds keep focus')`:
   - type `rea`, press Space → `#react` chip rendered and the input is still focused;
   - type `rea`, mouse-down on the `#react` row → chip rendered and the input is still focused;
   - type `rea`, press comma → chip rendered and the input is still focused;
   - type `zzz`, press Enter → chip rendered and the input is not focused;
   - press Enter on an empty focused input → no chip, the input is not focused, and the keydown event is `defaultPrevented`.
3. **Docs.**
   - In CLAUDE.md feature #3, replace the SPEC 24 sentence ("adding a tag in the `useTagInput` inputs … blurs the input on every device …") with: "In the `useTagInput` inputs, Enter blurs the input on every device, even when the input is empty, so the mobile keyboard closes (`useTagInput`'s `onEnter` option, with the blur done by `TagChipsInput`). Space, Tab completion, comma and tapping a suggestion add the tag and keep focus. Tab with no suggestions still moves to the next field, and paste keeps focus."
   - Add `> **Superseded by:** SPEC 39` to the header of `specs/24-tag-pick-closes-keyboard.md`.

## Acceptance criteria

- [ ] On iOS Safari, in the Add link form, typing `rea` and pressing Space adds `#react` and the keyboard stays open.
- [ ] On iOS, typing `rea` and tapping `#react` in the list adds the chip and the keyboard stays open.
- [ ] On iOS, after adding two tags with Space, pressing Return on the empty input closes the keyboard and doesn't submit the form.
- [ ] On iOS, typing `zzz` and pressing Return adds `#zzz` and closes the keyboard.
- [ ] On Android Chrome, typing `rea` + Space adds `#react` and the keyboard stays open.
- [ ] Same checks in the Edit link modal and the import form's "Tags for imported links".
- [ ] On desktop, Space, Tab completion, comma and clicking a suggestion each add the tag and leave the input focused.
- [ ] On desktop, Enter (with text, with a highlighted suggestion, or on an empty input) leaves the input unfocused and doesn't submit the form.
- [ ] On desktop, typing a word with no matching tags and pressing Tab adds it and moves focus to the next field.
- [ ] Pasting `a, b` adds both chips and keeps focus.
- [ ] Inside the Edit link modal, Escape still closes the modal after Enter blurred the input.
- [ ] `SearchBar` behaviour is unchanged.
- [ ] `grep -r onTagAdded lib components app tests` returns nothing.
- [ ] `npm test` passes, including the rewritten tests.

## Decisions

- **Yes:** Enter is the only key that blurs. Space, Tab, comma and taps keep focus, as the user chose. **No:** keeping SPEC 24's "every add blurs", which made adding several tags slow.
- **Yes:** tapping a suggestion keeps focus. A tap is "pick this one", not "done". Enter is the one way to finish.
- **Yes:** Enter on an empty input blurs too. After adding tags with Space, the input is empty, and Enter there is the natural way to finish. **No:** blurring only when Enter added a tag. That would leave no key to close the keyboard after Space.
- **Yes:** Enter on an empty input still calls `preventDefault`. **No:** letting it submit the form. Closing the keyboard and saving the link stay separate actions.
- **Yes:** every device, as the user chose. **No:** a touch-only rule.
- **Yes:** rename the option to `onEnter`. The old name `onTagAdded` would be wrong, because it now fires without a tag being added and doesn't fire on most adds. There is only one caller.
- **Yes:** Tab with no suggestions keeps the browser's own focus move (unchanged from SPEC 24).

## Risks

| Risk | Mitigation |
| --- | --- |
| Some Android keyboards send `Unidentified` instead of `Enter` on keydown, so Return wouldn't blur there | Most send `Enter` for Return. If a device doesn't, the keyboard stays open, which is the pre-SPEC-24 behaviour (harmless). It can be handled in a follow-up spec using `enterKeyHint`/`beforeinput`. |
| On iOS the keyboard now covers the Save button while you add tags | That's what the user asked for. Return closes it in one tap. |
| SPEC 23's Space keydown and the Android trailing-space path both fire for one press | Unchanged: keydown calls `preventDefault`, so only one path adds the tag, and neither blurs now. |
| Focus lands on `<body>` inside a dialog after Enter | Same as SPEC 24: `useDialog` listens on `document`, so Escape and Tab still work. |

## What is **not** in this spec

- `SearchBar` or `TagMergeForm`.
- Changes to paste, Backspace, chip removal or Escape.
- A setting, or a touch-only rule.
- Focusing another element, scrolling, or submitting the form after Enter.

Each one of those, if it lands, goes in its own spec.
