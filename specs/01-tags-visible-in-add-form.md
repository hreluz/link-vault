# SPEC 01 — Tags input visible in the collapsed Add Link form

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-10-15
> **Objective:** Show the Tags input right after the URL in both the Add and Edit Link forms, so the Add form no longer hides it behind "More options".

## Scope

**In:**

- In `LinkForm`, render `TagsField` directly after the URL field and image preview, for both the Add Link modal (`collapsible`) and the Edit Link modal.
- In the Add Link modal, `TagsField` sits above the "More options" toggle and is visible without expanding.
- When the add form is expanded, `TagsField` stays in that same position (above Title) and is not rendered a second time.
- The Edit Link modal uses the same order: URL → image preview → Tags → Title → Description → Category/Status → Duration → Notes.
- Update `tests/components/LinkForm.test.tsx` to cover the new placement.

**Out of scope (for future specs):**

- Showing existing tags as tappable chips/suggestions before typing.
- Changes to `BulkTagModal` or `SearchBar` tag inputs.
- Any change to `useTagInput` behavior, autocomplete, or tag parsing.
- Moving any other field (Title, Category, etc.) out of "More options".

## Data model

This feature introduces no new data structures. It reuses the existing `tags` string in `LinkFormContext` and the existing `TagsField` component.

## Implementation plan

1. In `app/dashboard/link/LinkForm/index.tsx`, move `<TagsField />` out of the `expanded` block and render it unconditionally right after the image-preview block. Exactly one `TagsField` is mounted at any time, so half-typed tag input survives toggling "More options". Manual check: open Add Link, the Tags input is visible under the URL, and expand/collapse keeps it in place with its contents; open Edit Link, Tags sits between the URL/preview and Title.
2. In `tests/components/LinkForm.test.tsx`, add tests:
   - collapsed add form (`collapsible = true`) exposes the `Tags` input via its label;
   - expanded add form renders exactly one `Tags` input, and it comes before `Title` in DOM order;
   - non-collapsible (edit) form renders `Tags` after `URL` and before `Title` in DOM order.
3. Update the `CLAUDE.md` Playwright gotcha "The Add Link modal hides most fields behind 'More options'" to say URL and Tags are visible by default.

## Acceptance criteria

- [ ] Opening the Add Link modal shows the URL input and the Tags input without clicking "More options".
- [ ] With an og:image fetched, the Add form order is URL → image preview → Tags → "More options".
- [ ] Clicking "More options" reveals Title, Description, Category/Status, Duration, Notes; Tags remains above Title and appears once.
- [ ] Text typed in the Tags input (confirmed tags and unconfirmed text) is preserved after toggling "More options" open and closed.
- [ ] Tag autocomplete, ↑/↓/Tab/Enter/Escape navigation, and removing a chip work in the collapsed state.
- [ ] Saving a link with tags entered in the collapsed state persists those tags.
- [ ] The Edit Link modal order is URL → image preview → Tags → Title → Description → Category/Status → Duration → Notes.
- [ ] Editing a link's tags in the Edit modal and saving persists them.
- [ ] `npm test` passes, including the new `LinkForm` tests.

## Decisions

- **Yes:** Tags directly after URL/preview in the add form. It is the field the user wants without extra clicks.
- **Yes:** Tags keeps the same position when expanded. Avoids a layout jump and avoids remounting `TagsField`, which would drop unconfirmed input held in `useTagInput` local state.
- **No:** Moving Tags back to its original slot on expand. Causes the jump/remount above.
- **Yes:** The Edit form uses the same order as the Add form. Both forms then share one layout, and `LinkForm` needs no `collapsible`-dependent placement.
- **No:** Keeping the Edit form's old order (Tags between Category/Status and Duration). It would make the two forms inconsistent for no benefit.
- **No:** Pre-typing tag suggestions/chips. Considered, but the user asked only for the input to be visible; that would be its own spec.

## What is **not** in this spec

- Tag chips/suggestions shown before typing.
- Bulk tag modal or search bar changes.
- Moving any other field out of "More options".
