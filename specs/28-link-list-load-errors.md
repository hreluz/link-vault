# SPEC 28 — Show an error when the link list fails to load

> **Status:** Approved
> **Depends on:** SPEC 10
> **Date:** 2026-11-02
> **Objective:** When the dashboard list can't load, the user sees an error with a Retry button, instead of a false "no links" message or skeletons that never end.

## Why this spec exists

SPEC 10 left error handling for normal loads out of scope. Today a failure looks like one of these:

- `getLinksPage` and `getMatchingLinkIds` turn a database error into an empty result, so a network failure looks like an empty vault.
- A failed ↻ gets the same empty result, so it replaces the loaded list with nothing instead of reporting a failure. `usePaginatedQuery.refresh` can only report a rejected fetch, and these functions don't reject.
- In `usePaginatedQuery`, the first-load and `loadMore` fetches have no rejection handling. A decrypt failure leaves skeletons on screen forever, and a failed `loadMore` leaves `loadingMoreRef` set, so no more pages ever load.

## Scope

**In:**

- `getLinksPage` and `getMatchingLinkIds` throw on a database error. `getLinksByIds` is checked and does the same if it hides errors.
- `usePaginatedQuery` catches rejected first-load and `loadMore` fetches and exposes `error: 'load' | 'loadMore' | null` and `retry()`.
- First-load failure: `LinkGrid` shows an error message with a `Try again` button in place of the skeletons or empty state.
- `loadMore` failure: loaded cards stay, and a small error with `Try again` replaces the scroll sentinel, which stops firing until retried.
- A failed ↻ keeps the current list, and shows the toast the refresh path already has.

**Out of scope (for future specs):**

- Automatic retries or backoff.
- An offline indicator.
- Error handling in other lists (Trash, Organize).
- Telling a decrypt failure apart from a network failure in the message.

## Data model

This feature introduces no new data and no DB change.

```ts
// lib/hooks/shared/usePaginatedQuery.ts — added to PaginatedQuery<T, M>
error: 'load' | 'loadMore' | null
retry: () => void
```

## Implementation plan

1. **Make the services throw.** Keep the `!data` empty case only where no error occurred. Check every caller of the changed functions.
2. **Update `usePaginatedQuery`.**
   - Catch rejections on both paths, ignoring stale request ids, and set `loading` or `loadingMore` to false.
   - Reset `loadingMoreRef` on failure.
   - `retry()` re-runs whichever fetch failed.
   - Starting a new fetch or changing params clears `error`.
3. **Pass it through** `useLinkListQuery`, `useLinks` and `LinkListContext`.
4. **Update `LinkGrid`.** Add the two error states, using the design system's error message and secondary button.
5. **Add tests:** services throw on error; the hook covers first-load failure, `loadMore` failure, retry and stale results; `LinkGrid` covers both error states, and a real empty vault still shows the empty state.

## Acceptance criteria

- [ ] With the database unreachable on first load, the dashboard shows an error and `Try again`, not skeletons and not the empty state.
- [ ] `Try again` loads the list once the database is back.
- [ ] A failed later page keeps the loaded cards and shows `Try again` at the bottom.
- [ ] After that `Try again` succeeds, scrolling loads later pages again.
- [ ] A failed ↻ keeps the current cards and shows an error toast.
- [ ] A search or alphabetical sort that fails to load candidates shows the error, not "no results".
- [ ] An account with no links still shows the normal empty state.
- [ ] `npx tsc --noEmit` reports no errors.
- [ ] `npm test` passes.

## Decisions

- **Yes:** fix the services as well as the hook. Catching rejections alone would miss database errors, because the services hide them. **No:** an `error` field on each service's return value. Throwing is what `refresh` already expects.
- **Yes:** keep loaded cards after a `loadMore` failure. Replacing them would lose the user's place.
- **No:** automatic retries. Failing visibly with one button is enough for now.

## Risks

| Risk | Mitigation |
| --- | --- |
| Another caller relied on the empty result | Step 1 checks every caller, and the type check doesn't replace that. |
| A locked vault looks like a failure | `fetchPage` already returns an empty page when `dek` is missing, and that path doesn't throw. |
| A rejected fetch from old params overwrites the new state | The existing request id check also guards the error path. |

## What is **not** in this spec

- Automatic retries.
- An offline indicator.
- Error states for other lists.

Each one of those, if it lands, goes in its own spec.
