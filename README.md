# Link Vault

A personal "save for later" app for bookmarking links across content types — videos, articles, courses, repos, tweets, reels, and more.

## Features

- **Save links** — paste a URL; domain and site name are extracted automatically; `og:title`, `og:description`, and `og:image` are fetched server-side after a short debounce; an ON/OFF toggle lets you disable auto-fetch and clear prefilled data (its default is a per-user setting); YouTube video duration is fetched via YouTube Data API v3 (requires `YOUTUBE_API_KEY`) and shown as a badge on the thumbnail; duration is editable for any platform; a link saved without a title uses the URL's path (e.g. `reel/DPwciDeD86l`) or hostname; a saved link's URL is read-only in the edit form; card thumbnails that fail to load (e.g. expired Instagram images) are re-fetched once per session, rate-limited per site
- **Quick Capture** — a bookmarklet (`/dashboard/config/quick-capture`) that saves whatever page you're on from any site in one click, opening the Add Link form pre-filled with its URL and title; works even through a locked vault or a fully logged-out session — the capture is carried through both the unlock screen and the login redirect, then resumed automatically
- **Categorize** — user-defined categories with emoji icons and color labels; 9 defaults seeded on first login; domains can be mapped to categories for auto-assignment
- **Tag** — flexible tag system; comma-separated input and `#tag` syntax in search; autocomplete suggests existing tags as you type (substring match, keyboard-navigable with ↑/↓; Tab or Space adds the highlighted or first suggestion, Enter the highlighted one or the typed text; the input closes the mobile keyboard after each added tag); rename tags or merge one into another from Organize → Tags, with a link-count preview before confirming (merges are restricted to same-privacy pairs — public tags only merge into public, private only into private)
- **Private tags** — single global password (SHA-256 + optional hint) protects all private tags at once; session-scoped unlock via modal; lock/unlock icon buttons in the tags header; changing the password requires the current password; 5 failed attempts triggers a scoped nuke (only private-tag-linked links and private tags are deleted) and allows a fresh password after re-login
- **Status tracking** — Unread → Watching → Read → Archived workflow; opening an unread link marks it Watching, and the last opened card keeps a "Last opened" marker until you open another
- **Move to end** — a link you open moves to the end of the list after a delay (default 30 s, adjustable 5–600 s), so unread links stay on top; a Send-to-end button on each card does it right away, and an Undo button in the list header puts the last moved link back
- **Favorites** — star any link; an "All Links / ⭐ Favorites" pill toggle in the main dashboard view filters the same list down to starred links, with full search, filter, and sort support in either mode; favorited links can't be deleted until you unfavorite them
- **List header** — shows `N links (M unread)` for the current filters, plus a ↻ button that reloads links, tags, and categories without locking the vault or private tags
- **Filter & sort** — filter by category, tag, status; sort by newest / oldest / alphabetical / status
- **Search** — substring search across title, url, domain, notes, and tags; `#tag` syntax supported; since content is end-to-end encrypted, text search and alphabetical sort run client-side against decrypted results (see [ENCRYPTION.md](ENCRYPTION.md)), while category/tag/status/favorite filtering and default sort order still run server-side
- **Infinite scroll** — the link list loads in pages of 40 as you scroll; structural filtering and sorting run server-side so browsing stays fast no matter how large your library gets
- **Trash** — soft-delete with 2-second undo toast; restore or permanently delete from the trash view
- **Swipe-to-delete** — left swipe gesture on mobile
- **Import / Export** — fully functional at `/dashboard/config/import-export`; export just your links (JSON or CSV, with category and pipe-separated `tags`) or "Everything" (JSON) — a full clone including category styling, domain auto-assign rules, tag styling/privacy, and appearance settings, for moving to a new account; import from pasted URLs (one per line), pasted JSON, or file upload (.json / .csv), with upfront validation, per-phase progress, and an opt-in checkbox to also apply an "Everything" file's appearance settings; duplicate URLs are detected per-user and skipped automatically
  - URL/CSV/plain-JSON imports pick a category from your domain rules, can add the same tags to every imported link, and can optionally auto-fetch metadata — at most one request every 2 s per site, pausing to let you retry or skip a site that looks blocked, and skipping links that only lead to a generic app page
  - every import shows a progress window with live counters, an estimated time left, and a Cancel button; the summary lists failed and skipped URLs with copy buttons
  - **Undo this import** — from the summary, permanently delete every link that import saved, plus the tags and categories it created that nothing else uses
