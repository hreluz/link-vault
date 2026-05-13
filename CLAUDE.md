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
| `url` | string | the saved URL |
| `title` | string | user-editable or auto-fetched |
| `description` | string | short summary |
| `previewImage` | string | OG/thumbnail image URL |
| `domain` | string | auto-extracted from URL (e.g. `youtube.com`) |
| `tags` | string[] | user-defined labels |
| `notes` | string | free-form personal notes |
| `status` | `LinkStatus` | see below |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### LinkStatus

```ts
type LinkStatus = "unread" | "watching" | "read" | "favorite" | "archived"
```

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

## Conventions

- All pages and routes live under `app/`
- Shared UI components go in `components/`
- Domain logic (types, helpers, data access) goes in `lib/`
- Business logic (Supabase calls, no Next.js deps) goes in `lib/services/`
- Keep components small and focused; co-locate styles with Tailwind classes
- Prefer server components by default; use `"use client"` only when needed

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
