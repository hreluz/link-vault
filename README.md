# Link Vault

A personal "save for later" app for bookmarking links across content types — videos, articles, courses, repos, tweets, reels, and more.

## Features

- **Save links** — paste a URL; domain and site name are extracted automatically; `og:title`, `og:description`, and `og:image` are fetched server-side after a short debounce; an ON/OFF toggle lets you disable auto-fetch and clear prefilled data; YouTube video duration is fetched via YouTube Data API v3 (requires `YOUTUBE_API_KEY`) and shown as a badge on the thumbnail; duration is editable for any platform
- **Categorize** — user-defined categories with emoji icons and color labels; 9 defaults seeded on first login; domains can be mapped to categories for auto-assignment
- **Tag** — flexible tag system; comma-separated input and `#tag` syntax in search; autocomplete suggests existing tags as you type (substring match, keyboard-navigable with ↑/↓, Tab/Enter to select)
- **Private tags** — single global password (SHA-256 + optional hint) protects all private tags at once; session-scoped unlock via modal; lock/unlock icon buttons in the tags header; changing the password requires the current password; 5 failed attempts triggers a scoped nuke (only private-tag-linked links and private tags are deleted) and allows a fresh password after re-login
- **Status tracking** — Unread → Watching → Read → Archived workflow
- **Favorites** — star any link; an "All Links / ⭐ Favorites" pill toggle in the main dashboard view filters the same list down to starred links, with full search, filter, sort, and bulk-action support in either mode
- **Filter & sort** — filter by category, tag, status; sort by newest / oldest / alphabetical / status
- **Search** — full-text search across title, domain, notes, and tags; `#tag` syntax supported
- **Infinite scroll** — the link list loads in pages of 40 as you scroll; search, filtering, and sorting all run server-side, so results stay correct and fast no matter how large your library gets
- **Trash** — soft-delete with 2-second undo toast; restore or permanently delete from the trash view
- **Swipe-to-delete** — left swipe gesture on mobile
- **Bulk actions** — long-press a card (or tap "Select" in the header) to enter selection mode; select multiple links then archive, delete, re-categorize, or add tags in one shot; "Select all" selects every link matching your current filter (not just what's loaded), up to 2,000 at a time; delete requires modal confirmation; all mutations are optimistic with rollback on failure
- **Import / Export** — fully functional at `/dashboard/config/import-export`; export all links as JSON or CSV; import from pasted URLs (one per line), pasted JSON, or file upload (.json / .csv); CSV supports a `category` column and pipe-separated `tags`; duplicate URLs are detected per-user and skipped automatically
- **Change password** — requires current password verification before updating
- **Dark mode** — theme toggle with no flash on load

## Tech stack

- **Next.js 16** (App Router) — see AGENTS.md for breaking-change notes
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + SSR)
- **Sonner** — toast notifications
- **Emoji Mart** — emoji picker for categories and tags
- **Vitest + Testing Library** — unit tests

## Getting started

```bash
nvm use v24.13.0
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL and anon key. Optionally add a `YOUTUBE_API_KEY` (YouTube Data API v3) to enable video duration fetching.

```bash
# run tests
nvm use v24.13.0
npm test
```

## Project structure

```
app/
  (auth)/           # login, signup
  dashboard/
    link/           # main links view + forms (includes the All Links / Favorites toggle)
    organize/
      categories/   # manage categories + domain mappings
      tags/         # manage tags (with privacy toggle)
      trash/        # deleted links — restore or purge
    config/
      change-password/
      import-export/
components/         # shared UI (ColorPicker, SearchBar, SwipeableCard, …)
lib/
  services/         # Supabase business logic (no Next.js deps)
  hooks/            # React hooks by domain
  context/          # React context (TagsContext, UnlockedTagsContext)
  types/            # TypeScript types (Database, Link, Tag, …)
  supabase/         # server + browser Supabase clients
supabase/
  migrations/       # SQL migrations
tests/              # Vitest unit tests
```
