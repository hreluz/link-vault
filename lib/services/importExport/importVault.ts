import { createClient } from '@/lib/supabase/client'
import { importLinks, type ImportLinkInput, type ImportResult, type ImportRowOutcome } from '@/lib/services/links'
import { getCategories, getOrCreateCategoryByName } from '@/lib/services/categories'
import { addCategoryDomain } from '@/lib/services/category-domains'
import { getTags, syncTagDefinitions, toKebabCase } from '@/lib/services/tags/tags'
import { setThemeMode, setAccentColor, setSurfaceFamily, setAutoFetchPreference } from '@/lib/services/userPreferences'
import type { ToggleResult } from '@/lib/hooks/shared/useAsyncToggle'
import { getVaultExportValidationError, type VaultExportV2 } from '@/lib/types/importExport'

export type VaultImportResult = ImportResult & {
  categoriesCreated: number
  domainsCreated: number
  domainsFailed: number
  tagsCreated: number
  preferencesFailed: string[]
}

export type VaultImportPhase = 'categories' | 'domains' | 'tags' | 'links' | 'preferences'
export type VaultImportProgress = {
  phase: VaultImportPhase
  done: number
  total: number
  /** Set only for phase 'links': what happened to the row that just finished. */
  outcome?: ImportRowOutcome
}

export type VaultImportOptions = {
  defaultCategoryId: string | null
  /** Only meaningful when `data.mode === 'everything'` and `data.preferences` is present. */
  applyPreferences: boolean
  onProgress?: (progress: VaultImportProgress) => void
  /** Checked before each phase, and passed through to `importLinks` (checked before each link row). */
  signal?: AbortSignal
}

/** Imports a full v2 vault export: categories (styled) -> domain rules -> tags (colored/private) -> links -> preferences.
 *  Categories/tags are resolved by name and never overwrite a same-named match already in the destination account. */