- **Link preferences** — `/dashboard/config/link-preferences`: the default for metadata auto-fetch, and the move-to-end delay
- **Appearance** — `/dashboard/config/appearance`: light/dark mode with no flash on load, an accent color for each mode (7 presets or any custom hex), and a surface tone for backgrounds and text (Slate, Gray, Zinc, Neutral, Stone)
- **Change password** — requires current password verification before updating
- **Account restart** — forgotten-password recovery at `/restart-account`; sets a new password and permanently wipes the account's existing links, tags, and categories to bootstrap a fresh vault (requires typing `DELETE` to confirm)
- **Admin settings** — admin-only page at `/dashboard/config/admin-settings` with two toggles (enable/disable new user registration, enable/disable the account-restart flow) and the import auto-fetch limits (same-site gap, retry wait, empty-fetch limit, slow-fetch hint)

## Encryption

Link Vault is end-to-end encrypted: links, tags, categories, and domain mappings are encrypted client-side with a key derived from your password before anything is sent to the server — not even the database or app operator can read them. See [ENCRYPTION.md](ENCRYPTION.md) for how the key hierarchy, vault unlock flow, and encrypted search work.

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
nvm use        # reads .nvmrc (v24.13.0)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — always use `localhost`, not `127.0.0.1`. Next.js 16 dev mode blocks cross-origin requests to dev-only resources (HMR, client bundles) from any other origin by default, which silently breaks client-side hydration: pages still render, but forms and interactive elements stop working (e.g. login submits but never redirects, since the redirect depends on client-side JS running after the server responds).

Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL and anon key. Set `ADMIN_EMAIL` to the account that should get the admin role, and `SUPABASE_SERVICE_ROLE_KEY` (server-only) so that account can be promoted when it confirms its email. Optionally add a `YOUTUBE_API_KEY` (YouTube Data API v3) to enable video duration fetching.

```bash
# run tests
nvm use
npm test
```

## Project structure

```
proxy.ts              # auth gate for the whole app (Next.js 16's renamed middleware.ts);
                       # also preserves a Quick Capture deep link through the /login redirect
app/
  (auth)/           # login, signup, restart-account (forgotten password)
  dashboard/
    link/           # main links view + forms (includes the All Links / Favorites toggle)
    organize/
      categories/   # manage categories + domain mappings
      tags/         # manage tags (with privacy toggle)
      trash/        # deleted links — restore or purge
    config/
      appearance/       # theme, accent colors, surface tone
      change-password/
      admin-settings/   # admin-only: registration, account-restart, import auto-fetch limits
      import-export/
      link-preferences/ # auto-fetch default, move-to-end delay
      quick-capture/    # bookmarklet install page
components/         # shared UI (ColorPicker, SearchBar, SwipeableCard, …)
lib/
  services/         # Supabase business logic (no Next.js deps)
  hooks/            # React hooks by domain
  context/          # React context (VaultContext, TagsContext, UnlockedTagsContext)
  crypto/           # client-side encryption (see ENCRYPTION.md)
  utils/            # pure helpers (URL titles, accent ramps, CSV, …)
  types/            # TypeScript types (Database, Link, Tag, …)
  supabase/         # server, browser and service-role (admin) Supabase clients
  bookmarklet.ts    # builds the Quick Capture bookmarklet + its post-login resume URL
supabase/
  migrations/       # SQL migrations
tests/              # Vitest unit tests
```
