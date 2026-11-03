# SPEC 25 — Send-to-end card button, per-user move delay, compact Add button

> **Status:** Approved
> **Depends on:** SPEC 15, SPEC 16, SPEC 21
> **Date:** 2026-11-02
> **Objective:** Link cards get a button that sends them to the end right away, each user can set the 30-second move delay in Link Preferences, and the list header's "+ Add link" button shows only "+".

## Why this spec exists

SPEC 15 moves a card to the end only after it is opened, and always after 30 s. The user wants to skip a link without opening it, and to choose how long the automatic move waits. SPEC 15 left the delay preference out of scope, and this spec adds it. The header is also getting crowded (Undo, ↻, Select, Add), so the Add button shrinks to its symbol.

## Scope

**In:**

- **Compact Add button** (`app/dashboard/link/LinkListHeader.tsx`):
  - it shows only `+` on every screen size;
  - it keeps `bg-primary-600` and opens the same modal;
  - `aria-label` and `title` are both `Add link`.
- **Send-to-end button on `LinkCard`:**
  - a new icon button in the card's top icon row, between Edit and ···, with `aria-label` and `title` set to `Send to end`;
  - it is hidden in selection mode, like the rest of the row;
  - tapping it does not open the link.
- **What a tap does:**
  - the card moves to the end of the loaded list right away, through the existing `handleMoveToEnd`, and `moved_to_end_at` is saved;
  - any pending timer for that link is cancelled;
  - the status doesn't change, so an Unread link stays Unread and `lastOpenedId` isn't touched;
  - the header's Undo button (SPEC 16) offers to undo it, in the same single slot as automatic moves;
  - it works on every link, including favorites and links that were already moved (which go to the very end again);
  - a failed save uses the existing rollback and `Failed to move link` toast.
- **Moved links stay held back** (SPEC 21). While more pages are left to load, the sent card leaves the screen until the last page has loaded. Undo still brings it back.
- **Per-user delay:**
  - a new `move_to_end_delay_seconds` column on `user_preferences`, default 30, whole seconds from 5 to 600;
  - there is no off switch;
  - it is edited in a new "Move opened links to the end" section of Config → Link Preferences (`LinkPreferencesForm`), with a number input and a Save button;
  - it is validated in the form, in the service function and by a DB `check` constraint;
  - saving shows a `Saved` toast; a failure shows the existing inline error block.
- **When a new delay applies:**
  - it is read once on the server when `/dashboard` loads;
  - a tab already on the dashboard keeps the old value until it reloads;
  - ↻ does not re-read it.
- **"Everything" export and import:**
  - the v2 `preferences` object carries `move_to_end_delay_seconds`, so the file stays a full clone;
  - the field is optional on import, and older files without it stay valid and leave the destination's value alone;
  - a value present but outside 5–600 fails the existing up-front validation.
- Tests for each part, plus CLAUDE.md notes.

**Out of scope (for future specs):**

- Turning the automatic move off.
- An admin-wide delay or an admin-set default.
- Re-reading the delay on ↻, or live updates to open tabs.
- A send-to-end item in the ··· menu / `BottomSheet`.
- A bulk "send to end" action.
- A "send to end" swipe gesture.
- Changing the status on send.
- A success toast, countdown or animation.

## Data model

**DB — new migration `supabase/migrations/0021_move_to_end_delay_preference.sql`:**

```sql
alter table public.user_preferences
  add column move_to_end_delay_seconds integer not null default 30
    check (move_to_end_delay_seconds between 5 and 600);
```

Existing rows take the default, and `handle_new_user` needs no change. Grants and RLS on `user_preferences` already cover the new column. The value is plaintext because it isn't link content.

**TypeScript:**

```ts
// lib/types/database.ts — user_preferences Row/Insert/Update
move_to_end_delay_seconds: number

// lib/types/importExport.ts — v2 preferences
move_to_end_delay_seconds?: number

// lib/services/userPreferences.ts
export const DEFAULT_MOVE_TO_END_DELAY_SECONDS = 30
export const MOVE_TO_END_DELAY_LIMITS = [5, 600] as const
/** null when valid; otherwise the error message. */
export function validateMoveToEndDelay(seconds: number): string | null
/** Returns the default when there is no user or the read fails. */
export async function getMoveToEndDelay(supabase: SupabaseClient<Database>): Promise<number>
export async function setMoveToEndDelay(supabase: SupabaseClient<Database>, seconds: number): Promise<ToggleResult>

// lib/hooks/links/list/useMoveOpenedToEnd.ts — new option; 30 s when omitted
delayMs?: number

// lib/hooks/links/list/useLinkList.ts
useLinkList(autoFetchDefault = true, moveToEndDelaySeconds = DEFAULT_MOVE_TO_END_DELAY_SECONDS)
handleSendToEnd: (id: string) => void  // new return value

// app/dashboard/link/LinkCard.tsx
onSendToEnd?: () => void
```

