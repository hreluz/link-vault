# SPEC 46 — Show a link's collections on dashboard cards

> **Status:** Approved
> **Depends on:** SPEC 40, SPEC 42
> **Date:** 2026-11-25
> **Objective:** Each card on `/dashboard` shows the collections its link belongs to as tappable chips, so you can tell where a link is filed without opening it.

## Why this spec exists

You can only see a link's collections today by opening the ··· picker or the Edit form. SPEC 40 set this work aside together with a Collection filter. SPEC 44 and 45 later took over its number. This spec takes 46 and covers the chips only. The filter moves to SPEC 47. Older specs stay as written. CLAUDE.md is updated.

## Scope

**In:**
- A new row on `LinkCard`, right above the status and tags row, rendered only when the card gets a `collections` prop with at least one entry.
- The row shows up to 2 chips. Order is most recently added first (`collection_links.added_at` desc; ties broken by collection name, A→Z).
- Each chip shows the collection's emoji, or `FolderIcon` when it has none, plus its name, truncated with an ellipsis.
- Each chip has a `title` with the collection's full name, so a mouse user can read a truncated name on hover.
- Each chip is a Next `<Link>` to `/dashboard/organize/collections/<id>`, accessible name `Open collection <name>`. It must be a Next `<Link>`, not a plain `<a>`: client navigation keeps the vault key in `VaultContext`, and a full page load would lock the vault again.
- Leaving `/dashboard` through a chip works like any other in-app navigation. Pending move-to-end timers are dropped with the page, and the Undo slot is cleared.
- A tap on a chip or `+N` while its card is swiped open only closes the card. `SwipeableCard`'s capture-phase click handler already calls `preventDefault`/`stopPropagation`, so nothing new is built for this. A test pins the behavior.
- With 3 or more collections, a `+N` button follows the 2 chips (N = total − 2). It has `aria-label` `Show all <total> collections` and `aria-haspopup="dialog"`. It opens `CollectionPickerSheet` for that link, which already lists all of the link's collections, ticked, when the query is empty. Closing the picker returns focus to the `+N` button.
- Chips and `+N` are `relative z-10` so they sit above the stretched title link. They use `focus-ring` and `min-h-11 sm:min-h-9`. Colors come from `surface-*` tokens only. They're styled apart from tag chips (outlined, with the emoji or folder icon), with these classes:
  - Chip, light mode: `border border-surface-300 bg-surface-card text-surface-700 hover:bg-surface-50 hover:text-surface-900`.
  - Chip, dark mode: `dark:border-surface-600 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100`.
  - `+N`: the same sizes with `border-dashed`, `bg-surface-50 text-surface-600` and `dark:bg-surface-800 dark:text-surface-300`.
  - `FolderIcon`: `h-3.5 w-3.5`, the text colour.
- Every chip and `+N` is a Tab stop, so a card gains up to 3 Tab stops. They come after the title link and before the status and tags row, in DOM order.
- Data on the dashboard:
  - The memberships of every link the list holds, fetched in batches, only for ids not yet fetched. The input is `useLinkListQuery`'s `loadedLinks`: every loaded link, including moved links held back for the end. So a new page, a free-text search (Branch B candidates), or unlocking private tags fetches memberships for any card that newly appears.
  - A response that arrives after ↻, or after the vault key changes, is dropped (a generation counter bumped on each reload), so a late answer never overwrites newer data.
  - The user's collections (`getCollections(dek)`, decrypted), loaded once per list load.
  - ↻ refresh reloads both.
- Live updates without a reload:
  - A tick or untick in the ··· / `+N` picker updates that card's chips.
  - Saving the Edit modal with collection changes updates them.
  - Adding a link with collections updates them.
  - A collection id that isn't in the loaded collections triggers one reload of the collections. This covers one just created with `+ Create` in the picker (through `applyMembershipChange`) or in the Add/Edit form (through `reloadLinkCollections`). While that reload is in flight, a second unknown id doesn't start another one.
