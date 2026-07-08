@AGENTS.md

# Link Vault

A personal "save for later" app for bookmarking links across content types — videos, articles, courses, repos, tweets, reels, and more.

## Node version

Always run `nvm use v24.13.0` before executing any shell commands (dev server, tests, installs, etc.).

## Manual browser verification (Playwright)

When a change needs visual/end-to-end confirmation (not just unit tests), drive a real browser against a local dev server instead of guessing from code.

### Setup
- Playwright is a project devDependency; Chromium is cached at `~/Library/Caches/ms-playwright` (not in the repo).
- Default verification port: **3500** (kept separate from port 3000, which may already be running the user's own manual dev session). Still confirm it's free before launching (step 1) rather than assuming.

### Before launching
1. `lsof -i :<port>` — confirm the port is actually free first.
2. Confirm local Supabase is up: `curl -sf http://127.0.0.1:54321/rest/v1/`.
3. Email confirmation is required to sign in (`enable_confirmations = true`). `supabase db reset` wipes `auth.users`, so after any reset the `test@linkvault.dev` account needs re-creating via the signup flow and re-confirming — either open the confirmation link from Inbucket (`http://localhost:54324`, enabled by default locally) or, faster for repeated resets, confirm it directly in Supabase Studio (`http://127.0.0.1:54323` → Authentication → Users → edit the user → set "Email Confirmed").

### Launch
4. `npm run dev -- -p <port>` in the background, redirected to a log file; capture the wrapper PID, but after the server reports ready, re-resolve the *actual* bound PID via `lsof -i :<port>` (the npm/`next dev` PID is a parent — `pkill -f "next dev"` will NOT match the running `next-server` process, so killing by name later fails silently).
5. Poll with `curl` in a loop (no `timeout` command on macOS) until it responds — don't fixed-`sleep` and hope.
6. Check the dev server's log for `Another next dev server is already running` — if present, kill that stale PID first and relaunch before proceeding.

### Drive it
7. Never write a driver script into the repo. Pipe it to `node --input-type=module <<'EOF' ... EOF` run from the project root, so Node's ESM resolver finds `node_modules/playwright` without leaving a file behind.
8. Standard flow: `goto` → `waitForSelector` → fill login (`test@linkvault.dev` / `password123`) → submit → `waitForURL('**/dashboard**')` → screenshot → interact (scroll/click/etc.) → screenshot again.
9. Always capture: console errors (`page.on('console'/'pageerror')`) and any relevant network calls (e.g. `search_links`/`search_link_ids` RPCs) to confirm behavior, not just appearance.

### Known gotchas (hit these once already — avoid repeating)
- **Always use `http://localhost:<port>`, never `http://127.0.0.1:<port>`.** Next 16 dev mode blocks cross-origin requests to dev-only resources (HMR socket, client bundles) from any origin other than `localhost` by default. Hitting the app via `127.0.0.1` breaks client-side hydration *silently* — the page still renders, but no React event handlers/effects run, so forms fall back to native (non-JS) submission. This is especially dangerous for any flow whose redirect/next-step depends on a client-side `useEffect` firing after a server action resolves (e.g. login, which bootstraps the vault key client-side before navigating) — it'll look like the action "did nothing" and the page will just sit there with reset fields. If a login/form-submit flow ever seems to silently no-op in a Playwright run, check the dev server log for a `⚠ Blocked cross-origin request` warning before assuming it's an app bug.
- **The Add Link modal hides most fields behind "More options".** Only the URL field is visible by default; click the "More options" toggle to reveal Title/Category/Tags/Duration/Notes before trying to fill them.
- **The search box is `input[type="search"]`, not `type="text"`.**
- **Use real in-app link/button clicks — not `page.goto()` — when navigating between already-authenticated dashboard pages if the thing you're testing depends on client-only in-memory state** (e.g. the unlocked vault key held in `VaultContext`). `page.goto()` always performs a full browser navigation/reload, which remounts the entire React tree from scratch and wipes any in-memory-only state, same as a real hard refresh. That's often *correct* app behavior to trigger deliberately (e.g. confirming the vault re-locks on refresh) but will masquerade as a broken flow if you didn't mean to trigger it — e.g. navigating to the change-password page via `goto` will show the vault-locked screen instead of the form, not because change-password is broken but because `goto` itself re-locked the vault.
- **Some nav links exist twice in the DOM** (a desktop top nav + a mobile bottom nav, both matching the same link text/href) **and only one is visible at the current viewport.** A plain `page.click('text=Config')` can resolve to the hidden one and hang waiting for visibility. When clicking a nav item by text, iterate all matches and click whichever one `isVisible()` returns true for, rather than assuming `.first()`.

### Screenshots
10. Save to `.verification-screenshots/<branch-name>_<date>/` (dot-prefixed and gitignored, matching this repo's convention for tool-generated dirs like `.next/`). Each image filename carries its own capture time, e.g. `01_initial_load_11-33-07.png`. Write a `README.md` in that folder describing what each image shows and confirms.

### Cleanup
11. Kill the dev server by the exact PID(s) captured in step 4, confirm the port is free again (`lsof -i :<port>`), and report back before considering the task done.

## Stack

- **Next.js 16** (App Router) — see AGENTS.md, this version has breaking changes
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + SSR)
- **Sonner** — toast notifications
- **Emoji Mart** — emoji picker for categories / tags
- **Vitest + Testing Library** — unit tests

## Core domain

### Link

The central entity. Every saved link has:

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique identifier |
| `user_id` | string | owner |
| `url` | string | the saved URL |
| `title` | string \| null | user-editable or auto-fetched |
| `description` | string \| null | short summary |
| `site_name` | string \| null | auto-extracted from URL (e.g. `youtube.com`) |
| `image_url` | string \| null | og:image URL; stored as-is (not uploaded); shown as full-bleed thumbnail on `LinkCard` |
| `duration` | string \| null | video duration (e.g. `4:33`); auto-fetched for YouTube via Data API v3; editable for any platform |
| `notes` | string \| null | free-form personal notes |
| `category_id` | string \| null | FK → categories |
| `status` | `LinkStatus` | see below |
| `is_favorite` | boolean | |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |
| `deleted_at` | string \| null | set on soft-delete; `null` means not deleted |
| `tags` | string[] | computed via `link_tags` join — not a DB column |

### LinkStatus

```ts
type LinkStatus = "unread" | "watching" | "read" | "archived"
```

Favorites use `is_favorite: boolean`, not a status value.

### Tag

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique identifier |
| `user_id` | string | owner |
| `name` | string | unique per user; stored as kebab-case |
| `color` | string \| null | hex color for UI (e.g. `#6366f1`) |
| `is_private` | boolean | if true, links are hidden until all private tags are unlocked |
| `created_at` | string | ISO timestamp |

Private tags use a **single global password** (not per-tag). The password, its SHA-256 hash, a hint, and a failed-attempt counter live in the `private_tag_settings` table (one row per user). Unlocking with the correct password reveals all private tags at once via `UnlockTagModal`. Unlocked state lives in `UnlockedTagsContext` and is cleared on page refresh. The context exposes `unlockTag(name)`, `lockTag(name)`, and `lockAll()` — call `lockAll()` on logout or session clear.

**Security:** every wrong password attempt immediately logs the user out and increments `failed_attempts` in the DB. On the 5th failed attempt a nuke fires: all links that have at least one private tag are permanently deleted, all private tags are permanently deleted, and the `private_tag_settings` row is deleted (allowing a fresh password to be set after logging back in).

### Category

User-defined buckets for organizing links. **9 defaults** are seeded automatically on first login via `seedDefaultCategories` (called from `signIn` in `lib/services/auth.ts`). The same call also seeds `category_domains` rows mapping well-known hostnames (youtube.com, youtu.be, instagram.com, tiktok.com, vm.tiktok.com, twitter.com, x.com, t.co, github.com) to their respective categories.

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique identifier |
| `user_id` | string | owner |
| `name` | string | e.g. `YouTube`, `Article` |
| `description` | string \| null | short label |
| `color` | string \| null | hex color (e.g. `#FF0000`) |
| `emoticon` | string \| null | emoji icon (e.g. `📺`) |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

Default categories seeded: Not defined (🔖), YouTube (📺), Instagram (📸), TikTok (🎵), Article (📄), Course (🎓), Tweet (🐦), GitHub (💻), Other (🔗).

### CategoryDomain

Maps URL domains to categories for auto-assignment when creating a link.

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique identifier |
| `category_id` | string | FK → categories |
| `user_id` | string | owner |
| `domain` | string | normalized hostname (e.g. `youtube.com`) |
| `created_at` | string | ISO timestamp |

Unique constraint: `(user_id, domain)`.

## Key features

1. **Save a link** — paste URL, auto-extract `site_name` from hostname; `fetchLinkMeta` server action (`app/dashboard/link/actions.ts`) fetches `og:title`, `og:description`, and `og:image` after a 600 ms debounce; title pre-fills only if the user hasn't typed one; description and image always populate; `image_url` stored in the `links` table and shown as a full-bleed thumbnail at the top of `LinkCard`; an ON/OFF toggle in `UrlField` disables auto-fetch and clears prefilled data; YouTube video duration is fetched via YouTube Data API v3 (`YOUTUBE_API_KEY` env var, optional, free tier 10k units/day) and stored in `duration`; duration is editable in the form for any platform and shown as a badge over the thumbnail (or inline next to `site_name` when no thumbnail)
2. **Categorize** — auto-assign category by domain mapping; user can override
3. **Tag** — add/remove tags using comma-separated input or `#tag` syntax; browse by tag; autocomplete suggests existing tags as you type (substring match, up to 8 results); keyboard-navigable with ↑/↓, Tab/Enter to select, Escape to dismiss; available in the link form (`TagsField`), `BulkTagModal`, and `SearchBar`; all three are powered by the same `useAvailableTags()` hook (privacy-filtered names from `TagsContext`) + `useTagInput(tags, onChange, availableTags)` / `useSearchTagSuggestions`
4. **Private tags** — single global password (SHA-256 + optional hint) protects all private tags; session-scoped unlock via `UnlockTagModal`; lock/unlock icon buttons in the tags header; links hidden until unlocked; every wrong attempt logs the user out; 5 failures trigger a scoped nuke (private-tag-linked links + private tags deleted) then allow a fresh password
5. **Status workflow** — Unread → Watching → Read → Archived; opening a link whose status is `unread` automatically advances it to `watching` via `handleLinkOpen` in `useLinkList`
6. **Favorites** — `is_favorite` toggle on `LinkCard`; the main `/dashboard` view has an "All Links / ⭐ Favorites" pill switch (`FavoritesToggle`) that sets `favoritesOnly` in `useLinkFilters`, filtering the shared link list down to starred links — search, category/tag/status filters, sort, "+ Add link", and bulk-select/actions all continue to work identically in either mode; there is no separate favorites route
7. **Search** — full-text across title, domain, notes, tags; `#tag` syntax jumps to tag filter; runs server-side (debounced ~350ms) via the `search_links` Postgres RPC, not in-memory — see [Link list pagination](#link-list-pagination-infinite-scroll)
8. **Filter & sort** — by category, tags (any/all), status; sort by newest/oldest/alphabetical/status; all server-side via the same RPC, resetting to page 1 on any change
9. **Trash** — soft-delete via `deleted_at`; 2-second undo toast; restore or permanently delete
10. **Swipe-to-delete** — left swipe gesture on mobile via `SwipeableCard`
11. **Bulk actions** — select multiple links via long-press or a "Select" header button, then archive, delete (with modal confirmation), re-categorize, or add tags to all of them at once; selection state lives in `useLinksSelection` hook; bulk DB operations use Supabase `.in()` for single-round-trip efficiency; all mutations are optimistic with rollback on failure; `BulkActionToolbar` renders a sticky bar above the grid when selection mode is active; `BulkDeleteModal`, `BulkCategoryModal`, and `BulkTagModal` handle the per-action flows
12. **Organize hub** — `/dashboard/organize` with categories, tags, and trash sections
12. **Import / Export** — fully functional at `/dashboard/config/import-export`; export all links as JSON (strips `user_id`/`deleted_at`) or CSV (includes category name, tags as `|`-separated); import via paste (URLs or JSON array) or file upload (`.json`/`.csv`); CSV import resolves category names with `getOrCreateCategoryByName`; duplicate URLs are detected per-user and skipped; a default-category selector applies to links with no explicit category; service functions: `importLinks`, `getLinks` in `lib/services/links.ts`; `getCategories`, `getOrCreateCategoryByName` in `lib/services/categories.ts`
13. **Change password** — re-verifies current password before updating
14. **Dark mode** — theme toggle via `ThemeProvider`; inline script prevents flash on load

## Conventions

- All pages and routes live under `app/`
- Shared UI components go in `components/`
- Domain logic (types, helpers, data access) goes in `lib/`
- Business logic (Supabase calls, no Next.js deps) goes in `lib/services/`
- React hooks (client state / effects) go in `lib/hooks/<domain>/`; `useCategoryList` is a read-only hook for form dropdowns — distinct from `useCategories` which owns full CRUD state
- React contexts go in `lib/context/`
- Keep components small and focused; co-locate styles with Tailwind classes
- Prefer server components by default; use `"use client"` only when needed

### Supabase client rules

| Context | Client to use | Import |
|---|---|---|
| Server actions, Server Components | Server client | `@/lib/supabase/server` |
| Client hooks, browser services | Browser client | `@/lib/supabase/client` |
| `proxy.ts` (this Next.js version renamed `middleware.ts` to `proxy.ts`) | Inline `createServerClient`, own `NextRequest`/`NextResponse` cookie adapter | see `proxy.ts` |

Never import `@/lib/supabase/server` in a file that is (or can be) included in the client bundle — it uses `cookies()` from `next/headers` which is server-only and will break the build.

When a service function is called from both server and client contexts, accept the Supabase client as a parameter (`SupabaseClient<Database>`) rather than creating it internally. See `seedDefaultCategories` in `lib/services/categories.ts` as an example.

### Local dev: table grants after `supabase db reset`

Tables created via migrations (run as the `postgres` role) do **not** automatically inherit the `authenticated`/`anon` grants that Supabase Cloud's project provisioning sets up — only `supabase_admin`-owned objects get those by default. Migration `0009_table_grants.sql` grants the necessary `select`/`insert`/`update`/`delete` to `authenticated` per table. If you add a new table, add its grants there too, or a fresh local `supabase db reset` will fail with `permission denied for table X` even though RLS policies look correct.

### Soft delete

Links are never hard-deleted from the UI — set `deleted_at` to delete, `null` to restore. All queries for active links must include `deleted_at IS NULL`. Use `lib/services/trash.ts` for permanent deletion and `emptyTrash`.

### Link list pagination (infinite scroll)

The dashboard link list is server-side paginated, not a single full fetch:

- Page size 40. Filtering, search (`#tag` + text), tag ANY/ALL matching, sort, and private-tag exclusion all happen in Postgres via RPC functions (`search_links`, `search_link_ids`, sharing a `filtered_links` base — see `supabase/migrations/0008_link_search_functions.sql`), not in-memory in React.
- `useLinkFilters` (`lib/hooks/links/useLinkFilters.ts`) only holds filter UI state and derives a debounced `filterParams` object — it no longer filters/sorts a links array or derives `allTags` (the tag list for `FilterSheet` now comes from `useAvailableTags()`).
- `useLinks` composes the generic `usePaginatedQuery` hook (`lib/hooks/usePaginatedQuery.ts`) — domain-agnostic, intended for reuse by future paginated lists (e.g. Trash), plus `useDebouncedValue` and `useInfiniteScrollSentinel` (also in `lib/hooks/`, not `lib/hooks/links/`).
- `getLinks()` (unpaginated, fetches everything) still exists but is used **only** by Import/Export (`ImportExportClient`) — never use it for the main list.
- Bulk "Select all" selects all links matching the current filter (not just loaded ones), capped at 2000 ids (`getMatchingLinkIds`, `SELECT_ALL_MATCHING_CAP` in `lib/services/links.ts`).
- Adding a new filter dimension requires updating both the client `LinkFilterParams` type and the `filtered_links` SQL function together.

### Tag privacy

All private tags share a single global password stored in `private_tag_settings` (SHA-256 hash + optional hint + `failed_attempts` counter). Key service functions in `lib/services/tags.ts`: `setPrivateTagPassword`, `verifyPrivateTagPassword` (returns `VerifyPasswordResult`), `getPrivateTagSettings`. The `UnlockedTagsContext` (`lib/context/UnlockedTagsContext.tsx`) tracks which tags have been unlocked in the current session — it holds no tag data itself, just the `unlockedTagNames: Set<string>` and `unlockTag`/`lockTag`/`lockAll` mutators.

The single privacy rule — `isTagVisible(isPrivate, name, unlockedTagNames)` in `lib/services/tags.ts` — is shared by every consumer that needs to hide locked private tags: `useLinks` uses it to drop any link whose tags include a locked private tag (`link.tags.every(...)`, so even one locked tag hides the whole link from search and listing), and `useAvailableTags()` uses it to filter the tag name list used by autocomplete (`SearchBar`, `TagsField`, `BulkTagModal`).

### Tags data (`TagsContext`)

`TagsContext` (`lib/context/TagsContext.tsx`) is a singleton fetched once per session via `getTags()` and shared through `TagsProvider` (mounted in `app/dashboard/layout.tsx`). `useAvailableTags()` is the canonical, privacy-aware hook built on top of it. Because the cache is fetched once, anything that can create/rename/delete a tag must call `refetchTags()` afterward to keep it fresh: `useLinks` (link create/edit/bulk-tag can silently create new tags via `syncTags`), `useTagList` (Organize → Tags admin CRUD), and `ImportExportClient` (CSV/JSON import).

## Design system

Mobile-first. All UI must follow these Tailwind conventions — no exceptions.

### Color palette
- **Primary:** `indigo-600` (hover: `indigo-500`)
- **Background:** `slate-50` (page), `white` (cards/inputs)
- **Text:** `slate-900` (headings), `slate-700` (labels), `slate-500` (secondary/muted)
- **Border:** `slate-200`
- **Error:** `red-600` text on `red-50` background
- **Placeholder:** `slate-400`

### Radius & shape
- Cards and containers: `rounded-2xl`
- Inputs and buttons: `rounded-xl`

### Inputs
```
w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900
placeholder-slate-400 outline-none transition
focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
```

### Primary button
```
w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm
transition hover:bg-indigo-500
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
disabled:cursor-not-allowed disabled:opacity-60
```

### Secondary / ghost button
```
rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600
shadow-sm transition hover:bg-slate-50 hover:text-slate-900
disabled:cursor-not-allowed disabled:opacity-60
```

### Error message
```
rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600
```

### Labels
```
block text-sm font-medium text-slate-700
```

### Links
```
font-medium text-indigo-600 hover:text-indigo-500
```

### Card shell
```
rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200
```

### Page wrapper (centered auth / empty-state layouts)
```
flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12
```
