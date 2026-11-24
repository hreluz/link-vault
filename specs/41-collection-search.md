# SPEC 41 — Search inside collections

> **Status:** Approved
> **Depends on:** SPEC 40
> **Date:** 2026-11-24
> **Objective:** Users can filter the Collections list by name or description, and filter the links inside a collection with the dashboard's own search rules, from a search box on each page.

## Why this spec exists

SPEC 40 shipped collections with no way to find things inside them. A user with many collections scrolls the list to find one. A long collection ("Learn Rust", 60 links) has no way to jump to a link by title or tag.

Everything on both pages is already loaded and decrypted in memory, and there's no pagination. So both searches are pure client-side filters over data the page already holds. Nothing new is fetched or stored.

Numbered 41 because it builds directly on SPEC 40. Collection chips + a Collection filter on `/dashboard` moved to SPEC 42, and collections in export/import to SPEC 43.

## Scope

**In:**

- **`SearchBar` gets two optional props.** `label` (the sr-only label, default `Search links`) and `placeholder` (default: today's responsive placeholder, `Search by title, domain, tag… or #tag for tag-only` from `sm` up and `Search or #tag` below). Callers that pass neither (`LinkSearchBar`, `TrashList`) look and behave exactly as today.
- **Collections list page** (`/dashboard/organize/collections`, `CollectionList`):
  - a `SearchBar` under the page header (above the `+ New` form when it's open), with `label` `Search collections` and `placeholder` `Search collections`, no Filters button, no tag suggestions (`availableTags` not passed);
  - shown only once the list has loaded with at least one collection. Hidden while loading, on the load error and on the "No collections yet." empty state;
  - matching: the trimmed query is a case-insensitive substring of the collection's **name or description**. An empty trimmed query shows every collection. Order stays the list's order (recently updated first);
  - filtering runs on every keystroke, with no debounce;
  - while the trimmed query is non-empty, a muted line under the box reads `Showing X of N collections` (`1 collection` when `N` is 1). It is a `role="status"` region, so screen readers hear the count change. The header's `N collections` subtitle stays the full count;
  - no match: `No collections match "<query>".` with a secondary `Clear search` button that empties the query and focuses the search input;
  - saving a new collection from `+ New` clears the query, so the new row is visible;
  - **description on matched rows:** rows don't show the description today. While the trimmed query is non-empty, a row whose description contains the query shows it as one truncated muted line under the name (`CollectionRow` gets an optional `showDescription` prop). With no query, rows look as today.
- **Collection page** (`/dashboard/organize/collections/[id]`, `CollectionDetail`):
  - a `SearchBar` between the header and the list, with `label` `Search this collection`, the default placeholder, no Filters button, `availableTags` from `useAvailableTags()` (so `#tag` autocomplete works as on `/dashboard`), and `isHashTagSearch` when the query contains a `#word` (the same `/#(\w+)/` test as `useLinkFilters`);
  - shown only when the collection has at least one visible link. Hidden while loading, on load errors, on "Collection not found" and on "No links in this collection yet.";
  - matching is the dashboard's rule, applied to `visibleRows` (so Trash and locked-private links stay out, as today):
    - `#tag` tokens that name an existing tag become a tag filter with `any` matching (`parseHashtagQuery`);
    - the rest is matched with `matchesTextSearch` (title, URL, site name, notes, tag names, case-insensitive substring);
  - filtering runs on every keystroke, with no debounce. An empty trimmed query shows every visible row;
  - **numbers:** each shown row keeps its number in the full visible list (e.g. `3`, `7`, `12`), not a renumbered `1..X`;
  - **▲/▼ are hidden** on every row while the trimmed query is non-empty. ✕ and every card action (open, favorite, Edit, ···, Delete, swipe) still work. Clearing the query brings ▲/▼ back;
  - while the trimmed query is non-empty, a muted line under the box reads `Showing X of N links` (`1 link` when `N` is 1), where `N` is the header's visible count. It is a `role="status"` region, like the list page's;
  - the header's `N links · M done` and `Play next` ignore the search and keep using the whole collection;
  - **Play next while searching** opens the next link as today and marks it "Last opened". If that row is shown under the current search it is scrolled into view as today. If it isn't shown, nothing scrolls and the query stays;
  - **✕ while searching:** focus goes to the next shown row's ✕, else the previous shown row's ✕. If no shown row is left but the collection still has visible links, focus goes to the search input (the no-match state appears). If the collection itself is now empty, see the next rule;
  - **the collection becomes empty while searching** (the last visible link is removed with ✕, deleted, or hidden by locking private tags): the query is cleared, so an Undo, a Trash restore or an unlock doesn't bring back a hidden filter. The search box hides and "No links in this collection yet." shows. After ✕, focus goes to `+ Add links`, as SPEC 40 already does;
  - **`+ Add links` while searching:** a successful add clears the query, then scrolls to the first new link as today, so the new links are visible;
  - a row that stops matching after an edit (title, notes or tags) disappears from the results right away (the filter is derived, not a snapshot). Status isn't part of the match, so a status change never hides a row. Locking or unlocking private tags re-filters the results too;
  - **focus after the Edit modal closes on a row that no longer matches:** the card's Edit button is gone, so `EditLinkModal`'s `returnFocus` falls back to the search input instead of leaving focus on `body`. `CollectionDetail` passes that fallback in; the dashboard is unchanged;
  - no match: `No links match "<query>".` with a secondary `Clear search` button that empties the query and focuses the search input;
  - the query is page state only. It resets when the user leaves the page or reloads.
- **Shared matching helpers (pure):**
  - `lib/utils/collectionSearch.ts`: new `filterCollectionsByText(items, query)` — trimmed, case-insensitive substring over `name` and `description`; an empty query returns all items; order kept. `filterCollectionsByName` stays unchanged (an empty query there still matches nothing, as the picker and form field need);
  - `lib/hooks/links/list/linkFilterMatch.ts`: new `matchesParsedQuery(link, { textSearch, tagIds }, tagNameById)` — the `any` tag check plus `matchesTextSearch`. `useAddLinksToCollection` switches to it, with the same results as today.
- **Hooks** (per *Splitting overloaded hooks*):
  - `lib/hooks/collections/useCollectionListSearch.ts` — owns `query`/`setQuery`, returns `filteredCollections`, `isSearching`, `clearSearch`. Composed in `useCollections`, which also clears the query after a successful add;
  - `lib/hooks/collections/useCollectionSearch.ts` — takes `visibleRows`, owns `query`/`setQuery`, returns `shownRows` (each with its `number` in `visibleRows`), `isSearching`, `isHashTagSearch`, `clearSearch`. Uses `useTagsContext().tags` and `useTagNameLookup()`. Composed in `useCollectionDetail`, which clears the query after a successful `appendLinks`.
- `CollectionLinkRowItem` gets a `showMoveButtons` prop (default `true`). When `false`, ▲/▼ are not rendered; the number and ✕ keep their places in both layouts.
- `EditLinkModal` gets an optional `fallbackFocus` callback, used by its `returnFocus` when the card's `[data-link-edit]` button isn't in the DOM.
- Tests (see plan).
- CLAUDE.md: feature #19 mentions both search boxes and the ▲/▼ rule; the `SearchBar` note covers the new props.

**Out of scope (for future specs):**

- Search on the Categories, Tags or Organize hub pages.
- Filters (status, category, favorites) or sorting inside a collection.
- Searching collections by the links they contain.
- Keeping the query in the URL or across visits.
- Reordering (▲/▼ or otherwise) while a search is active.
- Renumbering the results `1..X`.
- Counts or Play next that follow the search.
- Highlighting the matched text.
- A search box in the empty states.

## Data model

This feature introduces no new data, tables, RPCs or persisted state. It reuses SPEC 40's model. The new shapes are in-memory only:

```ts
// lib/hooks/collections/useCollectionSearch.ts
type ShownCollectionRow = CollectionLinkRow & { number: number } // place in visibleRows, 1-based

// lib/hooks/links/list/linkFilterMatch.ts
type ParsedLinkQuery = { textSearch: string; tagIds: string[] } // what parseHashtagQuery returns
```

## Implementation plan

1. **Helpers.**
   - Add `filterCollectionsByText` to `lib/utils/collectionSearch.ts`. Tests in `tests/utils/collectionSearch.test.ts`: name match, description match, null description, case, trim, empty query returns all, order kept.
   - Add `matchesParsedQuery` to `lib/hooks/links/list/linkFilterMatch.ts` and switch `useAddLinksToCollection` to it. Tests in `tests/hooks/links/list/linkFilterMatch.test.ts`: tag-only, text-only, both, no tag ids. `tests/hooks/collections/useAddLinksToCollection.test.ts` stays green unchanged.
2. **`SearchBar` props.** Add optional `label` and `placeholder`. Tests in `tests/components/SearchBar.test.tsx` (new): defaults unchanged, custom label and placeholder rendered.
3. **List search hook.** `useCollectionListSearch(collections)`; compose in `useCollections`, clearing the query after a successful `handleAdd`. Tests in `tests/hooks/collections/useCollectionListSearch.test.ts`. One composed test (add clears the query) in a new `tests/hooks/collections/useCollections.test.ts`.
4. **List page UI.** `CollectionRow` gets `showDescription`. `CollectionList` renders the `SearchBar`, the `Showing X of N collections` line, the filtered rows and the no-match state with `Clear search`. Tests in a new `tests/components/CollectionList.test.tsx`: hidden on empty/loading/error, filters by name and description, description line shown only while searching and only on description matches, result line, no-match + Clear search focuses the input.
5. **Detail search hook.** `useCollectionSearch(visibleRows)`; compose in `useCollectionDetail`, clearing the query after a successful `appendLinks`. Tests in `tests/hooks/collections/useCollectionSearch.test.ts`: text match, `#tag` match, unknown `#tag` as text, numbers kept, `isHashTagSearch`, rows re-filter when a link changes, private/Trash rows never shown.
6. **Row item.** `showMoveButtons` on `CollectionLinkRowItem`.
7. **Edit modal focus fallback.** Optional `fallbackFocus` on `EditLinkModal`. Test in its existing test file (or a new `tests/components/EditLinkModal.test.tsx`): focus goes to the fallback when the edit button is gone.
8. **Detail page UI.** `CollectionDetail` renders the `SearchBar`, the result line, `shownRows` with `showMoveButtons={!isSearching}`, the no-match state, and the ✕ focus rule over shown rows (fall back to the search input). Play next scrolls only when its row is shown. Extend `tests/components/CollectionDetail.test.tsx`: box hidden on empty collection, filtering, numbers kept, ▲/▼ hidden while searching and back after clearing, header count and Play next unchanged, ✕ focus fallback to the input, Add links clears the query, Clear search, ✕ on the last link clears the query and focuses `+ Add links`, Edit that makes the row stop matching returns focus to the search input.
9. **Docs.** CLAUDE.md feature #19 and the `SearchBar` note.

## Acceptance criteria

- [ ] On `/dashboard/organize/collections` with at least one collection, a search box labelled `Search collections` appears under the header.
- [ ] The list search box is absent while loading, on the load error and on "No collections yet.".
- [ ] Typing part of a collection's name shows that collection; typing part of only its description also shows it.
- [ ] Matching is case-insensitive and ignores leading/trailing spaces.
- [ ] Results keep the recently-updated-first order.
- [ ] With a query, `Showing X of N collections` is shown under the box, and the header subtitle still shows the full count.
- [ ] A query with no match shows `No collections match "<query>".` and a `Clear search` button; clicking it empties the box, focuses it, and shows every collection.
- [ ] Saving a new collection while a query is active clears the query and the new collection is listed.
- [ ] On a collection page with at least one visible link, a search box labelled `Search this collection` appears between the header and the list.
- [ ] The collection search box is absent while loading, on load errors, on "Collection not found" and on an empty collection.
- [ ] Typing part of a link's title, URL, site name, notes or tag name shows only matching links, updating on every keystroke.
- [ ] `#<existing tag>` shows only links with that tag, with `#tag` autocomplete and the highlighted border as on `/dashboard`.
- [ ] `#<unknown tag>` is matched as plain text.
- [ ] Links in Trash or with a locked private tag never appear in the results.
- [ ] Each shown row keeps its number from the full list (e.g. a match in 7th place shows `7`).
- [ ] With a non-empty query no ▲ or ▼ button is in the DOM; clearing the query brings them back on every row.
- [ ] With a query, ✕ still removes the link from the collection with the `Removed from <name>` toast and Undo.
- [ ] After ✕ on the last shown row, focus lands on the previous shown row's ✕, or on the search input if none is left and the collection still has visible links.
- [ ] After ✕ on the collection's only visible link while searching, the query is cleared, "No links in this collection yet." shows, and focus is on `+ Add links`; Undo brings the link back with an empty search box.
- [ ] Locking private tags so the collection has no visible links clears the query; unlocking shows every link with an empty search box.
- [ ] With a query, `Showing X of N links` is shown under the box, and the header's `N links · M done` is unchanged.
- [ ] With a query that hides the next unwatched link, `Play next` still opens that link and marks it "Last opened", the query stays, and the page doesn't scroll.
- [ ] Adding links through `+ Add links` while a query is active clears the query and scrolls to the first new link.
- [ ] Changing a shown link's title in Edit so it no longer matches removes it from the results without a reload, and focus lands on the search input when the modal closes.
- [ ] Changing a shown link's status never hides it from the results.
- [ ] On the list page, a collection that matched only on its description shows its description under the name while searching, and no row shows a description with an empty query.
- [ ] The `Showing X of N …` lines are `role="status"` regions.
- [ ] A query with no match shows `No links match "<query>".` and a `Clear search` button that empties and focuses the box.
- [ ] Leaving the collection page and coming back shows an empty search box.
- [ ] The search box on `/dashboard` and on Trash shows the same label and placeholder as before this spec.
- [ ] The Add links sheet returns the same results as before this spec.
- [ ] `npm test`, `npm run lint` and `npx tsc --noEmit` pass.

## Decisions

- **Yes:** client-side filtering on both pages. Everything is already loaded and decrypted, and nothing is paginated.
- **No:** a server-side search. Names, descriptions and link content are encrypted; the database can't match them.
- **Yes:** no debounce. The data is small and in memory; the dashboard's 350 ms exists to avoid re-fetching, which doesn't apply here.
- **Yes:** list search matches name and description. Descriptions often say what a collection is about.
- **No:** reusing `filterCollectionsByName` for the list. Its empty query matches nothing (right for the picker, wrong for a list filter), and it ignores descriptions.
- **Yes:** the collection search uses the dashboard's exact rules (`matchesTextSearch` + `parseHashtagQuery`, `any` tags). One mental model for search across the app, and the helpers already exist.
- **Yes:** a shared `matchesParsedQuery` helper used by the collection search and the Add links sheet. The tag-plus-text check was about to be written twice.
- **Yes:** reuse `SearchBar` with two optional props. Same look and `#tag` autocomplete as the dashboard; the defaults keep existing callers unchanged.
- **No:** a separate plain input for the list page. It would duplicate the search styling.
- **Yes:** rows keep their real numbers while searching. The number is the link's place in the playlist; renumbering would hide where it sits.
- **Yes:** ▲/▼ hidden while searching. "Swap with the nearest visible neighbour" against rows the user can't see is confusing.
- **No:** keeping ▲/▼ and swapping in the full order. The other row of the swap could be off screen.
- **Yes:** header counts and Play next ignore the search. They describe the collection's progress, not the current view.
- **Yes:** a `Showing X of N` line while searching, on both pages, so the filtered view is never mistaken for the whole list. (The list-page line mirrors the collection-page answer for consistency.)
- **Yes:** saving a new collection and adding links both clear the query. Otherwise the thing just added could be hidden by the filter.
- **No:** clearing the query on Play next. Play next opens a tab and the user may want to come back to the same search.
- **Yes:** the query is page state only. Quick definition from the clarification phase; no URL param or storage.
- **Yes:** the search box hidden on empty states. There is nothing to search.
- **Yes:** the query is cleared when the collection's visible list empties. A hidden query would otherwise filter links that come back later, with no box to see it in.
- **Yes:** description shown on list rows only while searching, and only when it matched. A row matched on invisible text looks wrong; showing it always would change the list's look outside of search.
- **No:** an Escape-to-clear shortcut. The native `type="search"` clear (✕ / Escape in most browsers) and `Clear search` cover it, and Escape already closes the `#tag` suggestions.
- **No:** a new focus rule for soft delete from a card. Today's behaviour is kept, searching or not.
- **Yes:** numbered 41, keeping specs in build order. The reserved chips/filter and export/import specs moved to 42 and 43.

## Risks

| Risk | Mitigation |
| --- | --- |
| Focus/scroll code in `CollectionDetail` assumes every visible row is rendered (`rowElement` returns null for a filtered-out row). | Play next and ✕ check that the row is shown before scrolling or focusing, with the search input as the fallback. The Edit modal gets the same fallback. Covered by tests. |
| A query left set after the list empties silently filters links that come back. | The query is cleared when the visible list empties. |
| `SearchBar` change regresses `/dashboard` or Trash. | Props are optional with today's values as defaults; a test pins the defaults. |
| Switching `useAddLinksToCollection` to the shared helper changes its results. | Its existing tests must pass unchanged. |

## What is **not** in this spec

- Search on Categories, Tags or the Organize hub.
- Filters or sorting inside a collection.
- Finding collections by the links they contain.
- The query in the URL or kept across visits.
- Reordering while searching, or renumbered results.
- Counts or Play next that follow the search.
- Match highlighting.

Each one of those, if it lands, goes in its own spec.
