# Encryption

Link Vault uses zero-knowledge, end-to-end encryption: not the database, a stolen backup, or the app operator can read your links, tags, categories, or notes — only you, with your password, can. This document explains how that works.

## 1. What "zero-knowledge" means here

Every field that could reveal what you've saved or browsed — URLs, titles, descriptions, notes, tag names, category names, and even the domains used for auto-categorization — is encrypted client-side, in your browser, before it's ever sent to the server. The database only ever stores ciphertext for these fields. There is no master key on the server that could decrypt them; the only key that can is derived from your password, and it never leaves your browser.

This protects against:
- A stolen database dump or backup
- A compromised Postgres connection
- A compromised app server
- The app operator reading your data directly

It does **not** protect against someone who has your password, or malware running inside your own browser session.

## 2. Key hierarchy: DEK and KEK

Two keys are involved, for different jobs:

- **DEK (Data Encryption Key)** — a random AES-256-GCM key generated once per user. This is the *real* vault key: every encrypt/decrypt operation on your content uses it directly.
- **KEK (Key Encryption Key)** — derived from your password via PBKDF2-SHA256 (600,000 iterations) plus a random per-user salt. The KEK's only job is to wrap (encrypt) and unwrap (decrypt) the DEK.

The DEK is generated once and never changes. It's stored, wrapped under your current KEK, in the `user_encryption_keys` table (`salt`, `wrapped_dek`, `wrapped_dek_iv`). Splitting the keys this way means changing your password is cheap: derive a new KEK from the new password, re-wrap the same DEK under it, and update that one row — no need to re-encrypt every link you've ever saved.

## 3. Vault unlock flow

- **First login ever** (after email confirmation): the browser generates a new DEK, generates a random salt, derives a KEK from your just-entered password, wraps the DEK, and stores the wrapped key row. Your default categories and domain mappings are seeded at this point too (now encrypted, since they need the DEK to exist first).
- **Every login after that**: the browser fetches your salt + wrapped DEK, derives the KEK from your password, and unwraps the DEK. If you typed the wrong password, the unwrap fails outright (AES-GCM is authenticated — a wrong key never produces garbled output, it just errors).
- The unwrapped DEK lives **only in memory**, in `VaultContext`, for the lifetime of that browser tab. It is never written to `localStorage`, `sessionStorage`, or anywhere else.
- A hard refresh, a new tab, or closing the browser all clear it. When that happens, `VaultUnlockGate` shows a password-only prompt (mirroring the existing private-tag unlock modal) until you unlock again — no need to re-enter your email, just the password.
- Logging out explicitly locks the vault (clears the in-memory DEK) before signing out of Supabase Auth.

## 4. What's encrypted vs. plaintext

| Table | Encrypted (packed into one `enc_payload`/`enc_iv` blob per row) | Stays plaintext |
|---|---|---|
| `links` | `url, title, description, site_name, image_url, duration, notes` | `id, user_id, category_id, status, is_favorite, created_at, updated_at, deleted_at`, plus `url_fingerprint` (a blind index, see below) |
| `tags` | `name, color` | `id, user_id, is_private, created_at` |
| `categories` | `name, description, color, emoticon` | `id, user_id, created_at, updated_at` |
| `category_domains` | `domain` | `id, category_id, user_id, created_at` |

Structural columns (ids, foreign keys, timestamps, status/favorite flags) stay plaintext because the database still needs them to do ordinary filtering, sorting, and joins — none of them reveal what a link is *about*.

`links.url_fingerprint` is an HMAC-SHA256 of the normalized URL, keyed by the DEK. It's a **blind index**: a deterministic, opaque token that lets the database check "does a link with this exact URL already exist for this user" (used by duplicate detection on import) without ever learning the URL itself.

Tag, category, and category-domain name/uniqueness checks (e.g. "does a tag with this name already exist?") don't use blind indexes — those tables are always small and already fetched-and-cached in full client-side (`TagsContext`, `useCategoryList`), so uniqueness is checked by decrypting the cached list and comparing in JS, which is simpler than adding fingerprint columns for tables this size.

