# SPEC 13 — Add tags to every link in an import

> **Status:** Approved
> **Depends on:** SPEC 06
> **Date:** 2026-10-18
> **Objective:** The import form gets an optional "Tags for imported links" chip input whose tags are added to every link saved by a non-v2 import, on top of the tags each row already has.

## Why this spec exists

Today an import can only tag links through the file itself (a CSV `tags` column or a JSON `tags` array). Pasted URLs never get tags: every one of them ends up with the fallback `no-tag` tag (`syncTagsByName` with an empty list). To tag a batch you have to import it, then find the links again and bulk-tag them. The user wants to pick tags for the whole batch before importing, the same way they pick a default category.

## Scope

**In:**

- **New field** on the import form, under the "Default category for imported links" selector: label `Tags for imported links (optional)`, using the same chip input as the add-link form (chips, `#tag`/comma entry, paste, autocomplete from `useAvailableTags()` with ↑/↓, Tab/Enter, Escape).
- **Paths:** pasted URLs, pasted JSON, CSV upload, plain JSON upload.
- **v2 restores excluded.** When the selected file is a v2 export (`detectedVaultExport`), the field is disabled with the hint `Not available for full vault exports — they keep their own tags.` and its tags are not applied. The typed tags are kept, so they apply again if the user switches back to a non-v2 source.
- **Merge rule:** each row's final tags = its own tags followed by the import tags, de-duplicated by kebab-case name (`toKebabCase`), keeping the first occurrence. Nothing from the file is dropped.
  - A row with no tags of its own gets exactly the import tags, so it no longer falls back to `no-tag`.
  - With the field empty, every row is imported exactly as today (including `no-tag`).
- **New tag names** are created the same way the add-link form creates them (`syncTagsByName`: kebab-case, public, no color). A name matching an existing tag reuses it.
- **Duplicates untouched:** rows skipped as "Already existed" do not get the import tags.
- **Generic-skipped and failed rows** (SPEC 12, save errors) are not saved, so nothing is tagged.
- **Lifetime:** the field keeps its tags after an import finishes (like the default category selector), so a second batch can reuse them. It is empty on every page load and is not saved to the DB.
- **Shared chip component:** the chip markup moves out of `TagsField` into `components/TagChipsInput.tsx`. `TagsField` becomes a thin wrapper over it with no visible change; the import page uses it directly.
- `refetchTags()` already runs after an import with `imported > 0`, so newly created tags show up in autocomplete and Organize.
- Tests for each changed layer, plus a CLAUDE.md note in feature #12.

**Out of scope (for future specs):**

- Applying import tags to v2 "Quick"/"Everything" restores.
- Adding import tags to links that already exist in the vault (duplicates).
- Replacing a row's own tags, or using import tags only as a fallback.
- Creating private tags or choosing a color from the import form.
- Remembering import tags across page loads.
- Per-row tag editing in the import form, or a preview of the final tags per row.
- Changing `syncTagsByName`'s `no-tag` fallback.
- Batching tag syncing across rows (it stays one `syncTagsByName` per saved row, as today).

## Data model

No persisted data. In-memory only:

```ts
// components/TagChipsInput.tsx
type Props = {
  label: string
  /** Comma-separated tag names, the same format useTagInput already uses. */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Optional id of a hint element, for aria-describedby. */
  describedBy?: string
}
export default function TagChipsInput(props: Props): JSX.Element
```

```ts
// lib/hooks/importExport/useLinkImport.ts
// New state, returned from the hook:
importTags: string            // comma-separated, '' by default
setImportTags: (v: string) => void

/** Row tags followed by the import tags, de-duplicated by kebab-case name, first occurrence kept.
 *  Returns inputs unchanged when importTags parses to an empty list. */
function applyImportTags(inputs: ImportLinkInput[], importTags: string): ImportLinkInput[]
```

`ImportLinkInput`, `importLinks`, `ImportResult` and `ImportRowOutcome` do not change.

## Implementation plan

1. **Extract `TagChipsInput`.** Move the label, chip list, input, and `TagSuggestionsDropdown` from `app/dashboard/link/LinkForm/TagsField.tsx` into `components/TagChipsInput.tsx`. It calls `useTagInput(value, onChange, useAvailableTags())` itself. `disabled` disables the input and remove buttons and dims the box (`opacity-50 cursor-not-allowed`). `TagsField` becomes `<TagChipsInput label="Tags" value={tags} onChange={setTags} />`.
   - `tests/components/LinkForm.test.tsx` passes unchanged.
   - New `tests/components/TagChipsInput.test.tsx`: typing `react,` adds a `#react` chip and calls `onChange('react')`; the remove button drops it; a suggestion from `useAvailableTags` appears and Enter selects it; `disabled` disables the input.
