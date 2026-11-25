# SPEC 40 — Link collections (playlists)

> **Status:** Approved
> **Depends on:** SPEC 15, SPEC 38
> **Date:** 2026-11-24
> **Objective:** Users can group saved links into named, manually ordered collections (like YouTube playlists), add links to them by searching or creating a collection from the link form or the card menu, and browse each one on its own page under Organize.

## Why this spec exists

Tags say what a link is about. They don't give a list an order or a goal ("Learn Rust, in this order"). A collection is an ordered list of existing links. One link can be in several collections, the way a video can be in several playlists. Collections never own links. Removing a link from a collection or deleting the collection leaves the link saved.

Adding a link to a collection has to be quick. The user types a few letters and picks, the same way Tags work, instead of opening a sheet and scrolling. The ··· sheet works the same way as the form field: type, then pick from the matches.

This spec merges the earlier drafts of SPEC 40 (collections) and SPEC 41 (Collections field after Title, with search and create). The full idea is split in three:

- **SPEC 40 (this one):** data, CRUD, the collection page, manual order, three ways to add links (with search-or-create), and Play next.
- **SPEC 43 (future):** collection chips on `LinkCard` and a Collection filter on `/dashboard` (changes `filtered_links`/`search_links`).
- **SPEC 44 (future):** collections in the "Everything" export and the v2 import.

## Scope

**In:**

- **Collections.** Each one has:
  - a name (required, 1–60 chars, `COLLECTION_NAME_MAX`). Names **don't have to be unique**: two collections can share a name. Names are trimmed before they are saved, and an empty or whitespace-only name is refused with `Name is required.`;
  - an emoji (optional, Emoji Mart picker like categories);
  - a description (optional, up to 200 chars, enforced with `maxLength`; no character counter, like the category form).
  - All three are encrypted client-side in `enc_payload`/`enc_iv`, like tags and categories (ENCRYPTION.md §4). Since names aren't unique, there is no name check against the decrypted list and no blind index.
  - Same-named collections are told apart by their emoji. Lists show no extra text for duplicates.
