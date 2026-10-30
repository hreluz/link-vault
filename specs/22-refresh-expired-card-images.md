# SPEC 22 — Refresh a card image that fails to load

> **Status:** Approved
> **Depends on:** SPEC 07
> **Date:** 2026-10-30
> **Objective:** When a dashboard card's image fails to load (e.g. an Instagram CDN URL whose signature has expired), fetch the link's metadata again once. If that returns a new image, show it and save it; otherwise show the card without an image for the rest of the session.

## Why this spec exists

`image_url` is the page's `og:image`, stored as-is (feature #1). For Instagram (and other Meta/TikTok CDNs) that URL is signed and carries an expiry (`oe=<hex unix time>`). After a few days the CDN answers **403** and the card shows a broken image. Fetching the same link again (`fetchLinkMeta`) returns a freshly signed URL that loads fine. As the user put it: "I see 403 but if I load again the same link it loads correctly".

## Scope

**In:**

- **Trigger:** the `<img>` `onError` event on `LinkCard` (dashboard list only).
  - Any host. The browser can't see an `<img>`'s HTTP status, so any load error counts (403, 404, network).
  - Images stay `loading="lazy"`, so only cards that scroll into view can trigger it.
- **At most one refresh per link per session.** A link already tried (successfully or not) is never queued again while the hook is mounted. An image error on an already-tried link (e.g. the refreshed URL also fails) marks it `'failed'` straight away. ↻ and filter changes don't reset this.
- **A serial queue.** One refresh at a time, at least **4 s** between refreshes to the same host group (`hostGroupOf` from `lib/services/importExport/fetchGuard.ts`, so `instagram.com`/`www.instagram.com` share a group). Different host groups don't wait on each other beyond the one-at-a-time rule.
- **The refresh** calls the existing `fetchLinkMeta(link.url)` server action.
  - **It returns an image different from the stored one:** the card shows it right away (local `rawLinks` update). It is also saved via the new `updateLinkImage`. If the save fails, the new image still shows this session, with no toast.
  - **No image, the same image, or the call throws:** the card shows the no-image layout (duration inline next to `site_name`, as for links with no `image_url`) for the session. The DB is not changed.
  - **`rateLimited: true`:** that link gets the no-image layout. Every queued refresh for the same host group is dropped and gets the no-image layout too. No further refresh for that host group runs this session. Other host groups continue.
- **While a card is queued or refreshing**, its image slot shows a pulsing 16:9 placeholder (`animate-pulse` on a `surface-*` tile, same aspect ratio as the image). That way the card height doesn't jump until it either swaps in the new image or collapses to the no-image layout.
- **A link that leaves the loaded list** (delete, filter change, etc.) while queued is skipped when its turn comes.
- Tests for the new hook, the new service function and the `LinkCard` states, plus a CLAUDE.md note in feature #1.

**Out of scope (for future specs):**

- Detecting an expired `oe=` before rendering (proactive refresh).
- `TrashCard`, the edit form preview, or any other surface. They pick up a saved refreshed URL on their next load, but don't refresh themselves.
- Storing images ourselves (Supabase Storage / proxy).
- Refreshing title, description or duration. Only `image_url` is touched.
- Clearing `image_url` in the DB when a refresh finds nothing.
- An admin setting for the 4 s gap.
- Any import/export change.

## Data model

No DB migration. `image_url` already lives inside the encrypted `enc_payload` (ENCRYPTION.md).

```ts
// lib/services/links.ts — NEW
/** Re-encrypts the link's content with a new image_url and updates only enc_payload/enc_iv
 *  (no tags, status, category or url_fingerprint change). Returns false on failure. */
export async function updateLinkImage(link: LinkWithTags, imageUrl: string, dek: CryptoKey): Promise<boolean>

// lib/hooks/links/list/useCardImageRefresh.ts — NEW
export const IMAGE_REFRESH_GAP_MS = 4000

type CardImageState = 'refreshing' | 'failed'   // absent = show image_url normally

useCardImageRefresh(deps: {
  links: LinkWithTags[]                                   // loaded links (to skip ones that left)
  setRawLinks: Dispatch<SetStateAction<LinkWithTags[]>>
  dek: CryptoKey | null
  fetchMeta?: typeof fetchLinkMeta                        // injectable for tests
  updateImage?: typeof updateLinkImage
  now?: () => number; sleep?: (ms: number) => Promise<void>
}): {
  imageStateById: Record<string, CardImageState>
  handleImageError: (id: string) => void
}
```

- `useLinks` composes `useCardImageRefresh`, since it owns `setRawLinks` and `dek`. It and `useLinkList` pass `imageStateById` and `handleImageError` through, and `LinkListContext` exposes them.
- `LinkCard` gets two new props, `imageState?: CardImageState` and `onImageError?: () => void`. `LinkGrid` passes `imageStateById[link.id]` and `() => handleImageError(link.id)`.
- `LinkCard` rendering:
  - `image_url` set and no state → `<img onError={onImageError}>` (as today plus the handler);
  - `'refreshing'` → the pulsing 16:9 tile, with the duration badge kept on it;
  - `'failed'` → the no-image layout;
  - after a successful refresh the state entry is removed, and `link.image_url` is the new URL.

## Implementation plan

