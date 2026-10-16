# SPEC 06 — Auto-assign category by domain on import

> **Status:** Approved
> **Depends on:** SPEC 05
> **Date:** 2026-10-16
> **Objective:** When importing links (pasted URLs, pasted JSON, or a CSV/JSON upload), give every row that has no category of its own the category mapped to its domain in `category_domains`, falling back to the "Default category" selector only when no domain rule matches.

## Why this spec exists

The add-link form already picks a category from the URL's domain (`useAutoAssignCategory` → `getCategoryIdByDomain`). Import ignores those rules: every row without its own category gets the "Default category" selector value. Importing 50 YouTube URLs puts them all in "Not defined" even though `youtube.com` is mapped to "YouTube". Import should behave like adding a link.

## Scope

**In:**

- Domain auto-assign for these import paths: **Paste URLs**, **Paste JSON**, **CSV upload**, **plain JSON upload**.
- Category precedence per row:
  1. a category given by the row itself (a CSV `category` column value, or a JSON row's `category_id`) always wins;
  2. otherwise, the category of a domain rule matching the row's URL hostname;
  3. otherwise, the "Default category" selector.
- **One shared matcher.** The code that turns a URL into a category id from the domain rules exists once, and both the add-link form and import use it. `getCategoryIdByDomain` (used by the add form through `useAutoAssignCategory`) becomes a thin wrapper over the same `getCategoryIdByDomainMap` + `lookupCategoryIdByUrl` pair that import uses. Its own decrypt-and-compare loop goes away. Its signature and the add form's behavior do not change.
- Domain matching is the same as the add form: the hostname is normalized by the existing `normalizeDomain` (lowercase, `www.` stripped, legacy scheme prefixes on stored rules tolerated) and compared for exact equality. `m.youtube.com` does not match `youtube.com` unless that rule exists.
- `useLinkImport` finds its "Not defined" default with the existing `PROTECTED_CATEGORY_NAME` constant (the one `useAutoAssignCategory` uses) instead of the `'Not defined'` string literal. Behavior does not change.
- The user's domain rules are loaded and decrypted **once per import**, not once per row.
- Always on. No new switch, no new setting.
- Silent. The progress modal, its counters, `ImportRowOutcome` and `ImportResult` are unchanged.
- Degraded case: if loading the domain rules fails, the import continues and uses the default selector, exactly like today.
- Tests for the new service function and the hook.

**Out of scope (for future specs):**

- v2 "Quick"/"Everything" restores. They keep each link's recorded category exactly; an uncategorized v2 link still gets the default selector.
- A switch to turn domain auto-assign off for an import.
- An "Auto-categorized" counter or any reporting in the modal.
- Subdomain or wildcard matching (e.g. `*.youtube.com`).
- Re-categorizing links that already exist in the vault.
- Changing how the add-link form auto-assigns (when it looks up, how it treats a category the user picked, re-reading rules on each URL change). Only the code underneath `getCategoryIdByDomain` is shared.
- Sharing the precedence rule (own category > domain rule > fallback) between the form and import. Only the matcher is shared.

## Data model

No new persisted data. One new service function:

```ts
// lib/services/category-domains.ts
/** Every domain rule of the current user as normalized hostname -> category id.
 *  Decrypted once, for bulk lookups (import). Returns an empty map on error or when signed out. */
export async function getCategoryIdByDomainMap(dek: CryptoKey): Promise<Map<string, string>>

/** Category id for a URL (or bare hostname) from a map built by getCategoryIdByDomainMap,
 *  or null (invalid URL/hostname or no matching rule). The single matching path, shared by
 *  import and getCategoryIdByDomain. */
export function lookupCategoryIdByUrl(url: string, map: Map<string, string>): string | null

// Existing, signature unchanged, now a wrapper:
//   invalid hostname -> null without touching the DB (as today);
//   otherwise lookupCategoryIdByUrl(hostname, await getCategoryIdByDomainMap(dek)).
export async function getCategoryIdByDomain(hostname: string, dek: CryptoKey): Promise<string | null>
```

`importLinks`'s signature and `ImportLinkInput` do not change. A row "has its own category" when `category_id` is a non-null, non-empty string after CSV category resolution.

## Implementation plan

1. **Service.** In `lib/services/category-domains.ts`:
   - add `getCategoryIdByDomainMap`: one `select` on `category_domains` filtered by `user_id`, decrypt every row, key by `normalizeDomain(domain)` (rows whose stored domain doesn't normalize are skipped);
   - add `lookupCategoryIdByUrl`: `normalizeDomain(url)` → map lookup; `null` when it doesn't normalize (`normalizeDomain` already accepts both full URLs and bare hostnames);
   - rewrite `getCategoryIdByDomain` as the wrapper above: return `null` early if `normalizeDomain(hostname)` is `null` (no DB call), else `lookupCategoryIdByUrl(hostname, await getCategoryIdByDomainMap(dek))`. Delete its own loop. `useAutoAssignCategory` is not touched.
2. **Service tests** in `tests/services/category-domains.test.ts`:
   - the existing `getCategoryIdByDomain` tests pass unchanged (match, `www.` stripping, no match, legacy `https://` row, invalid/empty hostname with no DB call);
   - the map holds each normalized domain → category id, and a legacy `https://claude.ai` row is keyed as `claude.ai`;
   - a `www.` URL matches a bare-domain rule;
   - an unmatched host, an invalid URL, and an empty map all return `null`;
   - a DB error or no user returns an empty map.
   - `tests/hooks/links/form/useAutoAssignCategory.test.ts` passes unchanged.
3. **Hook.** In `lib/hooks/importExport/useLinkImport.ts`, in the non-v2 path, after `resolveCsvCategories` and before `importLinks`:
   - replace the `'Not defined'` literal in the default-category effect with `PROTECTED_CATEGORY_NAME` from `@/lib/services/categories`;
   - load the map with `getCategoryIdByDomainMap(dek)` (inside the "Preparing…" phase, after `openModal`); on throw, use an empty map;
   - for each input whose `category_id` is null/undefined/empty, set `category_id` to `lookupCategoryIdByUrl(input.url, map)` when it returns an id; leave the rest untouched so `importLinks` still falls back to `defaultCategoryId`;
   - the v2 path (`importVaultExport`) is not touched.
4. **Hook tests** in `tests/hooks/importExport/useLinkImport.test.ts`:
   - pasted URLs with a mapped domain reach the mocked `importLinks` with the rule's `category_id`; an unmapped URL keeps no `category_id`;
   - a CSV row with an explicit category keeps it even when its domain is mapped to another category;
   - a CSV row with a blank category gets the domain rule;
   - a JSON row with `category_id` keeps it;
   - the map is loaded once per import, regardless of row count;
   - a failing map load still calls `importLinks` with the original inputs;
   - a v2 import never calls `getCategoryIdByDomainMap`.
5. **Docs.** Update CLAUDE.md feature #12 (Import / Export) with one sentence: non-v2 imports auto-assign a category from the user's domain rules (like the add-link form) for rows with no category of their own, before falling back to the default-category selector. Also update the CSV format guide text in `ImportExportClient.tsx` (`category` column: "blank uses the domain rule, or the default category below").

## Acceptance criteria

- [ ] With `youtube.com` mapped to "YouTube" and the default selector on "Not defined", pasting `https://www.youtube.com/watch?v=x` and `https://example.com/a` imports the first into "YouTube" and the second into "Not defined".
- [ ] With the default selector on "Article", an unmapped URL lands in "Article" and a mapped URL lands in its rule's category.
- [ ] A CSV row with `category = Course` and a `github.com` URL (mapped to "GitHub") lands in "Course".
- [ ] A CSV row with a blank category and a `github.com` URL lands in "GitHub".
- [ ] A plain JSON upload behaves the same as pasted JSON.
- [ ] A v2 "Everything" restore puts every link in exactly the category recorded in the file; uncategorized v2 links get the default selector, not a domain rule.
- [ ] Importing 200 URLs issues a single `category_domains` select.
- [ ] If the `category_domains` read fails, the import still completes, using the default selector.
- [ ] The progress modal and its summary look and count exactly as before.
- [ ] `getCategoryIdByDomain` has no decrypt/compare loop of its own; it calls `getCategoryIdByDomainMap` and `lookupCategoryIdByUrl`, and those two are the only place domain rules are matched against a URL.
- [ ] In the add-link form, typing a `youtube.com` URL still picks "YouTube", an unmapped URL still resets to "Not defined", and a category picked by hand is still not overwritten.
- [ ] `useLinkImport` contains no `'Not defined'` string literal.
- [ ] `npm test` passes, including the new tests.

## Decisions

- **Yes:** Row category > domain rule > default selector. Mirrors the add form, where a rule never overrides a category the user chose, while the default selector is a fallback, not a choice per link.
- **No:** Domain rule only when the default is "Not defined". Picking a default would silently disable every domain rule, which is surprising.
- **No:** Domain rule overriding the file's category. The file's category is an explicit choice.
- **Yes:** v2 restores excluded. They are a faithful clone; changing categories during a restore would break that.
- **Yes:** Always on, no switch. The add form has no switch either; one can be added in its own spec if needed.
- **Yes:** Silent, no new counter. Keeps `ImportRowOutcome`, `ImportResult` and the modal unchanged.
- **Yes:** Resolve categories in `useLinkImport` before calling `importLinks`, not inside `importLinks`. `importLinks` stays unchanged, the v2 path is excluded by construction, and it follows the existing `resolveCsvCategories` pre-pass.
- **Yes:** Load and decrypt the rules once per import (`getCategoryIdByDomainMap`). `getCategoryIdByDomain` re-reads and decrypts every rule per call, which is O(rows × rules) for an import.
- **Yes:** Exact normalized-hostname match, same `normalizeDomain` as the add form, so both paths agree.
- **Yes:** One matcher for both paths. `getCategoryIdByDomain` becomes a wrapper over `getCategoryIdByDomainMap` + `lookupCategoryIdByUrl`, so the "URL → category" code exists once and the form and import cannot drift.
- **No:** Having the add form load the map once per modal open. It would be faster, but it changes the form's behavior (rules added while the modal is open would not be seen), and that is out of scope.
- **No:** Sharing the precedence rule as a pure function. In the form it depends on live UI state (a category the user picked, tracked with refs); in import it is a single `??`. Sharing it adds coupling for no real gain.
- **Yes:** `PROTECTED_CATEGORY_NAME` in `useLinkImport`. Both hooks find the default category by the same constant.

## Risks

| Risk | Mitigation |
| --- | --- |
| Import and add form drift apart in how they match domains | Both go through the same `getCategoryIdByDomainMap` + `lookupCategoryIdByUrl`; `getCategoryIdByDomain` is only a wrapper. |
| The refactor breaks the add form's auto-assign | The existing `getCategoryIdByDomain` and `useAutoAssignCategory` tests must pass unchanged; the invalid-hostname early return (no DB call) is kept. |
| A rule points at a category deleted in the meantime | `category_domains.category_id` is an FK, so rules for a deleted category no longer exist. |
| A legacy JSON file carries a `category_id` from another account | Unchanged from today (the explicit value wins and the insert may fail as "Couldn't save"); out of scope here. |
| Rules fail to load | Empty map → today's behavior (default selector). |

## What is **not** in this spec

- v2 restores.
- An on/off switch.
- Reporting auto-categorized links.
- Subdomain/wildcard matching.
- Re-categorizing existing links.

Each one of those, if it lands, goes in its own spec.

