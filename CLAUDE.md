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
- Keep components small and focused; co-locate styles with Tailwind classes
- Prefer server components by default; use `"use client"` only when needed