## Implementation plan

1. **Compact Add button.** In `LinkListHeader`, show `+` with `aria-label="Add link"` and `title="Add link"`, sized to match the other header buttons' height.

   Test in `tests/components/LinkListHeader.test.tsx`: the button is found by the name `Add link`, its text is `+`, and clicking it opens the modal.
2. **Delay in the timer hook.** Add `delayMs` to `useMoveOpenedToEnd`, used for every start and restart and defaulting to `MOVE_TO_END_DELAY_MS`.

   Tests in `tests/hooks/links/list/useMoveOpenedToEnd.test.ts`:
   - with `delayMs: 5000`, `onMove` fires at 5 s and not at 4.9 s;
   - after a pause ends, the timer restarts from the full `delayMs`;
   - with no `delayMs`, it still fires at 30 s.
3. **`handleSendToEnd` in `useLinkList`.**
   - Remove the id from `pendingMoveIdsRef`.
   - Call `cancelMove(id, 'sent to end')`.
   - Call `handleMoveToEnd(id)`.
   - Return it from the hook.

   Tests in `tests/hooks/links/list/useLinkList.test.ts`:
   - the link moves to the end right away and `markLinkMovedToEnd` is called once;
   - the status is unchanged and `lastOpenedId` is unchanged;
   - opening a link and then sending it to the end doesn't move it a second time when the timer would have ended;
   - `lastMovedLink` is the sent link, and undoing puts it back at its old index.
4. **Button on the card.** Add `onSendToEnd` to `LinkCard`, rendered between Edit and ··· with the same button classes as Edit and an arrow-down-to-line icon. Wire it in `LinkGrid` to `handleSendToEnd(link.id)`. So that five icons fit on a 320 px screen, change the category pill from `shrink-0` to `min-w-0` with its name truncated.

   Tests in `tests/components/LinkCard.test.tsx`:
   - clicking the button calls `onSendToEnd` and not `onOpen`;
   - it isn't rendered in selection mode;
   - it isn't rendered when `onSendToEnd` is not passed.
5. **Migration and service.** Write `0021_move_to_end_delay_preference.sql`, update `lib/types/database.ts`, and add the constants and functions from the Data model to `lib/services/userPreferences.ts`.

   Check locally that `supabase db reset` applies cleanly.

   Tests in a new `tests/services/userPreferences.test.ts`:
   - `validateMoveToEndDelay` accepts 5 and 600, and rejects 4, 601, 30.5 and `NaN`;
   - `setMoveToEndDelay` doesn't write an invalid value;
   - `getMoveToEndDelay` returns 30 on a read error or with no user.
6. **Dashboard uses the setting.** `app/dashboard/page.tsx` reads `getMoveToEndDelay` alongside `getAutoFetchPreference` with `Promise.all`. It passes the value through `LinkList` and `LinkListProvider` to `useLinkList`, which passes `delayMs: seconds * 1000` to the timer hook.

   Test in `useLinkList.test.ts`: with `moveToEndDelaySeconds = 5`, an opened link moves after 5 s.
7. **Link Preferences form.**
   - Add `saveMoveToEndDelayAction` in `app/dashboard/config/link-preferences/actions.ts`. It calls `setMoveToEndDelay` and then `revalidatePath('/dashboard')`, so the next in-app visit gets the new value.
   - Read the value in `page.tsx` and pass it as `initialMoveToEndDelaySeconds`.
   - Add the section to `LinkPreferencesForm`, labelled `Move opened links to the end after (seconds, 5–600)`, with a Save button. An empty field is rejected like any other invalid value.

   Tests in a new `tests/components/LinkPreferencesForm.test.tsx`:
   - it shows the initial value;
   - an out-of-range value shows the error and doesn't call the action;
   - a valid value calls the action with a number and shows `Saved`;
   - a failed action shows its error.
8. **Export and import.**
   - `buildVaultExport` includes the value.
   - `getVaultExportValidationError` accepts the field when missing, and rejects a value that isn't a whole number from 5 to 600.
   - `importVaultExport` applies it only when present, as another named step in the preferences phase, so a failure is reported like the others.

   Tests in `tests/services/importExport/`: the value round-trips, a file without it leaves the destination's value alone and doesn't call `setMoveToEndDelay`, and `601` fails validation.
