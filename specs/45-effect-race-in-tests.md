# SPEC 45 — Stop tests from racing React's passive effects

> **Status:** Approved
> **Depends on:** SPEC 40, SPEC 44
> **Date:** 2026-11-24
> **Objective:** Set the collection tab title during the commit and make tests wait for effect-driven results, so that `CollectionDetail`'s tab-title test and any test with the same race stop failing at random.

## Why this spec exists

CI failed on `tests/components/CollectionDetail.test.tsx > shows the header, counts and the tab title` with `expected '' to be 'Learn Rust — Link Vault'`. Running that test alone locally failed 1 time in 15. The app works. Only the test is flaky.

**Mechanism.**

1. `useCollectionLinks` sets `collection`, `rows`, `loading` and the rest together after its awaits. React makes one commit, so the heading and the counts reach the DOM together.
2. `CollectionDetail.tsx` sets `document.title` in a `useEffect`. That's a passive effect. The update came from a promise resolving outside `act`, so React doesn't run passive effects during the commit. The scheduler runs them later as a separate macrotask.
3. `findByRole('heading')` is built on `waitFor`, which uses a `MutationObserver`. Its callback is a microtask that fires right after the DOM changes, before the scheduler's task runs.
4. The test's next line reads `document.title` while it's still `''`. Whether it passes depends on machine timing, which is why the slower CI runner shows it more often.

The race came in with SPEC 40. SPEC 44 removed the `window is not defined` errors, so this is now the only flaky failure CI shows.

**Numbering.** SPEC 44 moved collection chips on dashboard cards and the Collection filter to SPEC 45. This spec takes 45, and that work moves to SPEC 46. Older specs stay as written. CLAUDE.md is updated.

## Scope

**In:**

- `app/dashboard/organize/collections/[id]/CollectionDetail.tsx`: set the tab title in `useLayoutEffect` instead of `useEffect`. The dependency (`collection`) and the text (`<name> — Link Vault`) stay the same.
- `tests/components/CollectionDetail.test.tsx`: the tab-title check becomes `await waitFor(() => expect(document.title).toBe('Learn Rust — Link Vault'))`.
- Sweep the jsdom test files for the same pattern: after a `findBy*`, `waitFor` or other `await` that waits for the DOM, a synchronous check of something a passive effect does (`document.title`, `document.activeElement` / focus, `scrollIntoView` or `scrollIntoViewIfHidden` calls, other mocks called from a `useEffect`). Each match that can race gets wrapped in `waitFor`. Files to check first, since they mix `findBy*` with those checks: `CollectionList`, `CollectionDetail`, `CollectionPickerSheet`, `CollectionsField`, `LoginForm`, `ImportFetchSettingsCard`, `ImportExportClient`, `LinkPreferencesForm` (all in `tests/components/`). The sweep covers every jsdom test file, not only these.
- A check doesn't race when the effect it depends on was flushed by an `act` that already finished (a `fireEvent` / `act(...)` call after the render, or a `render`/`renderHook` whose update is synchronous). Leave those checks alone.
- CLAUDE.md: "chips on dashboard cards and a Collection filter are SPEC 45" becomes SPEC 46. Add one line next to the Vitest note in Stack: after an async load, check effect-driven results (title, focus, scroll, effect-called mocks) inside `waitFor`, not right after `findBy*`.

**Out of scope:**

- Moving other app effects to `useLayoutEffect`. Only the title changes in app code.
- Wrapping service mocks in `act` or using fake timers to force effects to flush.
- Retrying flaky tests (`retry` in the Vitest config) or skipping them.
- Fixing `act(...)` warnings, the existing `tsc`/lint errors, or unrelated tests.

## Data model

This spec adds no new data structures. It changes test assertions and one effect hook.

## Implementation plan

1. Baseline: `nvm use`. Run `npx vitest run tests/components/CollectionDetail.test.tsx` 15 times and record the failure count (it was 1 of 15 when this spec was written).
2. In `CollectionDetail.tsx`, change the title effect to `useLayoutEffect` (adding it to the `react` import). In `CollectionDetail.test.tsx`, wrap the title check in `waitFor` (adding it to the `@testing-library/react` import). Run that file.
3. Sweep: `grep` the jsdom test files for `findBy`/`await waitFor` and read the checks that follow them. Wrap each check that can race in `waitFor`. Do it one file at a time and run the file after each change. List the changed files and checks in the PR description.
4. Update CLAUDE.md (SPEC 45 → 46 reference, and the `waitFor` note).
5. Verify: run `npm test` 10 times in a row.

## Acceptance criteria

- [ ] `CollectionDetail.tsx` sets `document.title` in a `useLayoutEffect` that depends on `collection`. No `useEffect` there writes `document.title`.
- [ ] `CollectionDetail.test.tsx` checks the title inside `waitFor`.
- [ ] Every check changed by the sweep is listed in the PR description, or the description says the sweep found nothing else.
- [ ] In every jsdom test file, no synchronous check of `document.title` follows a `findBy*` with nothing in between that flushes effects.
- [ ] 10 consecutive `npm test` runs each exit 0 with no failed tests and no "Unhandled Errors" block. The number of tests is the same as before (2260 today).
- [ ] CLAUDE.md names the chips/Collection filter work SPEC 46 and has the `waitFor` note.
- [ ] The files this spec touches lint clean (`npx eslint <files>`).

## Decisions

- **Yes: fix both the app and the test.** `useLayoutEffect` sets the title during the commit, before the `MutationObserver` callback, so the title can't be one step behind the heading. `waitFor` in the test also protects the check if the title logic changes later.
- **No: app fix alone.** The test would still rely on React's internal effect timing.
- **Yes: sweep for the same pattern.** Any `findBy*` followed by a check of an effect result can race the same way. Fixing only the test CI caught would leave the next one to fail at random.
- **Yes: keep the sweep to checks that can race.** Checks after a finished `act` (`fireEvent`, `act(...)`) see their effects flushed, so wrapping those adds noise and catches nothing.
- **No: `retry` in the Vitest config.** It hides races instead of removing them.
- **Yes: verify with 10 full `npm test` runs.** That's the same bar as SPEC 44 and is what CI runs. The failure is rare, so a single green run proves nothing.
- **Yes: take number 45, chips/filter move to 46.** That spec isn't written yet, the same reasoning SPEC 44 used.

## Risks

| Risk | Mitigation |
| --- | --- |
| The race shows up in about 1 of 15 runs, so 10 green full runs can't prove every race is gone | The sweep removes the pattern itself. The 10 runs are a sanity check, not the proof. |
| `useLayoutEffect` warns during server rendering | `CollectionDetail` is a client component that renders after the vault unlocks, and the title only changes once `collection` is loaded on the client. If a warning shows up in `next build` or the dev log, go back to `useEffect` and keep the test fix. |
| A `waitFor` wrapped around a check that should never be async hides a real bug | Only wrap checks that follow an async load. Leave checks after a finished `act` synchronous. |

## What is **not** in this spec

- Moving other effects to layout effects.
- Changing Vitest config (`retry`, `globals`, fake timers by default).
- Fixing `act(...)` warnings or the existing `tsc`/lint errors.
- The collection chips and Collection filter work (now SPEC 46).