## 5. How search actually works

The database is **never** asked to search encrypted content — that's structurally impossible once it's ciphertext. Search is a two-stage process:

1. **Structural narrowing (in Postgres, on plaintext columns).** A query like this never references an encrypted column at all:
   ```sql
   select id, enc_payload, enc_iv
   from links
   where user_id = auth.uid() and deleted_at is null
     and category_id = '...'   -- only if that filter is active
     and status = any('{...}') -- only if that filter is active
   ```
   This narrows down candidates using only category/status/favorite/tag-id filters — all still plaintext — so it's a normal, fast, indexed query no matter how large your library is.

2. **Text matching (in the browser, on decrypted content).** The candidate rows' ciphertext is fetched and decrypted client-side, and only then is your search text checked against the decrypted `title`/`url`/`site_name`/`notes`/tag names — a simple case-insensitive substring check (`.toLowerCase().includes(...)`), functionally identical to the `ilike '%q%'` this app used before encryption.

**Worked example:** a link with `url = "https://youtube.com/abc"`, `title = "My Cool Video"`. You search `"ab"`, with no other filters active, out of 5,000 total links:
- Step 1 returns up to 2,000 candidate ids (the existing `SELECT_ALL_MATCHING_CAP`, reused from the "select all matching" bulk-action feature) — cheap, regardless of table size.
- Step 2 decrypts those 2,000 rows (sub-second, WebCrypto is hardware-accelerated) and checks `"ab"` against each one's title/url/site_name/notes/tags. `"my cool video"` doesn't contain `"ab"`, but `/abc` does — so `url` is included in the searched fields precisely so this case is caught.

**Crucially, a search is never limited to only the ~40 links currently on screen.** Typing a search term always triggers step 1 fresh (up to the cap), decrypts the full candidate set, and only then applies the 40-at-a-time display chunking to whichever rows actually matched.

**Cost stays flat as your library grows**, because the cap is fixed: ~2,000 rows × ~500-700 bytes each ≈ 1-1.4MB uncompressed (less after gzip), decrypted in a few hundred milliseconds — the same whether you have 2,000 or 100,000 links. What changes at very large scale is *coverage*, not speed: if more than 2,000 links match your structural filters, only the 2,000 most recent (the RPC is ordered by `created_at desc`) are actually searched.

The expensive part (fetch + decrypt) is memoized per **structural** filter set, not per keystroke — typing `"y"`, `"yo"`, `"you"` triggers one bulk fetch, and each subsequent keystroke just re-filters the same already-decrypted array in memory.

## 6. Partial-word matching semantics

Search is a literal, case-insensitive substring match on the whole trimmed query string — not split into separate words. So `"yout"` matches a title containing `"youtube"` (substring, doesn't need to start the word), but a two-word query like `"cool video"` only matches if that exact phrase (with that exact spacing) appears together. This is intentional parity with the pre-encryption behavior (`title ilike '%q%'`), just relocated to run in the browser instead of Postgres.

`#tag` tokens in the search box are still parsed client-side and resolved to tag ids via the already-decrypted tag cache, folding into the same structural tag-id filter used by the Filter sheet — no server-side hashtag matching needed anymore.

## 7. Known limitations

- **No password recovery.** Forgetting your password permanently loses access to your vault data — there is no recovery code, no "forgot password" reset path that preserves your data. This is what zero-knowledge actually means: nobody, including the app, can recover it for you.
- **Search/alphabetical-sort completeness is capped at 2,000 structurally-matching links.** If you exceed that within your current filter, only the most recent 2,000 are considered.
- **Private tags remain a second, separate lock**, not a replacement for vault encryption — the single global private-tag password still exists to hide specific tagged links even while the vault itself is already unlocked (e.g. leaving the app open on a shared device). Its existing nuke-after-5-failed-attempts behavior is unchanged.
