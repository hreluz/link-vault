# SPEC 02 — CSV import format template and guide

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-10-15
> **Objective:** Show users the CSV format the importer expects, through a downloadable template and a column guide on the Upload file tab, and make the parser accept what it documents (multi-line fields, CRLF, forgiving headers).

## Why this spec exists

Today the only hint is "or click to browse — .json or .csv". `parseCSV` (`lib/utils/linksCsv.ts`) expects the following:
- a header row with a `url` column; the other 12 columns are optional;
- `tags` separated by `|`;
- `category` as a name, created if missing;
- `status` set to one of `unread|watching|read|archived`;
- `is_favorite` as the literal `true`.

None of this appears in the UI. The parser also splits on `\n` before handling quotes, so the export's own quoted multi-line `notes` break on re-import. CRLF files (Excel) leave a stray `\r` in the last column. Headers must match exactly in lowercase.

## Scope

**In:**

- `buildCsvTemplate()` in `lib/utils/linksCsv.ts`. It returns the same 13-column header as the export, then two sample rows: a full row (via `linksToCSV`) and a minimal row with only `url`, `category` and `tags`.
- A "Download CSV template" button on the Upload file tab. It downloads `link-vault-template.csv` via `triggerDownload` (`lib/utils/downloadFile.ts`).
- `buildMinimalCsvTemplate()` in `lib/utils/linksCsv.ts`. It returns only the `url,category,tags` header and the same minimal example row.
- A "Download minimal template" button next to it. It downloads `link-vault-template-minimal.csv`.
- A collapsed `<details>` "CSV format" guide under the drop zone. It lists each column, whether it is required, and its accepted values.
- Parser fixes in `parseCSV`:
  - quoted fields may contain newlines;
  - CRLF line endings are handled;
  - header names are trimmed and matched case-insensitively.
- Tests in `tests/utils/linksCsv.test.ts` and `tests/components/ImportExportClient.test.tsx`.

**Out of scope (for future specs):**

- A "Paste CSV" import tab.
- Documenting the JSON import format or a JSON template.
- A template button in the Export section.
- Row-level import error reporting (which line failed and why).
- Delimiters other than `,` (e.g. `;` from European Excel locales).
- Changing the CSV column set or the export format.

## Data model

This feature introduces no new persisted data.

The template's header and full row come from the existing `linksToCSV` (`lib/types/importExport.ts` `ExportedLink`), so the header cannot drift from the parser. `linksToCSV` always writes `status` and `is_favorite`, so the minimal row is built separately. It maps each name in the `CSV_HEADER` column list to a value: `url`, `category`, `tags` filled, every other column `''`. Because it is keyed by column name, it stays aligned if columns ever change.

- Full row:
  - `url` `https://example.com/article`
  - `title`, `description`, `site_name` `example.com`, `duration` `12:34`
  - `category` `Article`, `status` `read`, `is_favorite` `true`
  - `notes` containing a comma
  - `tags` `["reading", "example"]` → `reading|example`
  - ISO `created_at`/`updated_at`
- Minimal row (`url`, `category`, `tags` only; every other column empty):
  - `url` `https://github.com/some/repo`
  - `category` `GitHub`
  - `tags` `example|repo|open-source` (several tags, one category: shows the contrast)
  - When parsed, blank `status` → `undefined` (importer default, unread), blank `is_favorite` → `false`, other fields `null`/`undefined`.

## Implementation plan

1. In `lib/utils/linksCsv.ts`, rewrite parsing as a character-level tokenizer over the whole text instead of `text.split('\n')`.
   - A newline inside quotes belongs to the field.
   - `\r\n` and `\n` both end a record.
   - Fully empty records are skipped.
   - `splitCSVLine` is replaced by this tokenizer. `parseCSV`'s signature and `ParsedRow` output stay unchanged.
   - Existing `parseCSV` tests keep passing.
2. In `parseCSV`, normalize header names with `trim().toLowerCase()` before the `col(name)` lookups.
3. Add `buildCsvTemplate(): string` to `lib/utils/linksCsv.ts`. It uses `linksToCSV` for the header and full row, and appends the minimal row built by column name from the header list. The header string is split into a column-name array so both can share it.
4. Add tests to `tests/utils/linksCsv.test.ts`:
   - a quoted field with an embedded newline parses into one row with the newline preserved;
   - a CRLF file parses with no trailing `\r` on the last column (`updated_at`);
   - headers `URL`, ` Title ` map to `url`/`title`;
   - `linksToCSV` → `parseCSV` round-trips a link whose notes contain a newline;
   - `parseCSV(buildCsvTemplate())` returns 2 rows; row 1 has `categoryName: 'Article'`, tags `['reading','example']`, `status: 'read'`, `is_favorite: true`; row 2 has `url`, `categoryName: 'GitHub'`, tags `['example','repo','open-source']`, `status: undefined`, `title: null`;
   - the template's first line equals the export header.
