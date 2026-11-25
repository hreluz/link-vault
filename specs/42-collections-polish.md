# SPEC 42 — Collections polish: consistency, empty/loading states, calmer header

> **Status:** Approved
> **Depends on:** SPEC 38, SPEC 40, SPEC 41
> **Date:** 2026-11-24
> **Objective:** The Collections pages follow the app's icon, label and dark-mode rules, give a next step when a collection is empty, keep their layout steady while loading, and keep destructive actions out of the main action row.

## Why this spec exists

A UI/UX review of the Collections pages (SPEC 40/41) found:

- **Text glyphs used as controls**: `+ New`, `›`, `‹`, `✕`, where SPEC 38 says controls use icons from `@/components/icons`.
- **Emoji picker always light**: it was hardcoded to `theme="light"`, so it stayed light in dark mode. `CategoryForm` had the same bug.
- **Blank gap**: a collection with no emoji left an empty 36px slot in its list row.
- **Weak form labels and focus**: the form had placeholder-only labels, used `autoFocus` (which pops up the keyboard on phones), and gave no warning near the 200-character description limit.
- **Dead-end empty state**: an empty collection showed a bare message with no next step.
- **Jumpy loading**: loading was plain text, so the layout jumped when content arrived.
- **Crowded header**: Edit and Delete sat next to Play next and + Add links with the same weight.
- **Delete confirm focus**: the inline delete confirm didn't take focus and didn't close on Escape.

Numbered 42 because it polishes SPEC 40/41 directly. Collection chips + a Collection filter on `/dashboard` moved to SPEC 43, and collections in export/import to SPEC 44.

## Scope

**In:**

- **New icons** on the shared `Icon` base, exported from the barrel: `PlusIcon`, `XMarkIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `EllipsisHorizontalIcon`.
- **Collections list page** (`CollectionList`, `CollectionRow`):
  - the header button shows `PlusIcon` + `New`, with the accessible name `New collection`;
  - the row chevron is `ChevronRightIcon`;
  - a row with no emoji shows a `FolderIcon` tile (`data-testid="collection-folder-tile"`), tinted with the accent colour;
  - while loading, the page shows 4 skeleton rows (`SkeletonRows`, `variant="row"`), a `role="status"` with the sr-only label `Loading collections…`.
- **Collection form** (`CollectionForm`, used for both New and Edit):
  - visible `Name` and `Description (optional)` labels;
  - the name input is focused on mount only with a fine pointer (`matchMedia('(pointer: fine)')`); `autoFocus` is gone;
  - an `n/200` counter under the description from 160 characters (`DESCRIPTION_COUNTER_FROM`), turning amber from 190, linked by `aria-describedby` and announced politely;
  - the emoji picker follows the resolved theme (`useTheme().theme`) and is capped at `calc(100vw - 2rem)` wide;
  - `CategoryForm`'s emoji picker gets the same theme fix.
- **Collection page** (`CollectionDetail`):
  - the back link uses `ChevronLeftIcon`;
  - `+ Add links` shows `PlusIcon` + `Add links`, and its accessible name stays `+ Add links`;
  - each row's remove control uses `XMarkIcon`, with its name unchanged (`Remove from collection`);
  - **header actions** are `Play next`, `+ Add links` and, pushed right, an icon-only `···` button (`Collection options`, `aria-haspopup="dialog"`, `aria-expanded`). It opens `CollectionOptionsSheet` (on `SheetShell`, titled with the collection name), which has two rows:
    - `Edit collection` opens the inline edit form;
    - `Delete collection` (red) opens the inline delete confirm.

    The sheet returns focus to `···`.
  - **delete confirm**:
    - it focuses `Cancel` when it opens;
    - Escape inside it cancels;
    - Cancel (button or Escape) puts focus back on `···`;
    - the red button reads `Deleting…` while the delete runs.
  - **empty collection**: under "No links in this collection yet." there's a primary `Add links` button that opens the same Add links sheet. Removing the last link still sends focus to the header `+ Add links`;
  - **loading**: the back link, a header skeleton and 3 card skeletons (`SkeletonRows`, `variant="card"`, `header`) with the sr-only label `Loading collection…`.
- **`SkeletonRows`** (`components/SkeletonRows.tsx`): pulses with `animate-pulse` and stops under reduced motion (`motion-reduce:animate-none`). The placeholder blocks are `aria-hidden`.

**Out:**

- the Add links sheet stays type-first (SPEC 40's decision);
- progress bars or done-markers on rows;
- `BottomSheet`/`SheetShell` close glyphs (`✕`) and other pages' glyphs, left for a separate sweep.

## Acceptance criteria

1. No `+`, `›`, `‹` or `✕` text glyph is a control on the Collections list page, the collection page or their rows.
2. A collection row without an emoji shows the folder tile. A row with one shows only the emoji.
3. In dark mode the emoji picker in the collection and category forms opens dark.
4. The collection form has visible Name and Description labels. On a touch screen opening it doesn't focus the name.
5. Typing 160+ description characters shows `n/200`, amber from 190.
6. On the collection page the header row has no Edit or Delete button. `···` opens a dialog named after the collection with `Edit collection` and `Delete collection`.
7. `Delete collection` shows the confirm with focus on Cancel. Escape closes it and focuses `···`.
8. An empty collection shows an `Add links` button that opens the Add links sheet.
9. Both pages show skeletons while loading, announced as `Loading collections…` / `Loading collection…`.

## Decisions

- **A sheet for `···`, not a popover menu.** Every menu in the app is a sheet built on `useDialog`, so this one gets the same focus trap, Escape handling and mobile layout.
- **`+ Add links` keeps its accessible name.** Existing focus logic and tests find it by that name, and it stays distinct from the empty-state `Add links` button.
- **Fine-pointer autofocus.** The form is inline, not a dialog, so `useDialog`'s `data-autofocus` handling doesn't reach it. A mount effect gives the same result.
