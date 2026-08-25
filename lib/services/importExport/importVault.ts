import { createClient } from '@/lib/supabase/client'
import { importLinks, type ImportLinkInput, type ImportResult } from '@/lib/services/links'
import { getCategories, getOrCreateCategoryByName } from '@/lib/services/categories'
import { addCategoryDomain } from '@/lib/services/category-domains'
import { getTags, syncTagDefinitions, toKebabCase } from '@/lib/services/tags/tags'
import { setThemeMode, setAccentColor, setSurfaceFamily, setAutoFetchPreference } from '@/lib/services/userPreferences'
import type { VaultExportV2 } from '@/lib/types/importExport'

export type VaultImportResult = ImportResult & {
  categoriesCreated: number
  domainsCreated: number
  tagsCreated: number
}

export type VaultImportOptions = {
  defaultCategoryId: string | null
  /** Only meaningful when `data.mode === 'everything'` and `data.preferences` is present. */
  applyPreferences: boolean
}

/** Imports a full v2 vault export: categories (styled) -> domain rules -> tags (colored/private) -> links -> preferences.
 *  Categories/tags are resolved by name and never overwrite a same-named match already in the destination account. */
export async function importVaultExport(
  data: VaultExportV2,
  options: VaultImportOptions,
  dek: CryptoKey,
): Promise<VaultImportResult> {
  // ── categories ──────────────────────────────────────────────────────────
  const existingCategories = await getCategories(dek)
  const existingCategoryNames = new Set(existingCategories.map(c => c.name.toLowerCase()))
  const categoryStyleByName = new Map(
    (data.categories ?? []).map(c => [c.name, { description: c.description, color: c.color, emoticon: c.emoticon }]),
  )

  const categoryNames = new Set<string>()
  for (const c of data.categories ?? []) categoryNames.add(c.name)
  for (const l of data.links) if (l.category) categoryNames.add(l.category)

  const categoryIdByName = new Map<string, string>()
  let categoriesCreated = 0
  for (const name of categoryNames) {
    const id = await getOrCreateCategoryByName(name, dek, categoryStyleByName.get(name))
    if (id) {
      categoryIdByName.set(name, id)
      if (!existingCategoryNames.has(name.toLowerCase())) categoriesCreated++
    }
  }

  // ── domain auto-assign rules ("everything" only) ───────────────────────
  let domainsCreated = 0
  for (const d of data.categoryDomains ?? []) {
    const categoryId = categoryIdByName.get(d.category)
    if (!categoryId) continue
    const result = await addCategoryDomain(categoryId, d.domain, dek)
    if (result.data) domainsCreated++
  }

  // ── tags ("everything" only) -- pre-create with color/privacy so the
  //    per-link tag sync below (name-matched, inside importLinks) reuses them ──
  let tagsCreated = 0
  if (data.tags && data.tags.length > 0) {
    const existingTags = await getTags(dek)
    const existingTagNames = new Set(existingTags.map(t => t.name.toLowerCase()))
    await syncTagDefinitions(data.tags, dek)
    for (const def of data.tags) {
      const kebab = toKebabCase(def.name)
      if (kebab && !existingTagNames.has(kebab)) tagsCreated++
    }
  }

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

  const linkResult = await importLinks(inputs, options.defaultCategoryId, dek)

  // ── preferences ("everything" only, opt-in) ─────────────────────────────
  if (options.applyPreferences && data.mode === 'everything' && data.preferences) {
    const supabase = createClient()
    const prefs = data.preferences
    await Promise.all([
      setThemeMode(supabase, prefs.theme_mode),
      setAccentColor(supabase, 'light', prefs.accent_color_light),
      setAccentColor(supabase, 'dark', prefs.accent_color_dark),
      setSurfaceFamily(supabase, prefs.surface_family),
      setAutoFetchPreference(supabase, prefs.auto_fetch_enabled),
    ])
  }

  return { ...linkResult, categoriesCreated, domainsCreated, tagsCreated }
}
