# SPEC 31 — Show a fallback title for links saved without one

> **Status:** Draft
> **Depends on:** SPEC 13 (URL path fallback title)
> **Date:** 2026-11-02
> **Objective:** A link with no stored title shows its URL path, or hostname, wherever a title is displayed, so no card has a blank heading.

## Why this spec exists

SPEC 13 fills in a title only for new links and non-v2 imports. Older links and v2 restores can still have a null title. `LinkCard` renders `{link.title}` as the only content of its main link, so such a card has a blank, unlabeled heading. `BottomSheet` has the same gap, while `TrashCard` and `LinkListHeader` fall back to the raw URL.

## Scope

**In:**

- A `displayTitle(link)` helper that returns the title, or `titleFromUrl(link.url)` when the title is null or empty.
- Used by `LinkCard`, `BottomSheet`, `TrashCard` and the Undo button's tooltip in `LinkListHeader`.
- `CLAUDE.md` updated.

**Must keep working, unchanged:**

- The stored title stays null. Nothing is written to the database.
- The edit form's Title field stays empty for these links. Saving the form already stores the fallback (SPEC 13).
- v2 export still writes a null title as null.

**Out of scope (for future specs):**

- Rewriting existing rows to store a title.
- Fetching real titles for old links.
- Making the path more readable.
- Including the fallback title in alphabetical sort.

## Data model

This feature introduces no new data and no DB change.

```ts
// lib/utils/urlTitle.ts
export function displayTitle(link: { title: string | null; url: string }): string
```

## Implementation plan

1. **Add `displayTitle`** next to `titleFromUrl`.
2. **Use it** in the four components listed in Scope.
3. **Add tests:** the helper with a real title, null, an empty string and a URL with no path; `LinkCard` and `BottomSheet` with a null title.

## Acceptance criteria

- [ ] A link with a null title and URL `https://www.instagram.com/reel/abc/` shows `reel/abc` on its card, with the link still clickable.
- [ ] A link with a null title and URL `https://example.com/` shows `example.com`.
- [ ] The ··· sheet, Trash card and Undo tooltip show the same text.
- [ ] A link with a real title shows it unchanged.
- [ ] Opening Edit on a null-title link shows an empty Title field.
- [ ] Viewing these links writes nothing to the database.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** a display-only fallback. It's a small change, and needs no data rewrite. **No:** a backfill. Titles are encrypted, so a migration can't do it; it would have to decrypt and re-encrypt every affected link in the browser. A stored fallback could also block a real title from being fetched later.
- **Yes:** the same rule as SPEC 13, so old and new links look alike.
- **Yes:** `TrashCard` changes from the full URL to the same text, for consistency. This is a small visible change.

## Risks

| Risk | Mitigation |
| --- | --- |
| A search for the fallback text doesn't match on title | Search already covers the URL, so the same words still match. |
| Alphabetical sort doesn't follow the displayed text | Accepted. It keeps today's order for null titles and is out of scope. |
| Opaque paths look weak | Accepted in SPEC 13, and still better than a blank heading. |

## What is **not** in this spec

- A data backfill.
- Fetching real titles for old links.
- Prettifying the path.
- Alphabetical sort changes.

Each one of those, if it lands, goes in its own spec.