- **Membership.** Many-to-many: a link can be in any number of collections, and appears at most once in each.
- **Manual order.** Each membership has a `position`. A newly added link goes to the end.
- **Organize hub.** A new "Collections" row (first in the list) on `/dashboard/organize`, icon 📚 (an emoji, like the other hub rows' 📂 🏷️ 🗑️), description "Group links into ordered playlists", linking to `/dashboard/organize/collections`. The hub's subtitle becomes "Manage your collections, categories, tags, and deleted links".
- **Write errors on collections.** A failed create or rename shows `Couldn't save the collection. Try again.` inline in the form, which stays open with what was typed. A failed delete keeps the inline confirm open and shows a `Failed to delete collection` toast.
- **Progress count.** Everywhere a collection shows its count it reads `N links · M done`. `N` counts its visible links, and `M` counts those whose status is `read` or `archived`. That matches Play next, which treats exactly those two statuses as finished.
- **Collections list page** (`/dashboard/organize/collections`):
  - one row per collection: emoji, name, `N links · M done`, chevron → collection page;
  - ordered by `updated_at` desc ("recently updated first"). `updated_at` moves forward on any change to the collection: rename/emoji/description edits, adding or removing links, and reordering;
  - a `+ New` button that opens an inline form (name, emoji, description) like `CategoryForm`;
  - empty state: "No collections yet." with a primary `New collection` button;
  - while loading: `Loading collections…`. A failed load shows `Couldn't load your collections.` with a `Try again` button instead of the list (the same pattern as SPEC 28's list load errors).
- **Collection page** (`/dashboard/organize/collections/[id]`):
  - header: back link to Collections, emoji + name, description, `N links · M done`, `Edit` (rename/emoji/description, inline form), `Delete`, `+ Add links`, `Play next`;
  - the links in `position` order, one `LinkCard` each, with a position number and ▲/▼/✕ buttons (44px, `focus-ring`, `aria-label`s `Move up`, `Move down`, `Remove from collection`);
  - the number is the row's place among the **visible** rows (`1..N`), not the stored `position`. Links hidden by Trash or a locked private tag leave no gap;
  - layout: a single column at every width, inside the Organize page width (`max-w-2xl`). Below `sm` each card keeps its full width and a bar under it holds the number on the left and ▲ ▼ ✕ on the right. From `sm` up the number sits to the left of the card and ▲/▼/✕ in a column to its right;
  - ▲ is disabled on the first visible row and ▼ on the last;
  - while a swap is saving, every ▲/▼ on the page is disabled until it saves or rolls back (✕ stays enabled);
  - **focus after a move:** focus follows the moved row and stays on the same button, so pressing ▼ again keeps moving the same link. If that button just became disabled (the row reached the top or bottom), focus moves to the row's other arrow. A visually hidden `aria-live="polite"` region announces `Moved to position <n>`;
  - **focus after ✕:** focus goes to the next row's ✕, or the previous row's if the removed row was last, or the `+ Add links` button if the list is now empty;
  - **scroll after a move:** if the moved row isn't fully visible below the sticky header, it is scrolled into view (smooth, or instant with `prefers-reduced-motion`). A row that is already fully visible doesn't scroll. Same visibility check as `LinkGrid`'s Undo restore (`data-sticky-chrome`);
  - **tab title:** `Collection — Link Vault` from the server (the name is encrypted), replaced client-side with `<name> — Link Vault` once the collection is decrypted;
  - **private tags:** unlocking or locking private tags while on the page shows or hides the affected links in their places and updates the counts and Play next, with no reload (the page filters with `isTagVisible` against `unlockedTagIds`). The same holds for the counts on the Collections list;
  - a link that leaves this collection from the page itself (unticked in the ··· picker, or its chip removed in the Edit modal and saved) disappears from the list right away, and the counts update;
  - while loading: `Loading collection…`. A failed load (other than not found) shows `Couldn't load this collection.` with a `Try again` button;
  - unknown or other-user id → "Collection not found" with a link back to Collections.
- **Cards on the collection page behave like on `/dashboard`:**
  - opening an `unread` link sets it to `watching` (`updateLinkStatus`, optimistic + rollback + `Failed to update status` toast);
  - the opened card gets the "Last opened" ring and pill (in-memory, page-local);
  - favorite toggle, Edit (reusing `EditLinkModal`), ··· `BottomSheet` (status + Add to collection…), Delete (soft delete with the 2 s undo toast; favorites refuse with "Unfavorite to delete") and swipe-to-delete all work;
  - **no** Send to end button, **no** move-to-end timer, **no** `moved_to_end_at` writes. Manual order wins.
- **Play next.** Opens the first link in collection order whose status is `unread` or `watching` in a new tab, with the same Unread → Watching step. It also marks that card "Last opened" (ring and pill, like opening the card) and, if the card isn't fully visible, scrolls it into view (same rule as reordering), so it's on screen when the user comes back to the tab. With none left the button is disabled and reads `All done`.
- **Reordering.** ▲/▼ swaps the row with its nearest *visible* neighbour (skips links hidden by Trash or a locked private tag). The swap is optimistic. A failed save puts the rows back with a `Failed to reorder` toast.
- **Removing.** ✕ deletes the membership row only, right away and optimistically, with a `Removed from <name>` toast that has an `Undo` action (re-inserts at the old position). Failure: row comes back, `Failed to remove link` toast.
- **Shared name-matching helper** `lib/utils/collectionSearch.ts` (pure): `filterCollectionsByName(collections, query)` (trim, case-insensitive substring, order kept) and `findCollectionByName(collections, name)` (trim, case-insensitive exact; with several same-named collections it returns the first in the given order, i.e. the most recently updated). Used by the form field and the picker sheet to decide whether to show `+ Create` and what Enter picks.
- **Adding links — three entry points:**
  1. **··· menu / `BottomSheet` → `CollectionPickerSheet`.** A new `Add to collection…` row (shown only when `BottomSheet` gets the new optional `onAddToCollection` prop) opens the sheet, headed `Add to collection`. It has a single mode: every tick writes at once.
     - One input at the **top**, under the heading: `type="search"`, placeholder `Search or create…`, sr-only label `Search or create a collection`, `maxLength` 60, `data-autofocus` (touch screens focus the panel, not the input).
     - The collections and the link's memberships are loaded when the sheet opens. While loading it shows `Loading collections…` and the input is disabled. A failed load shows `Couldn't load your collections.` with a `Try again` button, and the input stays disabled.
     - Below it, a list of checkbox rows (ticked = the link is in it). Matches are shown only after typing:
       - **Empty query:** only the collections the link is already in, ticked, sorted like the list page (recently updated first), followed by the hint `Type to find or create a collection.`. The sheet never lists every collection up front.
       - **Non-empty trimmed query:** up to 8 collections whose name contains the query (case-insensitive substring, `filterCollectionsByName`), recently updated first, the same cap as `CollectionsField`. Collections the link is already in still appear, ticked, so they can be unticked from the results.
     - Ticking adds the link at the end, and unticking removes it. Each is saved at once (optimistic, rollback + `Failed to update collection` toast).
     - With an empty query, a collection unticked in this sheet stays listed (unticked) until the query changes or the sheet reopens, so a mis-tap can be ticked back. The empty-query list comes from a snapshot of the link's memberships taken when the sheet opens, plus collections created from the sheet.
     - When the trimmed query has no exact name match, a last row `+ Create "<query>"` appears. With an exact match it is hidden, so a quick add never makes an accidental copy; a deliberate duplicate is made with `+ New` on the Collections page. Activating it creates the collection, adds the link to it in one go, then clears the query. Create errors show inline (`createError`).
     - Enter in the input: an exact match toggles that collection (with several same-named ones, the first in the list, the most recently updated); otherwise it creates. Enter on an empty query does nothing.
     - A collection created here joins the empty-query list, ticked, once the query clears.
     - Empty states: the user has no collections and the query is empty → `No collections yet. Type a name to create one.`. The link is in no collection and the query is empty → only the hint. A query with no partial matches shows only the Create row.
  2. **Add / Edit link form → `CollectionsField`.** It sits right after Title and is always visible. The field order in `LinkForm` (`app/dashboard/link/LinkForm/index.tsx`) is URL → (image) → Tags → Title → **Collections** → "More options" (Description, Category/Status, Duration, Notes). `CollectionsField` is rendered outside the `expanded` block, in both the Add and Edit modals. It is an inline chip combobox and never opens a sheet:
     - selected collections show as chips (emoji + name + ✕ `Remove from <name>`), followed by a text input labelled `Collections`, placeholder `Add to a collection…`, `maxLength` 60;
     - nothing is suggested until the user types. With a non-empty trimmed query, a listbox shows up to 8 collections whose name contains the query (case-insensitive substring), recently updated first. Already selected collections are excluded;
     - a last row `+ Create "<query>"` appears when the trimmed query matches no collection name exactly (case-insensitive), whether selected or not, and no pending name either;
     - **picking** (tap/click, or Enter) adds the chip, clears the input and **keeps focus** so several can be added;
     - **keys:** ↑/↓ move the highlight. Enter picks the highlighted row, else an unselected exact match (the first in the list if several share the name), else the Create row. Enter always calls `preventDefault`, so it never submits the form, and it never blurs. Escape closes the list and stops there, without closing the modal; with the list already closed, Escape closes the modal as usual. Backspace on an empty input removes the last chip, pending or saved. Tab has no completion and moves focus as usual;
     - ARIA: input `role="combobox"` with `aria-expanded`, `aria-controls` and `aria-activedescendant`; the list is `role="listbox"` with `role="option"` rows; rows are ≥ 44px on phones (`min-h-11 sm:min-h-9`). Styling matches `TagSuggestionsDropdown`;
     - collections are loaded once when the field mounts (`getCollections(dek)`). If that fails: `Couldn't load your collections.` with a `Try again` button, and the input is disabled;
     - **Edit:** the field opens with the link's current collections as chips. While they load it shows `Loading collections…` and the input is disabled. On a load error the message stays and Save leaves memberships alone.
     - **Create is deferred to Save.** Picking `+ Create "X"` adds a **pending** chip: same chip style plus a small `new` label. Its ✕ drops it, and nothing is written. Pending names are held in form state as trimmed strings. A name already pending (case-insensitive) is not offered again.
     - **On Save**, after the link itself saves (`createLink` / `updateLink`):
       1. each pending name is created with `createCollection({ name }, dek)`. There is no re-check: if a collection with that name was created elsewhere (another tab or device) while the form was open, Save makes a second one with the same name, which is allowed;
       2. memberships are written with `setLinkCollections`. Add: all selected ids plus the resolved ids, each appended at the end. Edit: only the difference against the link's current collections (added → appended at the end, removed → membership deleted), plus the resolved ids as additions.
     - Any failure in steps 1–2 keeps the link saved and shows the toast `Link saved, but collections weren't updated`. Collections created before the failure stay, with no rollback.
     - Cancel with pending names writes nothing.
     - In Edit, a change to the collections, including a pending name alone, counts as a change (`hasChanges`), so Save is enabled.
  3. **Collection page `+ Add links`:** opens `AddLinksToCollectionSheet`:
     - headed `Add links to <name>`, with a search box (`input[type="search"]`, placeholder `Search or #tag`, `data-autofocus`) at the top;
     - **type first:** with an empty query the list shows only the hint `Type to find links.`. Results appear after typing, with the dashboard's ~350 ms delay (`useDebouncedValue`);
     - the query works like the dashboard search box:
       - `#tag` tokens that name an existing tag (case-insensitive exact name) become a tag filter: only links that have any of those tags are kept, the same `any` default as the dashboard. A `#tag` that names no tag stays in the query as plain text, as on the dashboard;
       - the rest of the query is matched with the dashboard's text rule: title, URL, site name, notes and tag names, case-insensitive substring;
     - both rules move out of the dashboard code into pure helpers in `lib/hooks/links/list/linkFilterMatch.ts`: `matchesTextSearch(link, query, tagNameById)` (today an inline block in `useLinkListQuery.ts`) and `parseHashtagQuery(query, tags)` → `{ textSearch, tagIds }` (today inline in `useLinkFilters.ts`). The dashboard hooks call them, and the dashboard search behaves exactly as before;
     - results are newest first (`created_at` desc), up to 50. With more matches, a muted line under the list reads `Showing 50 of <total>. Type more to narrow it down.`. No match: `No links match "<query>".`;
     - candidates come from `getMatchingLinkIds` with no structural filters (but the current `unlockedTagIds`) + `getLinksByIds` (capped at `MATCHING_LINK_IDS_CAP`, 2000), loaded once when the sheet opens. The RPC already drops locked-private links, and `isTagVisible` is applied again client-side as a second check. While loading the input is disabled and `Loading links…` shows. A failed load shows `Couldn't load your links.` with a `Try again` button;
     - links already in the collection are shown ticked and disabled, with the label `Already in`;
     - ticks are kept when the query changes, so links found by different searches can be added together;
     - an `Add N links` primary button (disabled with nothing ticked) appends the ticked links in the order they were ticked, then closes the sheet. The new links appear at the bottom of the page right away in that order (no reload), the counts update, the page scrolls to the first new link (same scroll rule as reordering), and a toast reads `Added N links to <name>` (`Added 1 link to <name>` for one). A failed add keeps the sheet open with the ticks and shows a `Failed to add links` toast.
- **Trash.** Soft-deleting a link keeps its membership rows. The collection page, counts, picker and Play next skip links with `deleted_at` set. Restoring from Trash brings the link back at its old position. Permanent delete / Empty Trash / the private-tag nuke remove memberships through `on delete cascade`.
- **Private tags.** A link with any locked private tag (`isTagVisible`) is hidden from the collection page, `AddLinksToCollectionSheet`, the counts and Play next, the same rule as the main list. Collections themselves are never private.
- **Delete a collection.** Inline confirm: `Delete "<name>"? Its N links stay saved.` with `Delete` / `Cancel`. `N` is the visible count, the same `N` as the header. Hard delete of the collection row; memberships go via cascade. No Trash and no undo. Afterwards it navigates to the Collections list with a `Deleted <name>` toast.
- **Account restart.** `wipeVaultData` (`lib/services/vault.ts`) also deletes the user's collections (their names are encrypted with the old DEK).
- Every modal/sheet uses `useDialog`. All control icons are components in `components/icons/`: reuse the existing `ChevronDownIcon`, and add `ChevronUpIcon` and `PlayIcon` (plus `CollectionIcon` only if a control needs it; the hub row uses the 📚 emoji). Design-system tokens only (`primary-*`, `surface-*`).
- Tests for services, helpers, hooks and new components (see plan).
- CLAUDE.md: new feature #19 "Collections", the two new tables in the Core domain, the grants note, the "More options" gotcha (Collections is visible without it), and feature #11 (Organize hub) listing collections.
- ENCRYPTION.md: a `collections` row in the table of encrypted tables (`name, emoji, description` encrypted; `id, user_id, created_at, updated_at` plaintext), and a note that `collection_links` is structural only (no encrypted columns).

**Out of scope (for future specs):**

- Collection chips on `LinkCard` on `/dashboard` (SPEC 43).
- A Collection filter in `FilterSheet` / the `search_links` RPC (SPEC 43).
- Collections in Export / Import (SPEC 44).
- Drag-and-drop reordering, on any device.
- Private or password-locked collections.
- "Play next" based on the last-opened position, autoplay, or a player view.
- Sorting a collection by anything other than manual order.
- Sharing a collection or a public link to it.
- Pagination or infinite scroll on the collection page.
- Bulk "add the current dashboard search results to a collection".
- Deleting a collection's links together with the collection.
- Showing collection suggestions in the form on focus, before typing.
- Browsing all collections in the ··· sheet without typing (Organize → Collections lists them all).
- Browsing links in the Add links sheet without typing, or paging past its 50 results.
- Queueing several ▲/▼ taps while a swap saves.
- Setting emoji/description when creating a collection from the form or the picker sheet. Those are created with a name only.
- Reordering chips in the form, or choosing the position inside a collection when adding (appends stay at the end).
- Cleaning up a collection that was created and then left empty.

## Data model

New migration `supabase/migrations/0024_collections.sql`:

```sql
create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  enc_payload text not null,   -- { name, emoji, description }
  enc_iv      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.collection_links (
  collection_id uuid not null references public.collections(id) on delete cascade,
  link_id       uuid not null references public.links(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  position      integer not null,
  added_at      timestamptz not null default now(),
  primary key (collection_id, link_id)
);
create index collection_links_link_id_idx on public.collection_links (link_id);
```

- RLS on both tables: owner-only `select`/`insert`/`update`/`delete` (`user_id = auth.uid()`). `collection_links` insert/update also checks that the collection and the link belong to `auth.uid()`.
- Grants for `authenticated` (select/insert/update/delete on both tables) live in `0024` itself, the way `0017_link_tags_update_grant.sql` added its grant. `0009` is not edited.
- Triggers (`updated_at` moves forward on any change to a collection):
  - `before update` on `collections` sets `new.updated_at = now()` (covers rename/emoji/description edits, and the bump below);
  - `after insert or update or delete` on `collection_links` runs `update collections set updated_at = now() where id = <the row's collection_id>` (covers add, remove, Undo and reorder). During a cascade delete of the collection itself this updates zero rows, which is fine.
- RPC `swap_collection_link_positions(p_collection_id uuid, p_link_a uuid, p_link_b uuid)`, `security invoker`, in one transaction:
  1. renumbers every row of the collection to `1..N`, ordered by `position, added_at` (this clears any ties);
  2. swaps the two given rows' new positions.
  - It returns nothing and raises if either link isn't in the collection. Each ▲/▼ rewrites all of the collection's rows, which is fine since there's no pagination and collections are small.
- No unique constraint on `position`. Ties can happen when two appends race (two tabs, or the ··· picker and the link form saving at once). They sort by `added_at`, and the next ▲/▼ on that collection clears them through the renumbering.
- Appending uses `max(position) + 1` within the collection, computed client-side. `addLinksToCollection` reads the current max (`select position … order by position desc limit 1`) right before its insert and numbers the new links `max+1, max+2, …` in the given order.
- Undo of a removal re-inserts the row with its original `position` and `added_at`, so it lands back in its old place even if that now ties with another row.

Client types (`lib/services/collections.ts`):

```ts
export const COLLECTION_NAME_MAX = 60
export type CollectionContent = { name: string; emoji: string | null; description: string | null }
export type Collection = CollectionContent & {
  id: string; user_id: string; created_at: string; updated_at: string
}
export type CollectionWithCounts = Collection & { link_count: number; done_count: number }
export type CollectionMembership = { collection_id: string; link_id: string; position: number; added_at: string }
```

`link_count`/`done_count` (`done` = status `read` or `archived`) are computed client-side from a structural-only query, with no decryption: `collection_links` → `links(status, deleted_at, link_tags(tag_id))`, with tag privacy taken from `TagsContext` + `isTagVisible`. Trash and locked private tags are excluded the same way as on the page. The collection page itself derives the same two numbers from the links it has already loaded.

Name matching (`lib/utils/collectionSearch.ts`):

```ts
export function filterCollectionsByName<T extends { name: string }>(items: T[], query: string): T[]
export function findCollectionByName<T extends { name: string }>(items: T[], name: string): T | undefined
```

Link form state (`lib/hooks/links/form/useLinkForm.ts`) gains two fields, exposed through `LinkFormContext` as `collectionIds`/`setCollectionIds` and `newCollectionNames`/`setNewCollectionNames`:

```ts
type FormState = {
  // …existing fields
  collectionIds: string[]        // saved collections the link should be in
  newCollectionNames: string[]   // pending "Create" picks, trimmed, created on Save
}
```

## Implementation plan

1. **Migration.** Add `0024_collections.sql` (tables, index, RLS, grants, the two `updated_at` triggers, the renumber-then-swap RPC). Regenerate `lib/types/database.ts`. Manual check: `supabase db reset` runs clean and the test user can insert a row through PostgREST.
2. **Service.** `lib/services/collections.ts` (browser client, takes `dek`): `getCollections`, `createCollection`, `updateCollection`, `deleteCollection`, `getCollectionMemberships(collectionId)`, `getCollectionIdsForLink(linkId)`, `addLinksToCollection(collectionId, linkIds)`, `removeLinkFromCollection`, `restoreMembership(row)` (for Undo), `swapCollectionLinkPositions`, `setLinkCollections(linkId, add[], remove[])`, `createPendingCollections(names, dek)` (creates one collection per name and returns their ids; `null` on any failure). Also `getCollectionCounts()` (the structural-only count query). Uses `toEncryptedColumns`/`fromEncryptedColumns` (`lib/crypto/encryptedRow.ts`). Unit tests in `tests/lib/services/collections.test.ts`, including `createCollection` accepting a name that already exists.
3. **Name-matching helper.** Add `lib/utils/collectionSearch.ts` with tests in `tests/lib/utils/collectionSearch.test.ts`: substring hit, case-insensitivity, trimming, order kept, exact-match lookup, and a miss.
4. **Account restart.** `wipeVaultData` deletes `collections` before `user_encryption_keys`. Update its test.
5. **Collections list page.** `app/dashboard/organize/collections/page.tsx` + `CollectionList`, `CollectionRow`, `CollectionForm`. Hooks in `lib/hooks/collections/`, split per concern like categories: `useCollectionListState`, `useCollectionAddForm`, composed by `useCollections`. Add the Organize hub row (📚) and the new hub subtitle. Loading and load-error states, name trimming and the `Name is required.` / `Couldn't save the collection. Try again.` errors (no duplicate-name check). Tests in `tests/hooks/collections/`.
6. **Collection page, read-only.** `app/dashboard/organize/collections/[id]/page.tsx` + `CollectionDetail`: loads memberships → `getLinksByIds` → drops deleted and locked-private links → renders `LinkCard`s in order with visible-place numbers (`1..N`), counts, loading, load-error and not-found states. Phone layout (bar under the card) below `sm`, side layout from `sm` up, single column inside `max-w-2xl`. Hook `useCollectionLinks`. Client-side tab title (`<name> — Link Vault`). Visibility recomputed from `unlockedTagIds`, so unlocking or locking updates the list and counts without a reload. Tests: with row 2 hidden, the numbers read 1, 2, 3 with no gap; unlocking shows a hidden link in its place.
7. **Card behaviour on the collection page.** Wire open (Unread → Watching, Last opened), favorite, status via `BottomSheet`, `EditLinkModal`, soft delete + undo toast, swipe. No `onSendToEnd`. Hook `useCollectionLinkActions`, reusing `updateLinkStatus`, `toggleLinkFavorite`, `deleteLink`, `restoreLink`. A link that leaves this collection through the ··· picker or the Edit modal is dropped from the page's list. Tests for both paths.
8. **Reorder and remove.** ▲/▼/✕ per row, nearest-visible-neighbour swap via the RPC, optimistic with rollback, remove with Undo toast. Hook `useCollectionOrder`. After a saved swap the hook renumbers its local rows `1..N` to match what the RPC wrote. The hook exposes `isSwapping`, and every ▲/▼ is disabled while it's true. Focus follows the moved row (switching to the other arrow when one becomes disabled), the `Moved to position <n>` live announcement, focus after ✕, and scroll-into-view only when the row isn't fully visible. Component tests for the focus and announcement rules. Tests cover skip-hidden-neighbour, rollback, swapping two rows that tie on `position`, and a second ▲/▼ being ignored while a swap is saving.
9. **Edit and delete a collection.** Inline edit form and delete confirm on the collection page (`useCollectionEditForm`, `useCollectionDeleteFlow`), name trimming and the required check, toast + navigation. A failed delete keeps the confirm open with the `Failed to delete collection` toast.
10. **Play next.** Button + `All done` disabled state. Marks the card Last opened and scrolls it into view when needed. Tests: picks first `unread`/`watching` in position order, skipping hidden links; sets Last opened on that card.
11. **`CollectionPickerSheet`** (`components/CollectionPickerSheet.tsx`) with its hook `useCollectionPicker` (`query`, `visibleCollections`, `showCreate`, `submitQuery()` for the Enter rule, `toggle`, `createAndAdd` from `query`). `visibleCollections` comes from `query` and `memberIds`, a snapshot of the link's memberships taken when the sheet opens plus collections created from it. An empty query gives the snapshot's collections, and a typed one gives up to 8 name matches. Search-or-create input at the top, checkbox list, hint, Create row, empty states, and the loading and load-error states. Add the optional `onAddToCollection` prop and `Add to collection…` row to `BottomSheet`, wired on `/dashboard` and on the collection page. Tests in `tests/hooks/collections/useCollectionPicker.test.ts` and `tests/components/CollectionPickerSheet.test.tsx`: tick/untick with rollback, an empty query lists only the link's memberships (no other collection shows until the user types), typed matches with a cap of 8, ticked matches shown, unticking with an empty query keeps the row, Create row shown or hidden, Enter toggles an exact match (the first of two same-named ones), Enter creates.
12. **Link form state.** `useLinkForm` holds `collectionIds` and `newCollectionNames`, exposed through `LinkFormContext`. `useAddLinkForm`/`useEditLinkForm` call `createPendingCollections` and then `setLinkCollections` after the link saves, with the partial-failure toast. Edit loads the link's current collections, writes only the difference, and counts collection changes (pending names included) in `hasChanges`. Tests in `tests/hooks/links/form/`: select on Add, diff on Edit, pending create on Add, pending create on Edit, a pending name creating a second collection when one with that name appeared meanwhile, a create failure keeping the link saved and showing the toast, and Cancel writing nothing.
13. **`CollectionsField` combobox.** `app/dashboard/link/LinkForm/CollectionsField.tsx` as the chip combobox described above, with saved and pending chips, the listbox, keys, ARIA, and the load/error states. Render it in `LinkForm/index.tsx` right after `<TitleField />`, outside the `expanded` block. Tests in `tests/components/CollectionsField.test.tsx`: no list on empty input, filter, up to 8 rows, selected ones excluded, Create row rule, Enter picks and keeps focus without submitting, Escape closes only the list (the modal stays open), Backspace removes the last chip, the `new` label, and the disabled input while loading. Update `tests/components/LinkForm.test.tsx`: the field is visible without "More options" and sits after Title in DOM order.
14. **`AddLinksToCollectionSheet`** on the collection page. First extract `matchesTextSearch(link, query, tagNameById)` from `useLinkListQuery.ts` and `parseHashtagQuery(query, tags)` from `useLinkFilters.ts` into `linkFilterMatch.ts`, and switch both hooks to them (no behaviour change, existing tests still pass). Add `tests/hooks/links/list/linkFilterMatch.test.ts` cases for title/url/site/notes/tag hits and a miss, plus `#tag` → tag id, an unknown `#tag` kept as text, and mixed `#tag` plus text. Then build the sheet with its hook `useAddLinksToCollection`: candidate load with loading/error states, type-first hint, debounced search with both helpers, newest first, cap of 50 with the "Showing 50 of N" line, no-match text, ticks kept across queries, `Add N links` appending the new rows to the page with the scroll and the `Added N links to <name>` toast, and the failure toast. Tests in `tests/hooks/collections/useAddLinksToCollection.test.ts`.
15. **Docs.** CLAUDE.md feature #19, feature #11 (Organize hub), Core domain tables, Conventions note, and the "More options" gotcha update. ENCRYPTION.md: the `collections` row in the encrypted-tables table and the `collection_links` note. Playwright verification per CLAUDE.md (port 3500), screenshots in `.verification-screenshots/spec-40-link-collections_<date>/`.

## Acceptance criteria

**Data and collections**

- [ ] `supabase db reset` applies `0024_collections.sql` with no errors, and a fresh test user can create a collection (no `permission denied`).
- [ ] `/dashboard/organize` shows a Collections row that opens `/dashboard/organize/collections`.
- [ ] Creating a collection named `Learn Rust` with emoji 🎓 shows it in the list with `0 links · 0 done`.
- [ ] With links in `read` and `archived` status in a collection, both are counted in `M done`.
- [ ] Renaming a lower collection, adding/removing a link in it, or reordering it moves it to the top of the Collections list.
- [ ] With `Learn Rust` existing, `+ New` on the Collections page can create a second `Learn Rust`; both are listed and each keeps its own links.
- [ ] A name of only spaces is refused with `Name is required.`, and `  Learn Go  ` is saved as `Learn Go`.
- [ ] With the network blocked, creating a collection shows `Couldn't save the collection. Try again.` and the form keeps what was typed.
- [ ] With the network blocked, the Collections list shows `Couldn't load your collections.`, and `Try again` loads it once the network is back.
- [ ] The Organize hub subtitle reads "Manage your collections, categories, tags, and deleted links".
- [ ] The `collections` row in the DB has no plaintext name (only `enc_payload`/`enc_iv`).
- [ ] The same link can be in two collections at once.

**··· picker sheet**

- [ ] From a dashboard card's ··· menu, `Add to collection…` opens a sheet with a `Search or create…` input at the top and no input at the bottom.
- [ ] Ticking `Learn Rust` adds the link; reopening the picker shows it ticked. Unticking removes it, and the link stays on `/dashboard`.
- [ ] For a link that is only in `Learn Rust`, opening the sheet shows only `Learn Rust` (ticked) and the hint `Type to find or create a collection.`. No other collection is listed.
- [ ] For a link in no collection, opening the sheet shows only the hint.
- [ ] Typing `rust` lists `Learn Rust` (ticked) and `Rust videos` (unticked).
- [ ] With 10 collections that match the query, at most 8 rows are listed, plus the Create row if it applies.
- [ ] Unticking `Learn Rust` with an empty query keeps its row visible, unticked, and ticking it again adds the link back.
- [ ] Typing an unknown name shows `+ Create "<name>"`, and activating it creates the collection with the link already ticked.
- [ ] Enter in the sheet on an exact name toggles that collection's checkbox. Typing `Learn Rust` shows no `+ Create` row because it exists.
- [ ] While the sheet loads, it shows `Loading collections…` with the input disabled; a failed load shows `Couldn't load your collections.` with `Try again`.

**Link form field**

- [ ] In the Add Link modal, the Collections input is visible without opening "More options", directly below Title.
- [ ] In the Edit Link modal, Collections is visible directly below Title and shows the link's current collections as chips once they load.
- [ ] Focusing the empty Collections input shows no list.
- [ ] With collections `Learn Rust` and `Rust videos`, typing `rust` lists both. Typing `RUST` lists the same two.
- [ ] With 10 collections that match, at most 8 rows are listed, plus the Create row if it applies.
- [ ] An already selected collection does not appear in the list.
- [ ] Typing `learn rust` shows no `+ Create` row, because an exact match exists. Typing `learn rus` shows `+ Create "learn rus"`.
- [ ] Enter on a highlighted row adds its chip, clears the input, keeps focus in the input, and does not submit the form.
- [ ] Escape with the list open closes the list and leaves the modal open.
- [ ] Backspace on an empty input removes the last chip.
- [ ] Adding a link with `Learn Rust` selected puts it at the end of that collection.
- [ ] Editing a link and removing a collection chip, then saving, removes only that membership.
- [ ] Picking `+ Create "Go basics"` shows a `Go basics` chip with a `new` label, and no `collections` row exists in the DB yet.
- [ ] Saving that Add form creates `Go basics` once and the link is its only member.
- [ ] Cancelling a form with a pending `Go basics` chip leaves no `Go basics` collection.
- [ ] Editing a link, adding only a pending collection and saving creates it and adds the link. Save was enabled with no other change.
- [ ] If `Go basics` was created elsewhere (another tab) while the form had a pending `Go basics`, Save creates a second `Go basics` holding the link, with no error.
- [ ] With collection creation failing (network blocked), the link still saves and the `Link saved, but collections weren't updated` toast shows.

**Collection page**

- [ ] `+ Add links` → search → tick 2 links → `Add 2 links` appends them in tick order; links already in the collection show ticked, disabled and `Already in`.
- [ ] Opening `Add links` shows only the hint `Type to find links.` until the user types.
- [ ] In `Add links`, searching `rust` finds a link whose only match is a `rust` tag (same rule as the dashboard search), and the dashboard search still returns the same results as before.
- [ ] In `Add links`, `#rust` lists only links tagged `rust`, and `#rust async` lists only links tagged `rust` that also match `async`. `#nosuchtag` searches as plain text.
- [ ] With more than 50 matches, 50 rows are listed, newest first, with `Showing 50 of <total>. Type more to narrow it down.`.
- [ ] A query with no matches shows `No links match "<query>".`.
- [ ] A link ticked under one query stays ticked after the query changes, and `Add N links` counts it.
- [ ] With the network blocked, `Add 2 links` keeps the sheet open with both ticks and shows `Failed to add links`.
- [ ] ▼ on row 1 swaps it with row 2, and the new order survives a page reload.
- [ ] ▲ is disabled on the first row and ▼ on the last.
- [ ] With row 2 in Trash, ▼ on row 1 swaps it with row 3, and the visible rows are numbered 1, 2, 3… with no gap.
- [ ] While a swap is saving (network throttled), every ▲/▼ on the page is disabled; they come back once it saves or rolls back.
- [ ] With the keyboard, pressing ▼ on row 2 moves it to row 3 and focus stays on that link's ▼; pressing ▼ until it's last moves focus to its ▲. A screen reader hears `Moved to position 3`.
- [ ] After ✕ with the keyboard, focus is on the next row's ✕ (the previous row's if it was last).
- [ ] Moving a row that ends up partly below the screen scrolls it into view; moving a row that stays fully visible doesn't scroll.
- [ ] The browser tab reads `Learn Rust — Link Vault` once the collection page has loaded.
- [ ] `Add 2 links` closes the sheet, both links appear at the bottom in tick order without a reload, the counts go up by 2, the page scrolls to the first one, and the toast reads `Added 2 links to Learn Rust`.
- [ ] Unlocking private tags on the collection page shows a hidden private link in its place and updates the counts, with no reload; locking hides it again.
- [ ] On a 375px-wide viewport each card is full width with the number and ▲ ▼ ✕ in a bar under it; from `sm` up the number is on the left and the controls in a column on the right.
- [ ] Unticking this collection in a card's ··· picker, or removing its chip in the Edit modal and saving, removes the row from the page right away and updates the counts.
- [ ] With the network blocked, the collection page shows `Couldn't load this collection.` with `Try again`.
- [ ] With two rows forced to the same `position` in the DB, ▼ on the first one still swaps them, and afterwards the collection's positions are `1..N` with no ties.
- [ ] ✕ removes the row, shows `Removed from Learn Rust` with `Undo`, and Undo puts it back at the same position.
- [ ] A failed reorder (network blocked) restores the previous order and shows `Failed to reorder`.
- [ ] Opening an `unread` link from the collection page sets it to `watching` and shows the Last opened ring.
- [ ] The collection page has no Send to end button, and opening a link there never sets `moved_to_end_at`.
- [ ] `Play next` opens the first `unread`/`watching` link in order; when all are `read`/`archived` it is disabled and reads `All done`. The opened card gets the Last opened ring and is scrolled into view if it wasn't fully visible.
- [ ] Deleting a collection asks `Delete "Learn Rust"? Its N links stay saved.`; confirming removes the collection, and all its links are still on `/dashboard`. With one of its links in Trash, `N` is the visible count. A failed delete keeps the confirm open and shows `Failed to delete collection`.
- [ ] Visiting `/dashboard/organize/collections/<random-uuid>` shows "Collection not found".

**Trash, privacy, restart**

- [ ] Moving a link to Trash hides it from the collection page and the counts; restoring it from Trash brings it back at its old position.
- [ ] Permanently deleting a link removes its `collection_links` rows.
- [ ] A link with a locked private tag doesn't appear on the collection page, in `Add links`, in counts or in Play next; after unlocking it appears.
- [ ] Account restart leaves zero `collections` rows for the user.

**General**

- [ ] Every new sheet closes on Escape, traps Tab and returns focus; every new control and list row is ≥ 44px tall on a phone viewport.
- [ ] `tests/components/icons/noInlineSvg.test.ts` passes, and no new file uses literal `indigo-*`/`slate-*` for UI chrome.
- [ ] `npm test`, `npm run lint` and `npm run build` pass.
- [ ] ENCRYPTION.md lists `collections` in its encrypted-tables table, and CLAUDE.md's feature #11 mentions collections.

## Decisions

- **Yes:** many-to-many membership via `collection_links`. Playlist model; a link fits several goals.
- **No:** a `collection_id` column on `links`. That would just be a second category.
- **Yes:** manual order with integer `position` and an atomic swap RPC. Simple, and ▲/▼ only ever swaps neighbours.
- **No:** fractional / lexorank positions. Only needed for drag-and-drop, which is out.
- **Yes:** client-side append (`max + 1`) with no unique constraint, and a swap RPC that renumbers the whole collection `1..N` before swapping. Any tie from racing appends is cleared on the next ▲/▼. Costs a full-collection rewrite per click, which is fine for small, unpaginated collections.
- **No:** a server-side append RPC with a unique `(collection_id, position)` constraint. It would prevent ties outright, but it's more SQL for a rare single-user race.
- **No:** accepting ties as-is. A tied pair would be stuck, because ▲/▼ on two equal positions does nothing.
- **Yes:** the Add links sheet searches with the dashboard's own rule (title, URL, site, notes, tags), extracted into a shared `matchesTextSearch`. One search behaviour across the app.
- **No:** a simpler title/URL-only search in the Add links sheet. A tag-only match would show on the dashboard but not in the sheet.
- **Yes:** `#tag` works in the Add links sheet as a tag-only filter, through a shared `parseHashtagQuery`. The dashboard search bar teaches `#tag`, so users will try it here.
- **No:** stripping the `#` and searching as plain text, or ignoring `#tag`. The first also matches titles and notes; the second looks broken.
- **Yes:** the Add links sheet is type-first, with a 50-row cap and newest first. Same model as the ··· sheet, and no list of hundreds of links.
- **No:** listing the newest links before typing.
- **Yes:** row numbers are the visible place (`1..N`), not the stored `position`. Hidden links would otherwise leave gaps that look like bugs.
- **Yes:** on phones ▲ ▼ ✕ sit in a bar under the card; from `sm` up they're a column to the right. A side column leaves a phone card about 230px wide.
- **Yes:** every ▲/▼ is disabled while a swap saves. Two swaps in flight could come back out of order.
- **No:** queueing taps. Smoother for multi-step moves, but more code and a harder rollback.
- **Yes:** load-error states with `Try again` on the list page, the collection page and both sheets, like SPEC 28.
- **Yes:** focus follows the moved row after ▲/▼, with a live `Moved to position <n>`. Otherwise a keyboard user lands on a different link after each move.
- **No:** leaving focus at the same spot on the page.
- **Yes:** a moved row is scrolled into view only when it isn't fully visible. Same rule as the dashboard's Undo restore.
- **Yes:** Play next marks the card Last opened and scrolls it into view. The user can see where they are in the playlist when they come back.
- **Yes:** links added with `Add N links` appear at once, the page scrolls to the first, and a toast confirms. No reload needed to see what was added.
- **Yes:** the tab title shows the decrypted collection name, set client-side. The server can't read it.
- **No:** a fixed `Collection — Link Vault` title. Tabs would be indistinguishable.
- **No:** a character counter on the description. Matches the category form; `maxLength` is enough.
- **Yes:** unlocking or locking private tags updates the collection page and counts live, like the dashboard.
- **Yes:** a separate pure `collectionSearch.ts` helper for collection names, shared by the form field, the picker sheet and Save-time resolution. One matching rule.
- **No:** reusing `matchesTextSearch` for collection names. That one searches links.
- **Yes:** the count reads `M done` and counts `read` + `archived`. It matches Play next's "All done" exactly.
- **No:** counting only `read`. A fully archived collection would say `0 read` next to `All done`.
- **Yes:** ▲/▼ buttons only. Touch and keyboard friendly, no new dependency.
- **No:** drag-and-drop (desktop or touch) in v1.
- **Yes:** pages under Organize (`/dashboard/organize/collections[/id]`). No new nav tab; fits categories/tags/trash.
- **No:** a 4th top-level tab.
- **Yes:** collection page reuses `LinkCard` and dashboard behaviour, minus move-to-end. Consistent cards; manual order would fight the move-to-end timer.
- **Yes:** three add paths (card menu, link form, collection page). User asked for all three.
- **Yes:** the form's Collections field sits right after Title, always visible. It's a field the user reaches for often, and "More options" would hide it.
- **Yes:** an inline type-to-search chip combobox in the form. Same mental model as Tags, and no sheet over a modal.
- **No:** a `+ Add` button in the form that opens the picker sheet, alone or as "Browse all". Two ways to do one thing in the same field, and a sheet over a modal.
- **No:** suggestions on focus with an empty input. "Nothing until you type", consistent with Tags.
- **Yes:** focus stays after a pick, and Enter never blurs. Several collections can be added in a row. This differs on purpose from SPEC 39's Tags Enter-blur rule.
- **Yes:** creating from the form is deferred to Save. Cancel leaves nothing behind.
- **No:** creating immediately from the form. It would leave empty collections after a cancelled form.
- **Yes:** collection names don't have to be unique. Two playlists can share a name, and there's no name check to get wrong on encrypted data.
- **No:** unique names (case-insensitive). Would need a client-side check everywhere a collection is created or renamed, plus a duplicate-name error.
- **Yes:** `+ Create` is hidden on an exact name match in the ··· sheet and the form. Quick adds pick the existing one; deliberate duplicates come from `+ New` on the Collections page.
- **Yes:** at Save, every pending name creates a new collection, even if one with that name appeared meanwhile (another tab or device). Duplicates are allowed, so a rare race just leaves two same-named collections.
- **No:** re-reading collections at Save to reuse a same-named one. Extra round trip for a rare race whose outcome is allowed anyway.
- **Yes:** same-named collections are told apart by their emoji only. Duplicates should be rare.
- **Yes:** pending chips get a small `new` label. The user can see what Save will create.
- **Yes:** the ··· sheet has one top input that both searches and creates. One box, one place to look.
- **No:** a separate search box plus a bottom "New collection name…" create box.
- **Yes:** type-to-match in the ··· sheet. Same model as the form field and Tags: type a few letters, then pick.
- **No:** listing every collection up front in the ··· sheet. Long lists mean scrolling, which is what typing avoids.
- **Yes:** with an empty query the ··· sheet shows the link's current collections, ticked. Unticking needs no typing.
- **Yes:** matches capped at 8 in both the ··· sheet and the form field. One rule for both entry points.
- **Yes:** the ··· sheet creates immediately. Every tick there already writes at once.
- **Yes:** `CollectionPickerSheet` has a single (write-on-tick) mode. The form doesn't use it, so a "select" mode would have no caller.
- **Yes:** name + emoji + description, encrypted. Same shape as categories, same privacy.
- **No:** a color field.
- **Yes:** memberships survive soft delete and come back on restore. Matches Trash being reversible.
- **Yes:** the private-tag rule applies to collection contents; collections are never private. Smallest change that can't leak a hidden link.
- **No:** private collections.
- **Yes:** Play next = first `unread`/`watching` in order. No new stored state.
- **No:** "link after the last opened". Needs a persisted cursor.
- **Yes:** list sorted by `updated_at` desc. Every change bumps it (edits via a `before update` trigger on `collections`, add/remove/reorder via a trigger on `collection_links`). "Recently updated" means the last collection you touched.
- **No:** bumping only on membership changes, or skipping reorders. Harder to predict.
- **Yes:** the Organize hub row uses the 📚 emoji like its sibling rows. Hub row icons are decorative, not controls.
- **Yes:** hard delete of a collection, links kept, no undo. A collection is cheap to rebuild; links are the valuable part.
- **No:** an option to also trash its links.
- **Yes:** no pagination on the collection page. Playlists are small; `getLinksByIds` already chunks.
- **Yes:** split into SPEC 40/43/44 (41 is search inside collections). The full idea touched DB, Organize, LinkCard, the link form, the search RPC and Import/Export.
- **Yes:** this spec merges the earlier SPEC 40 and SPEC 41 drafts into one, written as the final design. Neither had been implemented, so there was no reason to build SPEC 40's original form field and then replace it.

## Risks

| Risk | Mitigation |
| --- | --- |
| A very large collection (hundreds of links) loads slowly with no pagination | `getLinksByIds` chunks requests; pagination can be added later without a schema change. |
| Two appends race (two tabs, or picker + form) and get the same `position` | Ties sort by `added_at`, so the list stays stable. The swap RPC renumbers the collection `1..N` before swapping, so the next ▲/▼ clears the tie (covered by a test). |
| Two tabs reorder at once | Each swap renumbers from the DB's current order inside one transaction; the last one wins and the other tab shows the stored order after a reload. |
| Extracting `matchesTextSearch` and `parseHashtagQuery` changes dashboard search | Pure move with no logic change; existing `useLinkListQuery`/`useLinkFilters` tests plus new `linkFilterMatch` tests. |
| A second ▲/▼ tap while a swap saves leaves the page and the DB in different orders | All ▲/▼ are disabled while a swap saves (covered by a test). |
| Disabling ▲/▼ during a save makes moving a row several places feel slow | Each swap is one small RPC; queueing can be added later if it's a real problem. |
| Link saves but the collection step in the form fails (some collections created, membership write fails) | Link stays saved; explicit `Link saved, but collections weren't updated` toast. Created collections remain and can be reused next time. |
| Two same-named collections are hard to tell apart in the ··· sheet or the form's suggestions | Rows show the emoji; duplicates only come from a deliberate `+ New` or a rare two-tab race. A count or description on duplicate rows can be added later. |
| Escape in the combobox also closes the Add/Edit modal (`useDialog` listens for Escape) | With the list open, the input handles Escape and stops propagation. A test checks that the modal stays open. |
| Enter in the combobox submits the form | Enter always calls `preventDefault` (covered by a test). |
| The always-visible Collections field pushes Description and other fields further down on small phones | Collections is one input line when empty. The form already scrolls inside `70dvh`. |
| `AddLinksToCollectionSheet` candidates capped at 2000 | Same cap as dashboard search (`MATCHING_LINK_IDS_CAP`); documented. |
| A user who doesn't remember a collection's name can't browse for it in the ··· sheet | Organize → Collections lists every collection, and the substring match only needs a fragment of the name. |
| Swapping with a hidden neighbour would look like a no-op | Swap targets the nearest *visible* neighbour, covered by a test. |
| Old-DEK collection names after account restart | `wipeVaultData` deletes collections. |

## What is **not** in this spec

- Collection chips on dashboard cards and a dashboard Collection filter (SPEC 43).
- Collections in Export / Import (SPEC 44).
- Drag-and-drop, private collections, sharing, a player view or autoplay.
- Pagination on the collection page.
- Deleting a collection's links with it.
- Collection suggestions in the form before typing.
- Browsing collections in the ··· sheet, or links in the Add links sheet, without typing.
- Emoji/description when creating a collection from the form or the picker sheet.
- Choosing a position inside a collection.
- Cleaning up empty collections.