- If memberships or collections fail to load, cards show no chips, no toast and no message. ↻ tries again.
- CLAUDE.md:
  - Feature #19: chips on dashboard cards are SPEC 46. The Collection filter is SPEC 47.
  - The `LinkCard` description gets the new row.

**Out of scope (for future specs):**
- A Collection filter in `FilterSheet` and the `search_links` RPC (SPEC 47).
- Chips on the collection page (`CollectionDetail`), in Trash, or in `BottomSheet`.
- Live updates for collections renamed, re-emojied or deleted in another page or tab. They show after ↻ or a reload, the same rule as Trash restore.
- Live updates for collections created or filled by an import. They show after ↻ or a reload, the same rule the link list already follows for imports.
- Expanding the card in place to show every chip.
- A loading placeholder for the chips row.

## Data model

There's no new table or migration. The existing `collection_links_link_id_idx` index covers the batched lookup.

```ts
// lib/services/collections.ts
export type LinkCollectionRef = { collection_id: string; link_id: string; added_at: string }
/** Memberships of the given links, in batches of 200 ids (`.in('link_id', …)`). Throws on a database error. */
export async function getMembershipsForLinks(linkIds: string[]): Promise<LinkCollectionRef[]>

// What LinkCard receives (already resolved and sorted)
export type CardCollection = { id: string; name: string; emoji: string | null }
```

New hook `lib/hooks/links/list/useLinkCollectionChips.ts`, composed in `useLinkList` and exposed through `LinkListContext`:
- State:
  - `collectionsById: Map<string, Collection>`
  - `refsByLink: Map<string, LinkCollectionRef[]>`
  - `fetchedIds: Set<string>`
  - `failed: boolean`
  - `generation` (a ref): bumped on `refreshKey` or a `dek` change. Responses from an older generation are ignored.
  - `collectionsReloading` (a ref): true while an unknown-id reload of the collections is in flight.
- Inputs: `loadedLinks` ids, `dek`, `refreshKey`.
- Returns:
  - `collectionsFor(linkId): CardCollection[]`. It returns refs sorted by `added_at` desc, then name. Refs whose collection isn't loaded are dropped. It returns `[]` while loading or after an error.
  - `applyMembershipChange(linkId, collectionId, isMember, membership?)`. It's an optimistic local update fed by the picker's `MembershipChangeHandler`. It reloads the collections when `collectionId` is unknown.
  - `reloadLinkCollections(linkId)`. It re-fetches one link's refs, used after an Add or Edit save. It reloads the collections when it finds an unknown id.

## Implementation plan

1. **Service.** Add `getMembershipsForLinks` and `LinkCollectionRef` to `lib/services/collections.ts`. Tests go in the existing collections service test file and cover:
   - batching at 200;
   - an empty input makes no request;
   - a DB error throws.
2. **Hook.** Write `useLinkCollectionChips` and its tests in `tests/hooks/links/list/useLinkCollectionChips.test.ts`, covering:
   - it fetches only ids it hasn't fetched yet, including ids that appear later in the input (a new page, a search, an unlock);
   - `refreshKey` refetches both lists;
   - a response from before a `refreshKey` change is ignored;
   - sort order, including the name tie-break;
   - unknown ids are dropped;
   - an unknown id from `reloadLinkCollections` or `applyMembershipChange` reloads the collections once, even when two unknown ids arrive together;
   - `applyMembershipChange` adds and removes;
   - an error returns `[]` and shows no toast.
3. **Card UI.**
   - `LinkCard` gets the optional props `collections?: CardCollection[]` and `onShowAllCollections?: () => void`.
   - Render the row as described in Scope. Use a sub-component `app/dashboard/link/CardCollections.tsx` so `LinkCard` stays small.
   - Tests in `tests/components/LinkCard.test.tsx`:
     - no row without the prop, or with an empty array;
     - with 1 or 2 collections, only chips and no `+N`;
     - with 5, 2 chips plus `+3`;
     - hrefs, accessible names and the full-name `title`;
     - `FolderIcon` when there's no emoji;
     - `+N` calls `onShowAllCollections`;
     - a chip click doesn't call `onOpen`;
     - the chips row comes before the status/tags row in DOM order.
   - Test in `tests/components/SwipeableCard.test.tsx`, or the `LinkCard` test: with the card swiped open, a click on a chip closes the card and navigation is prevented (`defaultPrevented`).