9. **Docs.** In CLAUDE.md:
   - feature #5: the delay comes from `move_to_end_delay_seconds` (default 30, 5–600), and the card's Send to end button moves a link right away with its status untouched;
   - feature #6: `+ Add link` becomes `+`;
   - feature #12: the "Everything" preferences include the delay;
   - feature #1 is unchanged, but note the new setting next to `auto_fetch_enabled` in the Link Preferences description.

## Acceptance criteria

- [ ] The list header's Add button shows only `+` on phone and desktop, and clicking it opens the Add link modal.
- [ ] A screen reader announces that button as "Add link", and hovering it shows the tooltip `Add link`.
- [ ] Every card outside selection mode shows a Send to end button between Edit and ···.
- [ ] Tapping Send to end doesn't open the link or change its status.
- [ ] With all pages loaded, the tapped card goes to the end of the list right away.
- [ ] With more pages left to load, the tapped card leaves the screen and appears at the very end once the last page has loaded.
- [ ] After a tap, a page reload still shows the link after all unmoved links.
- [ ] After a tap, the header's Undo button appears, and using it puts the card back at its old position.
- [ ] Opening a link and then sending it to the end cancels its timer, so the card doesn't move again later.
- [ ] Send to end works on a favorited link.
- [ ] With the network offline, a tap returns the card to its position and shows `Failed to move link`.
- [ ] On a 320 px wide screen, a card with a long category name shows all five icons with no horizontal overflow.
- [ ] Link Preferences shows 30 for a user who never changed the setting.
- [ ] Saving 5 and then opening the dashboard through the app's navigation makes an opened link move after 5 s.
- [ ] The saved value survives a reload and logging out and back in.
- [ ] One user's value doesn't affect another user's dashboard.
- [ ] The form rejects 4, 601, 30.5 and an empty field with an error, and saves nothing.
- [ ] A dashboard tab open during the change keeps the old delay until it reloads, and ↻ doesn't change that.
- [ ] Pause and restart still work, using the saved delay instead of 30 s.
- [ ] An "Everything" export includes the delay, and importing it with "apply preferences" on sets it on the destination account.
- [ ] Importing an older "Everything" file without the field succeeds and leaves the destination's delay unchanged.
- [ ] `supabase db reset` applies migration 0021 with no errors.
- [ ] `npm test` passes, including the new and updated tests.

## Decisions

- **Yes:** `+` on every screen size, as the user chose. **No:** keeping the full label on desktop. `aria-label` and `title` keep the button's meaning.
- **Yes:** the button sits in the card's icon row, one tap away, as the user chose. **No:** only in the ··· menu, which takes two taps.
- **Yes:** the status stays untouched, as the user chose. Sending a link away means "skip for now", not "I started it". **No:** advancing Unread to Watching.
- **Yes:** reuse `handleMoveToEnd`. Saving, rollback, the page offset fix and Undo come with it.
- **Yes:** a per-user setting on `user_preferences`, as the user decided. It is a reading-pace choice, not something that protects shared resources. **No:** admin-wide on `app_settings`, which was chosen first and then replaced.
- **Yes:** 5–600 s with no off switch, as the user chose for the range. The 5 s minimum stops cards jumping away almost immediately.
- **Yes:** read on dashboard load, as the user chose. The value rarely changes, so it needs no extra requests. **No:** re-reading on ↻.
- **Yes:** `revalidatePath('/dashboard')` after saving, so the next in-app visit doesn't show a stale value.
- **Yes:** include the value in "Everything" exports, as an optional field. That format promises a full clone of preferences, and optional keeps older files valid. This wasn't discussed with the user; it follows the existing `auto_fetch_enabled` behavior.
- **Yes:** the delay and the auto-fetch toggle save separately on the page. The toggle saves on click, and a number needs an explicit Save so half-typed values aren't sent.

## Risks

| Risk | Mitigation |
| --- | --- |
| Five icons crowd the card's top row on narrow phones | The category pill can now shrink and truncate; the 320 px criterion covers it. |
| A mistaken tap sends a card off screen | Undo appears in the header, as with automatic moves. |
| Rapid tapping on several cards leaves only the last one undoable | Accepted. SPEC 16's single slot is unchanged. |
| A short 5 s delay moves a card while the user still looks at it | The minimum is the user's choice, and the existing pauses still apply. |
| A tab left open uses the old delay | Accepted and stated in Scope; a reload picks up the new value. |

## What is **not** in this spec

- An off switch for the automatic move.
- An admin-wide delay or default.
- Live updates to open tabs, or re-reading on ↻.
- A send-to-end menu item, bulk action or swipe gesture.
- Any status change on send.
- A success toast, countdown or animation.

Each one of those, if it lands, goes in its own spec.
