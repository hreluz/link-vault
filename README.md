# Link Vault

A personal "save for later" app for bookmarking links across content types — videos, articles, courses, repos, tweets, reels, and more.

## Features

- **Save links** — paste a URL; domain and site name are extracted automatically
- **Categorize** — user-defined categories with emoji icons and color labels; 9 defaults seeded on first login; domains can be mapped to categories for auto-assignment
- **Tag** — flexible tag system; comma-separated input and `#tag` syntax in search
- **Private tags** — password-protect any tag (SHA-256); session-scoped unlock via modal
- **Status tracking** — Unread → Watching → Read → Archived workflow
- **Favorites** — star any link; dedicated favorites view with full filtering and search
- **Filter & sort** — filter by category, tag, status; sort by newest / oldest / alphabetical / status
- **Search** — full-text search across title, domain, notes, and tags; `#tag` syntax supported
- **Trash** — soft-delete with 2-second undo toast; restore or permanently delete from the trash view
- **Swipe-to-delete** — left swipe gesture on mobile
- **Import / Export** — UI scaffold at `/dashboard/config/import-export`; export and import are not yet functional (no service layer implemented)
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

Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL and anon key.

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
    link/           # main links view + forms
    favorites/      # starred links
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
  context/          # React context (UnlockedTagsContext)
  types/            # TypeScript types (Database, Link, Tag, …)
  supabase/         # server + browser Supabase clients
supabase/
  migrations/       # SQL migrations
tests/              # Vitest unit tests
```