4. **Wire the dashboard.**
   - Compose the hook in `useLinkList` and expose `collectionsFor`, `applyMembershipChange` and `reloadLinkCollections` on the context.
   - Lift `pickerLink` from `LinkModals` local state into the context, for example `useLinkModals`, so `LinkGrid` can open it.
   - `LinkGrid` passes `collections={collectionsFor(link.id)}` and `onShowAllCollections`.
   - The picker gets `onMembershipChange={applyMembershipChange}`.
   - `returnFocus` goes to the `+N` button when the picker was opened from it (`data-collections-more=<link id>`), and to `Link options` otherwise.
   - `EditLinkModal`'s `onSave(updated, collectionIds)` calls `reloadLinkCollections` when `collectionIds !== null`.
   - `AddLinkModal`'s `onSuccess` calls `reloadLinkCollections(link.id)`. `useAddLinkForm` saves the collections before it returns, so the refetch sees them.
   - `CollectionDetail` passes no `collections` prop, so it doesn't change.
   - Wiring tests, next to the existing `LinkGrid`/`LinkModals`/`useLinkList` tests:
     - `+N` opens the picker for that link, and closing it returns focus to `+N`;
     - opening the picker from ··· still returns focus to `Link options`;
     - a picker tick updates the card's chips;
     - an Edit save with `collectionIds !== null` calls `reloadLinkCollections`, and one with `null` doesn't;
     - an Add calls it for the new link;
     - `CollectionDetail` renders no chips row.