export async function importVaultExport(
  data: VaultExportV2,
  options: VaultImportOptions,
  dek: CryptoKey,
): Promise<VaultImportResult> {
  // Defense in depth: the UI validates before ever setting detectedVaultExport, but this
  // function is also callable directly, so a malformed export still fails here with an
  // actionable message instead of throwing deep inside the loops below.
  const validationError = getVaultExportValidationError(data)
  if (validationError) throw new Error(validationError)

  const { signal } = options
  let categoriesCreated = 0
  let domainsCreated = 0
  let domainsFailed = 0
  let tagsCreated = 0
  // A cancel before the links phase skips every remaining phase (preferences included);
  // what the finished phases created stays, and every link counts as not processed.
  const cancelledBeforeLinks = (): VaultImportResult => ({
    imported: 0, skipped: 0, duplicates: 0, failures: [],
    cancelled: true, notProcessed: data.links.map(l => l.url.trim()),
    categoriesCreated, domainsCreated, domainsFailed, tagsCreated, preferencesFailed: [],
  })

  if (signal?.aborted) return cancelledBeforeLinks()

  // ── categories ──────────────────────────────────────────────────────────
  const existingCategories = await getCategories(dek)
  const existingCategoryNames = new Set(existingCategories.map(c => c.name.toLowerCase()))
  const categoryStyleByName = new Map(
    (data.categories ?? []).map(c => [c.name, { description: c.description, color: c.color, emoticon: c.emoticon }]),
  )

  const categoryNames = new Set<string>()
  for (const c of data.categories ?? []) categoryNames.add(c.name)
  for (const l of data.links) if (l.category) categoryNames.add(l.category)

  // Each name/domain below is already deduped (Set, or a validated export's own unique
  // rows), so no two concurrent iterations ever target the same one -- safe to run in
  // parallel, unlike the tag-sync loops further down (see their own comments).
  const categoryIdByName = new Map<string, string>()
  const categoryEntries = [...categoryNames]
  let categoriesDone = 0
  await Promise.all(categoryEntries.map(async name => {
    const id = await getOrCreateCategoryByName(name, dek, categoryStyleByName.get(name))
    if (id) {
      categoryIdByName.set(name, id)
      if (!existingCategoryNames.has(name.toLowerCase())) categoriesCreated++
    }
    options.onProgress?.({ phase: 'categories', done: ++categoriesDone, total: categoryEntries.length })
  }))

  if (signal?.aborted) return cancelledBeforeLinks()

  // ── domain auto-assign rules ("everything" only) ───────────────────────
  const domainEntries = data.categoryDomains ?? []
  let domainsDone = 0
  await Promise.all(domainEntries.map(async d => {
    const categoryId = categoryIdByName.get(d.category)
    if (categoryId) {
      const result = await addCategoryDomain(categoryId, d.domain, dek)
      if (result.data) {
        domainsCreated++
      } else if (result.error !== 'domain_taken') {
        domainsFailed++
        console.error(`[importVaultExport] domain rule failed for "${d.domain}": ${result.error}`)
      }
    }
    options.onProgress?.({ phase: 'domains', done: ++domainsDone, total: domainEntries.length })
  }))

  if (signal?.aborted) return cancelledBeforeLinks()

  // ── tags ("everything" only) -- pre-create with color/privacy so the
  //    per-link tag sync below (name-matched, inside importLinks) reuses them.
  //    syncTagDefinitions stays a single sequential call/loop (not parallelized): it
  //    mutates a local "existing tags" accumulator as it creates new ones, so a later
  //    entry sharing a not-yet-existing name resolves to the tag just created instead of
  //    racing to create a duplicate -- see its own doc comment in tags.ts.
  if (data.tags && data.tags.length > 0) {
    options.onProgress?.({ phase: 'tags', done: 0, total: data.tags.length })
    const existingTags = await getTags(dek)
    const existingTagNames = new Set(existingTags.map(t => t.name.toLowerCase()))
    await syncTagDefinitions(data.tags, dek)
    for (const def of data.tags) {
      const kebab = toKebabCase(def.name)
      if (kebab && !existingTagNames.has(kebab)) tagsCreated++
    }
    options.onProgress?.({ phase: 'tags', done: data.tags.length, total: data.tags.length })
  }

  if (signal?.aborted) return cancelledBeforeLinks()

  // ── links ───────────────────────────────────────────────────────────────
  const inputs: ImportLinkInput[] = data.links.map(l => ({
    url: l.url,
    title: l.title,
    description: l.description,
    site_name: l.site_name,
    image_url: l.image_url,
    duration: l.duration,
    notes: l.notes,
    status: l.status,
    is_favorite: l.is_favorite,
    created_at: l.created_at,
    updated_at: l.updated_at,
    tags: l.tags,
    category_id: l.category ? categoryIdByName.get(l.category) : undefined,
  }))

  const linkResult = await importLinks(
    inputs, options.defaultCategoryId, dek,
    {
      onProgress: (done, total, outcome) => options.onProgress?.({ phase: 'links', done, total, outcome }),
      signal,
    },
  )

  // ── preferences ("everything" only, opt-in) ─────────────────────────────
  // Never applied after a cancel -- even one that landed after the last link row.
  const wantsPreferences = options.applyPreferences && data.mode === 'everything' && !!data.preferences
  const preferencesSkipped = wantsPreferences && !!signal?.aborted
  const preferencesFailed: string[] = []
  if (wantsPreferences && !preferencesSkipped && data.preferences) {
    options.onProgress?.({ phase: 'preferences', done: 0, total: 1 })
    const supabase = createClient()
    const prefs = data.preferences
    const entries: Array<[string, Promise<ToggleResult>]> = [
      ['theme', setThemeMode(supabase, prefs.theme_mode)],
      ['accent (light)', setAccentColor(supabase, 'light', prefs.accent_color_light)],
      ['accent (dark)', setAccentColor(supabase, 'dark', prefs.accent_color_dark)],
      ['surface', setSurfaceFamily(supabase, prefs.surface_family)],
      ['auto-fetch', setAutoFetchPreference(supabase, prefs.auto_fetch_enabled)],
    ]
    const results = await Promise.all(entries.map(async ([label, promise]) => [label, await promise] as const))
    for (const [label, result] of results) {
      if (!result.success) {
        preferencesFailed.push(label)
        console.error(`[importVaultExport] preference "${label}" failed: ${result.error}`)
      }
    }
    options.onProgress?.({ phase: 'preferences', done: 1, total: 1 })
  }

  return {
    ...linkResult,
    cancelled: linkResult.cancelled || preferencesSkipped,
    categoriesCreated, domainsCreated, domainsFailed, tagsCreated, preferencesFailed,
  }
}