1. **`updateLinkImage` service** in `lib/services/links.ts`.
   - Build `LinkContent` from the decrypted link with `image_url: imageUrl`.
   - Encrypt it with `toEncryptedColumns`, then `.update({ enc_payload, enc_iv }).eq('id', link.id)`.
   - Return `true`/`false`.

   Tests in `tests/services/links.test.ts` (or the existing links service test file):
   - it only sends `enc_payload`/`enc_iv`;
   - it returns `false` on a Supabase error.
2. **`useCardImageRefresh` hook** with an injectable clock/sleep, following the `createFetchGuard` style.

   Tests in `tests/hooks/links/list/useCardImageRefresh.test.ts` (fake timers, mocked `fetchMeta`/`updateImage`):
   - an error → `'refreshing'` → a new image → `rawLinks` has the new URL, the state is cleared, and `updateImage` is called once;
   - the same URL or `null` image → `'failed'`, with no save;
   - `fetchMeta` throws → `'failed'`;
   - a second error for the same id → nothing is queued again, and the state becomes `'failed'`;
   - two same-host errors → the second fetch starts ≥ 4 s after the first;
   - errors on two different host groups → no 4 s wait between them, but they never run in parallel;
   - `rateLimited` → the queued same-host links become `'failed'` without fetching, a later same-host error is `'failed'` immediately, and other hosts still refresh;
   - a link removed from `links` while queued → it is not fetched;
   - `updateImage` returns false → the new image is still shown, and there is no toast.
3. **Compose and wire.** `useLinks` → `useLinkList` → `LinkListContext` → `LinkGrid` → `LinkCard` props.

   Tests:
   - `LinkCard`: the three render states, and `onImageError` fires on an `img` `error` event;
   - `LinkGrid`: it passes the state and handler for the right link.
4. **Docs.** In CLAUDE.md feature #1, after the `image_url` sentence, add: when a dashboard card's image fails to load (e.g. an expired Instagram signed URL), `useCardImageRefresh` (`lib/hooks/links/list/`) re-runs `fetchLinkMeta` once per link per session. The refreshes go through a serial queue with a 4 s gap per host group, and a `rateLimited` result stops that host group for the session. A new image is shown and saved via `updateLinkImage`. Otherwise the card falls back to the no-image layout. A pulsing placeholder shows while it waits.

## Acceptance criteria

- [ ] An Instagram card whose stored image returns 403 shows a pulsing placeholder, then the fresh image, with no manual action.
- [ ] After a reload, the same card loads the refreshed image directly (it was saved), with no refresh request.
- [ ] A card whose refresh finds no image shows the no-image layout (duration inline), and the DB `image_url` is unchanged.
- [ ] Scrolling past several broken Instagram cards triggers refreshes one at a time, ≥ 4 s apart (visible in the network log).
- [ ] A link is refreshed at most once per session, even if its image errors again.
- [ ] After a 429 from a host, no more refreshes are sent to that host this session, and the affected cards show the no-image layout.
- [ ] Cards with working images make no `fetchLinkMeta` call.
- [ ] Trash cards are unchanged.
- [ ] `npm test` passes, including the new tests.

## Decisions

- **Yes:** Refresh on `onError`, for any host. The user chose this. It's host-agnostic and covers the other signed CDNs (TikTok, Facebook) too.
- **No:** Parse `oe=` to refresh before the image breaks. It's Instagram-specific, and on-error already covers it, at the cost of a brief placeholder.
- **No:** Store images ourselves. Much bigger (storage, encrypting the image bytes). Deferred.
- **Yes:** Save a refreshed image to the DB. The fix then sticks until the new URL expires, instead of refetching every session.
- **No:** Clear `image_url` when the refresh finds nothing. The failure may be temporary (rate limit, private post, network). Session-only fallback keeps the data.
- **Yes:** A serial queue with a 4 s same-host gap (user's choice, stricter than import's 2 s). Scrolling past many expired Instagram cards must not trigger a 429.
- **Yes:** A 429 stops that host group for the session. Retrying a rate-limited host only makes it worse.
- **Yes:** A pulsing 16:9 placeholder while refreshing, so the card height doesn't jump twice.
- **Yes:** Dashboard `LinkCard` only. Trash is rarely viewed, and the saved URL reaches it anyway.
- **Yes:** `updateLinkImage` re-encrypts the whole payload. `enc_payload` is one blob, so a single field can't be patched server-side. The client already holds the decrypted link.
- **Yes:** A failed save shows no toast. The user sees the right image either way, and the next session simply retries.

## Risks

| Risk | Mitigation |
| --- | --- |
| A refresh hits Instagram from the server and gets a generic app shell (no og:image) | It's treated as "no image" → no-image layout. The DB isn't touched. |
| Many broken cards → many server-action calls | Lazy loading, once per link per session, the serial queue, the 4 s gap and the 429 stop together bound it. |
| `updateLinkImage` overwrites a concurrent edit made in another tab | It uses the client's loaded copy, the same exposure as `updateLink` today. Accepted. |
| The new URL also fails to load | The second `onError` finds the link already tried and marks it `'failed'`, so the card shows the no-image layout instead of a broken image. |
| The link is edited or deleted mid-refresh | The queue skips links no longer in `links`. The result is applied only if the link is still loaded. |

## What is **not** in this spec

- Proactive `oe=` expiry detection.
- Trash / edit-form image refresh.
- Self-hosted image storage.
- Refreshing other metadata fields.
- An admin-configurable gap.

Each one of those, if it lands, goes in its own spec.