5. **Docs.** Update CLAUDE.md (#19, the `LinkCard` row, SPEC 47 for the filter).
6. **Browser check** (CLAUDE.md, Manual browser verification). On port 3500, with at least one link in 0, 1 and 5 collections:
   - screenshot `/dashboard` in light and dark mode at desktop width (1280) and phone width (390);
   - click `+3`, then a chip, and capture the network calls (`collection_links`) and console errors;
   - save the screenshots to `.verification-screenshots/spec-46-collection-chips-on-cards_<date>/` with a `README.md`.

## Acceptance criteria

- [ ] On `/dashboard`, a card whose link is in 1 collection shows one chip with that collection's emoji (or `FolderIcon`) and name, on its own row directly above the status/tags row.
- [ ] A card whose link is in no collection has no collections row, and its height is unchanged from today.
- [ ] A link in 5 collections shows exactly 2 chips plus a `+3` button. The 2 chips are the collections the link was added to most recently.
- [ ] Clicking a chip navigates to `/dashboard/organize/collections/<id>` and doesn't open the link or move its status to `watching`.
- [ ] Clicking `+3` opens the `Add to collection…` sheet listing all 5 collections ticked. Closing it puts focus back on `+3`.
- [ ] Unticking a collection in that sheet removes its chip from the card without a reload. Ticking a new one adds it as the first chip.
- [ ] Saving the Edit modal after removing a collection chip, or after creating a new collection in the form, updates the card's chips without a reload.
- [ ] Adding a link with a collection shows its chip on the new card right away.
- [ ] With the memberships request failing, cards render with no chips and no error toast, and the list works as before.
- [ ] Loading another page fetches memberships only for that page's new link ids.
- [ ] Cards on `/dashboard/organize/collections/<id>` show no collections row.
- [ ] Chips and `+N` are at least 44px tall below `sm`, show the `focus-ring` outline on keyboard focus, and use no hardcoded gray or indigo classes.
- [ ] In dark mode, chips and `+N` use the `dark:` classes from Scope, and their text meets 4.5:1 against the card background.
- [ ] Hovering a truncated chip shows the collection's full name (`title`).
- [ ] Clicking a chip keeps the vault unlocked: the collection page renders its links, not the vault-locked screen.
- [ ] On a card that's swiped open, tapping a chip closes the card and doesn't navigate.
- [ ] Ticking `+ Create "X"` in the picker shows an `X` chip on the card without ↻.
- [ ] Typing a search, or unlocking private tags, shows chips on cards that only then appear, with no ↻.
- [ ] A memberships response that arrives after ↻ doesn't replace the data ↻ loaded.
- [ ] Tab order on a card goes title → chips → `+N` → action buttons.
- [ ] The browser check (implementation step 6) is done, and its screenshots and `README.md` are in `.verification-screenshots/`.
- [ ] `npm test` passes, and the touched files lint clean (`npx eslint <files>`).
- [ ] CLAUDE.md names the chips SPEC 46 and the Collection filter SPEC 47.

## Decisions

- **Yes:** chips only. The filter changes `filtered_links`/`search_links` and `LinkFilterParams`, so it's SPEC 47.
- **Yes:** a separate row above status and tags. Collections read differently from tags. The user picked it from the mockups.
- **No:** next to the category pill, or mixed into the tags row. Too crowded, and the chips could be mistaken for tags.
- **Yes:** 2 chips plus `+N`. Cards stay compact in the grid.
- **No:** show all chips, or one summary chip.
- **Yes:** most recently added first. The newest filing is the most likely to matter. The user picked this over recently updated and alphabetical.
- **Yes:** chips link to the collection, which makes them a shortcut. `+N` reuses the existing picker, so there's no new sheet to build.
- **Yes:** a batched membership fetch per loaded page, plus one `getCollections` per load. No SQL change, and names stay encrypted client-side (ENCRYPTION.md).
- **No:** returning collection ids from `search_links`. That needs an RPC change for display-only data.
- **Yes:** an optimistic update from the picker, which already gives the inserted membership with `added_at`. Add and Edit re-fetch that one link's refs, because they don't return `added_at`.
- **Yes:** fail silently with no chips. The chips are extra information, and an error shouldn't get in the way of the list.
- **Yes:** dashboard only, through an optional prop. On the collection page the current collection is already obvious.
- **No:** a skeleton for the chips row. One short request per page. A short layout shift is accepted.
- **Yes:** each chip and `+N` is its own Tab stop (up to 3 more per card). A chip is a real link to a real place. Putting them all behind one control would hide the shortcut from keyboard users.
- **Yes:** a `title` tooltip on chips. Truncated names need a way to be read with a mouse, and screen readers already get the full name from the accessible name.
- **Yes:** follow `loadedLinks`, not "pages". Search, private-tag unlocks and held-back moved links all change which cards exist without a new page.
- **Yes:** a generation guard on responses. ↻ and vault changes can overlap an in-flight fetch.
- **Yes:** rely on `SwipeableCard`'s existing capture handler for taps on an open card, and pin it with a test instead of adding chip-specific code.
- **Yes:** list the dark-mode classes in the spec. Leaving them to the implementer is how contrast regressions happen (SPEC 37).

## Risks

| Risk | Mitigation |
| --- | --- |
| The row appears a moment after the cards and shifts layout | The request is small and runs once per page. Rows only appear for links that have collections. If the shift turns out to be bad, a placeholder is a follow-up. |
| A chip tap also triggers the stretched title link (opens the link, Unread → Watching) | Chips are `relative z-10`, like the action buttons. A test checks that `onOpen` isn't called. |
| Stale names after renaming a collection on another page | The dashboard remounts on navigation, and ↻ reloads. Other tabs are out of scope. |
| A very long `.in()` list after many pages | Batches of 200 ids. Only ids not yet fetched are requested. |
| A late response overwrites fresher data after ↻ | A generation counter. Responses from an older generation are ignored, and a test covers it. |
| A chip built as a plain `<a>` reloads the page and locks the vault | The spec requires Next `<Link>`, and the browser check clicks a chip and confirms the collection page shows its links. |
| Leaving through a chip drops a pending move-to-end | Expected and the same as any other in-app navigation. It's stated in Scope so it isn't reported as a bug. |

## What is **not** in this spec

- The Collection filter (SPEC 47).
- Chips on the collection page, in Trash or in the ··· sheet.
- Expanding the chips in place, or a chips skeleton.
- Live updates from other tabs.

