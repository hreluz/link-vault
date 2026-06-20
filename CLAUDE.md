@AGENTS.md

# Link Vault

A personal "save for later" app for bookmarking links across content types — videos, articles, courses, repos, tweets, reels, and more.

## Node version

Always run `nvm use v24.13.0` before executing any shell commands (dev server, tests, installs, etc.).

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
| `content_type` | `ContentType` | see below |
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

### Content types

> **Not yet implemented.** There is no `content_type` column in the `links` DB table (`lib/types/database.ts`). Visual differentiation by content type is a planned feature. The category system (user-defined with emoji) is the current mechanism for type organization. Do not reference or filter on `content_type` — the field does not exist on `LinkWithTags`.

Planned types to eventually recognize:
- YouTube / video
- Instagram / Reels / TikTok
- Articles / blog posts
- Courses / documentation
- Tweets / X posts
- GitHub repositories
- Generic / other

## Key features

1. **Save a link** — paste URL, auto-extract `site_name` from hostname; `fetchLinkMeta` server action (`app/dashboard/link/actions.ts`) fetches `og:title`, `og:description`, and `og:image` after a 600 ms debounce; title pre-fills only if the user hasn't typed one; description and image always populate; `image_url` stored in the `links` table and shown as a banner in `LinkCard`
2. **Categorize** — auto-assign category by domain mapping; user can override
3. **Tag** — add/remove tags using comma-separated input or `#tag` syntax; browse by tag
4. **Private tags** — single global password (SHA-256 + optional hint) protects all private tags; session-scoped unlock via `UnlockTagModal`; lock/unlock icon buttons in the tags header; links hidden until unlocked; every wrong attempt logs the user out; 5 failures trigger a scoped nuke (private-tag-linked links + private tags deleted) then allow a fresh password
5. **Status workflow** — Unread → Watching → Read → Archived; opening a link whose status is `unread` automatically advances it to `watching` via `handleLinkOpen` in `useLinkList`
6. **Favorites** — `is_favorite` toggle; dedicated `/dashboard/favorites` view with full filter/search parity
7. **Search** — full-text across title, domain, notes, tags; `#tag` syntax jumps to tag filter
8. **Filter & sort** — by category, tags (any/all), status; sort by newest/oldest/alphabetical/status
9. **Trash** — soft-delete via `deleted_at`; 2-second undo toast; restore or permanently delete
10. **Swipe-to-delete** — left swipe gesture on mobile via `SwipeableCard`
11. **Organize hub** — `/dashboard/organize` with categories, tags, and trash sections
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
| Server actions, middleware | Server client | `@/lib/supabase/server` |
| Client hooks, browser services | Browser client | `@/lib/supabase/client` |

Never import `@/lib/supabase/server` in a file that is (or can be) included in the client bundle — it uses `cookies()` from `next/headers` which is server-only and will break the build.

When a service function is called from both server and client contexts, accept the Supabase client as a parameter (`SupabaseClient<Database>`) rather than creating it internally. See `seedDefaultCategories` in `lib/services/categories.ts` as an example.

### Soft delete

Links are never hard-deleted from the UI — set `deleted_at` to delete, `null` to restore. All queries for active links must include `deleted_at IS NULL`. Use `lib/services/trash.ts` for permanent deletion and `emptyTrash`.

### Tag privacy

All private tags share a single global password stored in `private_tag_settings` (SHA-256 hash + optional hint + `failed_attempts` counter). Key service functions in `lib/services/tags.ts`: `setPrivateTagPassword`, `verifyPrivateTagPassword` (returns `VerifyPasswordResult`), `getPrivateTagSettings`. The `UnlockedTagsContext` (`lib/context/UnlockedTagsContext.tsx`) tracks which tags have been unlocked in the current session. Filter logic in `useLinks` excludes links whose tags are all private and none are unlocked.

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
