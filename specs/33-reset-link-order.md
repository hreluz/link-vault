# SPEC 33 — Reset the moved-to-end order

> **Status:** Draft
> **Depends on:** SPEC 15, SPEC 25
> **Date:** 2026-11-02
> **Objective:** A `Reset link order` action in Link Preferences clears every move-to-end mark, so all links return to their normal sort position.

## Why this spec exists

Move-to-end marks only go away one at a time, by setting a link back to Unread or using Undo on the latest move. After months of use, many links sit in the moved group for good. SPECs 15 and 16 both deferred a way to clear them.

## Scope

**In:**

- A `Link order` section on `/dashboard/config/link-preferences`, with a `Reset link order` button and an in-page confirm step.
- It sets `moved_to_end_at` to null on all the user's links, including those in Trash, without changing status or anything else.
- A success toast with the number of links reset, or `No moved links to reset`.
- `revalidatePath('/dashboard')`, so the dashboard shows the new order on the next in-app visit.
- `CLAUDE.md` updated.

**Must keep working, unchanged:**

- Moving links after this reset works as before.
- Link status, favorites, `updated_at` and the move delay don't change.

**Out of scope (for future specs):**

- Resetting from the dashboard, or only for filtered links.
- An undo for the reset.
- Automatic expiry of marks.
- Updating open tabs live.

## Data model

This feature introduces no new data and no DB change.

```ts
// lib/services/links.ts — takes the client, because it's called from a server action
export async function clearAllMovedToEnd(
  supabase: SupabaseClient<Database>,
): Promise<{ success: true; count: number } | { success: false; error: string }>
```

## Implementation plan

1. **Add `clearAllMovedToEnd`.** It updates rows for the current user where `moved_to_end_at` is not null, and uses `.select('id')` to count them. Check that importing it into a server action doesn't pull browser-only code from `lib/services/links.ts`; if it does, put it in a small server-safe file.
2. **Add `resetLinkOrderAction`** in `link-preferences/actions.ts`, with the `revalidatePath`.
3. **Update `LinkPreferencesForm`.** Add the section, confirm step, pending state and toasts.
4. **Add tests:** the service's filter and count, and the form's confirm, cancel, success, nothing-to-reset and failure states.

## Acceptance criteria

- [ ] The section and button appear on Link Preferences, on phone and desktop.
- [ ] Pressing the button changes nothing until it is confirmed, and it can be cancelled.
- [ ] After confirming, previously moved links return to their normal position on the dashboard, in every sort mode, and stay there after a reload.
- [ ] The toast shows the number reset, or `No moved links to reset` if there were none.
- [ ] Status, favorites and `updated_at` don't change.
- [ ] Another user's links aren't affected.
- [ ] Opening a link after the reset still moves it to the end after the saved delay.
- [ ] A failed reset shows an error and changes nothing.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** put it in Link Preferences, next to the delay setting. **No:** the dashboard header, which already has several icons, for an action used rarely.
- **Yes:** a confirm step, because the old order can't be restored. **No:** an undo, which would need saving every old timestamp.
- **Yes:** include links in Trash, so a restored link doesn't bring back an old mark.
- **Yes:** leave `updated_at` alone. The order isn't a content edit, and `markLinkMovedToEnd` doesn't change it either. The step 1 update must not set it.

## Risks

| Risk | Mitigation |
| --- | --- |
| An open dashboard tab keeps the old order | Same as other changes made outside the list: it updates after ↻ or a reload. |
| A pending move timer marks a link just after the reset | Expected: that link was opened and moves as usual. |
| The Undo slot in another tab restores an old mark | Rare and harmless: it affects one link. |

## What is **not** in this spec

- A reset from the dashboard, or a filtered reset.
- An undo for the reset.
- Automatic expiry of marks.

Each one of those, if it lands, goes in its own spec.