5. In `app/dashboard/config/import-export/ImportExportClient.tsx`, inside the `importTab === 'file'` branch, under the drop zone:
   - a secondary/ghost button "Download CSV template", calling `triggerDownload(buildCsvTemplate(), 'link-vault-template.csv', 'text/csv')`;
   - next to it, a secondary/ghost button "Download minimal template", calling `triggerDownload(buildMinimalCsvTemplate(), 'link-vault-template-minimal.csv', 'text/csv')`;
   - a closed `<details>` with summary "CSV format" holding a compact column list:
     - `url` (required);
     - `title`, `description`, `site_name`, `image_url`, `duration`, `notes` (free text);
     - `category` (exactly one category name per link; created if it doesn't exist; blank → default category below);
     - `status` (`unread` / `watching` / `read` / `archived`; anything else is ignored);
     - `is_favorite` (`true` / `false`);
     - `tags` (any number of tags per link, separated by `|`, e.g. `react|tutorial|video`);
     - `created_at` / `updated_at` (ISO 8601, optional).
   - It also says: "First row must be the header. Column order doesn't matter. Only `url` is required."
   - The button click must not bubble to the drop zone's `onClick` (which opens the file picker), so it sits outside the drop-zone `div`.
   - Styles follow the CLAUDE.md design system (`surface-*`/`primary-*`, `rounded-xl`).
6. Add tests to `tests/components/ImportExportClient.test.tsx`:
   - on the file tab, a "Download CSV template" button and a "CSV format" summary are rendered;
   - clicking the button calls `triggerDownload` (mocked) with `'link-vault-template.csv'` and `'text/csv'`, and does not open the file input;
   - clicking "Download minimal template" calls `triggerDownload` with CSV starting `url,category,tags`, `'link-vault-template-minimal.csv'` and `'text/csv'`, and does not open the file input;
   - neither element is rendered on the URLs or JSON tabs.

## Acceptance criteria

- [ ] The Upload file tab shows a "Download CSV template" button and a collapsed "CSV format" disclosure. The Paste URLs and Paste JSON tabs show neither.
- [ ] Clicking "Download CSV template" downloads `link-vault-template.csv` without opening the file picker.
- [ ] Clicking "Download minimal template" downloads `link-vault-template-minimal.csv` without opening the file picker. It has the header `url,category,tags` and one row: `https://github.com/some/repo`, `GitHub`, `example|repo|open-source`.
- [ ] Uploading the unmodified minimal template imports 1 link with category "GitHub", tags `example`, `repo` and `open-source`, status Unread, not favorited.
- [ ] The template's header line is identical to the header of a CSV produced by "Export as CSV".
- [ ] The template has exactly 2 data rows: one with every column filled, and one where only `url`, `category` and `tags` are non-empty.
- [ ] Uploading the unmodified template imports 2 links. The full row gets category "Article", tags `reading` and `example`, status Read, and is favorited. The minimal row gets category "GitHub", tags `example`, `repo` and `open-source`, status Unread, and is not favorited.
- [ ] Expanding "CSV format" lists all 13 columns and marks `url` as the only required one. It states that `category` takes exactly one name and `tags` takes many separated by `|`, and lists the four valid status values.
- [ ] A CSV whose `notes` field contains a quoted newline imports as one link with the newline kept in its notes.
- [ ] A link exported via "Export as CSV" with multi-line notes re-imports (into an account without that URL) with identical notes.
- [ ] A CRLF-terminated CSV imports with no trailing `\r` in `updated_at` or any other field.
- [ ] A CSV with header `URL,Title` imports its links with titles.
- [ ] `npm test` passes, including the new tests.

## Decisions

- **Yes:** Template download plus inline guide. The download gives a working starting file. The guide explains the values without leaving the page.
- **Yes:** All 13 columns plus 2 example rows. The template stays round-trip compatible with the export.
- **Yes:** The minimal row fills only `url`, `category` and `tags`. These are the fields most people set by hand, and leaving the rest empty shows that they are optional.
- **No:** Building the minimal row via `linksToCSV`. It always writes `status`/`is_favorite`, which would make those columns look required. The row is keyed by column name instead.
- **Yes:** A separate minimal-columns template (`url,category,tags`) in addition to the full one. Added after review: users wanted a ready-made file with only the fields they actually fill in. The full template stays the export-compatible reference.
- **No:** Replacing the full template with the minimal one. It would hide fields users can set and break header parity with the export.
- **Yes:** Generate the template with `linksToCSV`. The header has one source of truth and cannot drift.
- **No:** A static `public/` CSV file. It can silently drift from the parser.
- **Yes:** Template and guide on the Upload file tab only, because CSV can only be imported there.
- **No:** A template button in the Export section. It adds clutter next to the export actions, which do something different.
- **Yes:** Guide collapsed in a `<details>`. Keeps the tab compact, and native `<details>` needs no state or JS.
- **Yes:** Fix multi-line fields and CRLF in this spec. Without these fixes the documented format doesn't round-trip our own export, and Excel-saved files misparse.
- **Yes:** Trim and case-insensitive headers. Hand-made files with `URL` otherwise fail with an unhelpful "No valid links found".
- **Yes:** One category and many tags per link, as the data model already works (`links.category_id` is a single FK, tags go through the `link_tags` join). The template's minimal row and the guide both make this contrast explicit.
- **No:** Multiple categories per link. It would be a data-model change and is not wanted.
- **No:** Supporting `;` delimiters or a Paste CSV tab. Each is a separate feature.

## Risks

| Risk | Mitigation |
| --- | --- |
| The tokenizer rewrite regresses existing parsing (quotes, escaped quotes, blank columns) | All existing `parseCSV` tests stay green unchanged, and a round-trip test is added. |
| An unclosed quote swallows the rest of the file into one field | Acceptable degraded case: the affected rows are lost or merged and the import reports fewer links. It does not crash. |
| The template button triggers the drop zone's file picker | The button is rendered outside the drop-zone `div`, and a test asserts the file input isn't clicked. |

## What is **not** in this spec

- A Paste CSV tab.
- JSON format docs or a JSON template.
- A template button in the Export section.
- Per-row import error reporting.
- `;` or other delimiters.
- Changes to the CSV column set or export format.
