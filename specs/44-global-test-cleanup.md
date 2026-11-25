# SPEC 44 — Unmount Testing Library renders after every test

> **Status:** Implemented
> **Depends on:** —
> **Date:** 2026-11-24
> **Objective:** Every test file gets Testing Library's `cleanup()` after each test from one global setup file, so `npm test` never ends with a `window is not defined` unhandled error.

## Why this spec exists

`npm test` sometimes fails with `ReferenceError: window is not defined` from `react-dom-client` / `scheduler`, reported as an unhandled error and exit code 1, while every test passes. Vitest runs without `globals`, so Testing Library never registers its automatic cleanup; 60 of the 90 jsdom test files never unmount what they render. React work still queued when a file's jsdom environment is torn down runs against a missing `window`. It is flaky and not tied to one feature: seen from `tests/hooks/collections/useCollectionSearch.test.ts` and from `tests/hooks/links/list/useLinkList.test.ts`, and the collection file passes on its own. In 3 full runs before this spec, 2 failed.

CI runs `npm test` (`.github/workflows/test.yml`), so this fails CI at random even when every test passes.

**Mechanism.** After a commit, React schedules a callback that reads `window.event` before flushing passive effects (`node_modules/react-dom/cjs/react-dom-client.development.js:17920`). A component left mounted keeps receiving updates when a mocked promise or timer resolves late; React commits, queues that callback, and it runs after jsdom is gone. Unmounting after each test stops those late commits.

SPEC 40–43 reserved "SPEC 44" for collection chips on dashboard cards and a Collection filter. This spec takes 44; that work becomes SPEC 45. The older specs are left as written; CLAUDE.md is updated.

## Scope

**In:**

- New `tests/setup.ts` that registers `afterEach(cleanup)` (imported from `vitest` and `@testing-library/react`). It runs for every file, including the 41 node-environment files, with no `typeof window` guard.
- `vitest.config.ts`: `test.setupFiles: ['./tests/setup.ts']`. `environment: 'node'` and the per-file `// @vitest-environment jsdom` comments stay as they are.
- Remove every per-file Testing Library cleanup (the 30 files that import `cleanup` from `@testing-library/react`: `afterEach(cleanup)`, `afterEach(() => cleanup())`, `cleanup()` inside an `afterEach` body), and the `cleanup` import when it becomes unused. Other work in those `afterEach` blocks (timers, mocks, DOM resets) stays; an `afterEach` that only did cleanup is removed.
- CLAUDE.md: "chips on dashboard cards and a Collection filter are SPEC 44" becomes SPEC 45; one line (Conventions, or next to Vitest in Stack) saying Testing Library cleanup is global in `tests/setup.ts` and test files don't call it.

**Out of scope:**

- Turning on Vitest `globals` or changing the default environment.
- Rewriting tests, fixing other warnings (`act(...)`), or changing app code.
- A regression test that checks the config.
- Silencing the error with `dangerouslyIgnoreUnhandledErrors` or an `onUnhandledError` filter.

## Data model

None. Test infrastructure only.

## Implementation plan

1. Baseline: `nvm use`, run `npm test` 10 times on the current code and record how many runs report an unhandled error.
2. Add `tests/setup.ts` with `afterEach(cleanup)` and register it in `vitest.config.ts` `setupFiles`. Run `npm test`: still green (a second cleanup is a no-op).
3. Remove the per-file cleanup calls and unused imports from the 30 files. Run `npm test`.
4. Update CLAUDE.md (SPEC 44 → 45 reference, cleanup note).
5. Verify: `npm test` 10 times in a row; `npx tsc --noEmit` and `npm run lint` clean.

## Acceptance criteria

- [x] `tests/setup.ts` exists and registers `afterEach(cleanup)`; `vitest.config.ts` lists it in `setupFiles`. (The file is `vitest.config.mts`.)
- [x] The only file importing `cleanup` from `@testing-library/react` is `tests/setup.ts`; no test file calls `cleanup()`. (`tests/hooks/importExport/useImportUndo.test.ts` uses "cleanup" as an undo phase name, which doesn't count.)
- [x] The baseline failure count from step 1 is recorded in the PR description. Baseline: 4 of 10 runs failed, all from `useCollectionSearch.test.ts`.
- [x] 10 consecutive `npm test` runs: each exits 0, shows no `Errors` line or "Unhandled Errors" block, and reports every test passing (2260 today, same count after).
- [x] Node-environment test files still pass with the setup file loaded.
- [ ] `npx tsc --noEmit` and `npm run lint` pass. Not met, for reasons that predate this spec: `tsc` reports 58 errors and `npm run lint` 15 problems (8 errors, 7 warnings), the same counts without this spec's changes. The files this spec touches lint clean.
- [x] CLAUDE.md names the chips/Collection filter work SPEC 45 and documents the global cleanup.

## Decisions

- **Global setup file**, not `globals: true` (that would also expose `describe`/`it`/`expect` as globals and need tsconfig types, a bigger change than the bug needs) and not per-file cleanup (new files would repeat the bug).
- **Remove the existing per-file cleanup**: one rule in one place; leaving duplicates would suggest it's still needed per file.
- **Number 44**, the chips/filter spec moves to 45: that spec isn't written yet.
- **Proof is 10 clean full runs against a 10-run baseline**: the error depends on timing, so one green run proves little.
- **No `typeof window` guard in the setup file**: importing Testing Library in node-environment files only adds load time; a guard adds a branch to keep in mind for no gain.
- **Don't silence unhandled errors** (`dangerouslyIgnoreUnhandledErrors`, `onUnhandledError`): they would hide real bugs, not fix this one.

## Risks

- **Hook order.** Vitest's default `sequence.hooks` is `"stack"`, so the setup file's cleanup runs after a file's own `afterEach` (e.g. `vi.useRealTimers()`). Files that called cleanup first in their `afterEach` now unmount after their own teardown; if a test breaks, fix it in that file.
- **Not the only cause.** If an unhandled error still shows up in the 10 runs, a commit landed just before teardown (see Mechanism), usually an un-awaited promise or timer at the end of a test. Find that file, await or flush the pending work there, and fix it within this spec before closing it.

## Implementation notes

- Four files called `cleanup()` in the middle of a test to unmount one render before the next (`CollectionForm`, `LinkListHeader`, `CollectionDetail`, `icons`). Those now call the `unmount` returned by `render`; `renderPage()` in `CollectionDetail.test.tsx` returns its render result for that.
