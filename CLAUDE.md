@AGENTS.md

# Link Vault

A personal "save for later" app for bookmarking links across content types — videos, articles, courses, repos, tweets, reels, and more.

## Stack

- **Next.js 16** (App Router) — see AGENTS.md, this version has breaking changes
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**

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
| `image_url` | string \| null | OG/thumbnail image URL |
| `site_name` | string \| null | auto-extracted from URL (e.g. `youtube.com`) |
| `content_type` | `ContentType` | see below |
| `notes` | string \| null | free-form personal notes |
| `status` | `LinkStatus` | see below |
| `is_favorite` | boolean | |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |
| `tags` | string[] | computed via `link_tags` join — not a DB column |

### LinkStatus

```ts
type LinkStatus = "unread" | "watching" | "read" | "favorite" | "archived"
```

### Category

User-defined buckets for organizing links. 8 defaults are seeded automatically on first login via `seedDefaultCategories` (called from `signIn` in `lib/services/auth.ts`).

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

### Content types

The app should recognize and visually differentiate these source types:
- YouTube / video
- Instagram / Reels / TikTok
- Articles / blog posts
- Courses / documentation
- Tweets / X posts
- GitHub repositories
- Generic / other

## Key features

1. **Save a link** — paste URL, auto-fetch title + preview image + domain
2. **Browse & filter** — filter by status, tags, content type, or domain
3. **Search** — full-text search across title, description, notes, tags
4. **Status management** — move links between unread → watching → read → favorite / archived
5. **Tagging** — add/remove tags, browse by tag
6. **Notes** — add personal notes to any link
7. **Categories** — organize links into categories; 8 defaults seeded on first login

## Conventions

- All pages and routes live under `app/`
- Shared UI components go in `components/`
- Domain logic (types, helpers, data access) goes in `lib/`
- Business logic (Supabase calls, no Next.js deps) goes in `lib/services/`
- React hooks (client state / effects) go in `lib/hooks/<domain>/`
- Keep components small and focused; co-locate styles with Tailwind classes
- Prefer server components by default; use `"use client"` only when needed

### Supabase client rules

| Context | Client to use | Import |
|---|---|---|
| Server actions, middleware | Server client | `@/lib/supabase/server` |
| Client hooks, browser services | Browser client | `@/lib/supabase/client` |

Never import `@/lib/supabase/server` in a file that is (or can be) included in the client bundle — it uses `cookies()` from `next/headers` which is server-only and will break the build.

When a service function is called from both server and client contexts, accept the Supabase client as a parameter (`SupabaseClient<Database>`) rather than creating it internally. See `seedDefaultCategories` in `lib/services/categories.ts` as an example.

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