2. **Hook state and merge.** In `lib/hooks/importExport/useLinkImport.ts`:
   - add `importTags` / `setImportTags` state (`''`), returned from the hook;
   - add `applyImportTags` (parse with the same comma split/trim/filter as `useTagInput`, merge, de-dupe with `toKebabCase` from the tags service);
   - in the non-v2 path, call it after `applyDomainCategories` and before `eta.start`/`importLinks`;
   - the v2 path (`importVaultExport`) is not touched;
   - `importTags` is not reset after an import.

   Tests in `tests/hooks/importExport/useLinkImport.test.ts`:
   - pasted URLs with `importTags = 'inbox, to-watch'` reach the mocked `importLinks` with `tags: ['inbox', 'to-watch']`;
   - a CSV row tagged `react|video` with `importTags = 'inbox, React'` reaches it with `['react', 'video', 'inbox']`;
   - a JSON row with `tags: ['Inbox']` and `importTags = 'inbox'` reaches it with `['Inbox']` (one entry);
   - empty `importTags` passes inputs unchanged (pasted URLs keep `tags: []`);
   - a v2 import ignores `importTags`;
   - `importTags` keeps its value after an import finishes.
3. **Form UI.** In `app/dashboard/config/import-export/ImportExportClient.tsx`, render `<TagChipsInput label="Tags for imported links (optional)" value={importTags} onChange={setImportTags} disabled={!!detectedVaultExport} describedBy="import-tags-hint" />` under the category selector, with a hint `<p id="import-tags-hint">`:
   - non-v2: `Added to every imported link, on top of any tags in the file.`
   - v2: `Not available for full vault exports — they keep their own tags.`

   Tests in `tests/components/ImportExportClient.test.tsx`: the field renders with its label and non-v2 hint; with a detected v2 file it is disabled and shows the v2 hint.
4. **Docs.** In CLAUDE.md feature #12, add one sentence: non-v2 imports take optional "Tags for imported links" (chip input, `TagChipsInput`, shared with the add-link form's `TagsField`) that are added to every saved row on top of its own tags (de-duplicated); duplicates and v2 restores are untouched. In feature #3, add `TagChipsInput` to the list of places powered by `useAvailableTags()` + `useTagInput`.

## Acceptance criteria

- [ ] The import form shows `Tags for imported links (optional)` under the default category selector, with chips and autocomplete identical to the add-link form.
- [ ] Pasting 3 URLs with import tags `inbox, to-watch` saves all 3 with exactly the tags `inbox` and `to-watch` (no `no-tag`).
- [ ] A CSV row tagged `react|video` imported with import tags `inbox` ends up tagged `react`, `video`, `inbox`.
- [ ] Import tag `React` on a row already tagged `react` leaves the link with one `react` tag and the import doesn't fail.
- [ ] A new name typed in the field (e.g. `batch-oct`) creates one public tag, visible in Organize → Tags and in autocomplete right after the import.
- [ ] With the field empty, an import of pasted URLs behaves exactly as before (links get `no-tag`).
- [ ] A URL already in the vault is reported as "Already existed" and its tags are unchanged.
- [ ] Selecting a v2 export disables the field and shows the v2 hint; the restored links carry only the tags recorded in the file.
- [ ] After an import finishes, the field still holds its tags; reloading the page empties it.
- [ ] The add-link form's Tags field looks and behaves as before.
- [ ] The field fits at 375 px with no horizontal scroll.
- [ ] `npm test` passes, including the new tests.

## Decisions

- **Yes:** Non-v2 paths only. v2 restores are a faithful clone; adding tags would break that (same reasoning as SPEC 06).
- **Yes:** Add to the row's own tags (union). Nothing from the file is lost.
- **No:** Fallback-only or replace modes. Fallback makes the field silently do nothing for tagged CSVs; replace loses file data.
- **Yes:** De-dupe by kebab-case name. `syncTagsByName` kebab-cases names, so `React` and `react` would resolve to the same tag id and insert a duplicate `link_tags` row.
- **Yes:** Merge in `useLinkImport` before `importLinks`, like `applyDomainCategories`. `importLinks` stays unchanged and the v2 path is excluded by construction.
- **No:** Tagging duplicates. It changes what "Already existed" means; bulk tag already covers tagging existing links.
- **Yes:** Same chip input as the add-link form, extracted to `components/TagChipsInput.tsx`. One implementation, no drift.
- **Yes:** Keep the tags until page reload, like the default category selector, so consecutive batches can reuse them.
- **No:** Persisting import tags in `user_preferences`. They are per batch, not a preference.
- **Yes:** Keep the field's value while it is disabled for a v2 file, so switching sources doesn't lose what was typed.

## Risks

| Risk | Mitigation |
| --- | --- |
| Tags typed for one batch are applied to the next one by accident | The field stays visible next to the Import button with its chips shown; the user removes them before the next import. |
| A typed name matches a locked private tag, so the imported links are hidden until it is unlocked | Existing `syncTagsByName` behavior, same as the add-link form. Out of scope here. |
| Extracting `TagChipsInput` breaks the add-link form | `LinkForm.test.tsx` must pass unchanged, and `TagsField` keeps its label and placeholder. |
| A large import now creates/looks up more tags per row | Same one `syncTagsByName` call per saved row as today; only the list is longer. |

## What is **not** in this spec

- v2 restores.
- Tagging duplicates.
- Replace/fallback merge modes.
- Private tags or colors from the import form.
- Persisted import tags.

Each one of those, if it lands, goes in its own spec.

