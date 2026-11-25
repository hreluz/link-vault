import { createClient } from '@/lib/supabase/client'
import { importLinks, type ImportCreateKind, type ImportLinkInput, type ImportResult, type ImportRowOutcome } from '@/lib/services/links'
import { getCategories, getOrCreateCategoryByName } from '@/lib/services/categories'
import { addCategoryDomain } from '@/lib/services/category-domains'
import { getTags, syncTagDefinitions, toKebabCase } from '@/lib/services/tags/tags'
import { addLinksToCollection, createCollection, getCollectionMemberships, getCollections } from '@/lib/services/collections'
import { setThemeMode, setAccentColor, setSurfaceFamily, setAutoFetchPreference, setMoveToEndDelay } from '@/lib/services/userPreferences'
import type { ToggleResult } from '@/lib/hooks/shared/useAsyncToggle'
import { getVaultExportValidationError, type ExportedCollection, type VaultExportV2 } from '@/lib/types/importExport'

export type VaultImportResult = ImportResult & {
  categoriesCreated: number
  domainsCreated: number
  domainsFailed: number
  tagsCreated: number
  preferencesFailed: string[]
  /** Collections this run created (and filled without error). */
  collectionsCreated: number
  /** Existing same-named collections that got at least one new link. */
  collectionsUpdated: number
  /** Collections whose create or append failed; the import carried on. */
  collectionsFailed: number
}

export type VaultImportPhase = 'categories' | 'domains' | 'tags' | 'links' | 'collections' | 'preferences'
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
  /** Called once for each tag, category or collection this restore creates (not for existing matches). */
  onCreate?: (kind: ImportCreateKind, id: string) => void
}

type CollectionGroup = {
  name: string
  emoji: string | null
  description: string | null
  links: string[]
}

/** Merges same-named entries (trimmed, case-insensitive) at their first entry's place: the first
 *  entry's name/emoji/description win, and the links run in file order across the merged entries. */
function groupCollections(entries: ExportedCollection[]): CollectionGroup[] {
  const groups: CollectionGroup[] = []
  const byKey = new Map<string, CollectionGroup>()
  for (const entry of entries) {
    const name = entry.name.trim()
    const key = name.toLowerCase()
    let group = byKey.get(key)
    if (!group) {
      group = { name, emoji: entry.emoji, description: entry.description, links: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    group.links.push(...entry.links)
  }
  return groups
}

/** Imports a full v2 vault export: categories (styled) -> domain rules -> tags (colored/private) -> links -> collections -> preferences.
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

  const { signal, onCreate } = options
  let categoriesCreated = 0
  let domainsCreated = 0
  let domainsFailed = 0
  let tagsCreated = 0
  // A cancel before the links phase skips every remaining phase (preferences included);
  // what the finished phases created stays, and every link counts as not processed.
  const cancelledBeforeLinks = (): VaultImportResult => ({
    imported: 0, skipped: 0, duplicates: 0, failures: [],
    cancelled: true, notProcessed: data.links.map(l => l.url.trim()), retryable: [],
    categoriesCreated, domainsCreated, domainsFailed, tagsCreated, preferencesFailed: [],
    collectionsCreated: 0, collectionsUpdated: 0, collectionsFailed: 0,
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
    const id = await getOrCreateCategoryByName(
      name, dek, categoryStyleByName.get(name), onCreate && (created => onCreate('category', created)),
    )
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
    await syncTagDefinitions(data.tags, dek, onCreate && (created => onCreate('tag', created)))
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

  // Saved and already-existing rows both carry an id, so the collections phase can place them.
  const linkIdByUrl = new Map<string, string>()
  const linkResult = await importLinks(
    inputs, options.defaultCategoryId, dek,
    {
      onProgress: (done, total, outcome) => {
        if (outcome && (outcome.status === 'imported' || outcome.status === 'duplicate')) {
          linkIdByUrl.set(outcome.url.trim(), outcome.id)
        }
        options.onProgress?.({ phase: 'links', done, total, outcome })
      },
      signal,
      onCreate,
    },
  )

  // ── collections ("everything" only) ─────────────────────────────────────
  // Skipped entirely after any cancel, like preferences. Processed bottom-up: the file is
  // recently-updated-first and every create/append bumps updated_at (migration 0024 triggers),
  // so the destination list ends up in the source order.
  let collectionsCreated = 0
  let collectionsUpdated = 0
  let collectionsFailed = 0
  let collectionsCancelled = false
  const collectionGroups = groupCollections(data.collections ?? [])
  // Like preferences: skipping them after a cancel (even one after the last link row) is a cancel.
  if (collectionGroups.length > 0 && signal?.aborted) collectionsCancelled = true
  if (collectionGroups.length > 0 && !signal?.aborted) {
    const total = collectionGroups.length
    let done = 0
    options.onProgress?.({ phase: 'collections', done, total })
    // Names aren't unique: the first match in list order (recently updated first) is reused.
    let existingIdByName: Map<string, string> | null = new Map()
    try {
      for (const c of await getCollections(dek)) {
        const key = c.name.trim().toLowerCase()
        if (!existingIdByName.has(key)) existingIdByName.set(key, c.id)
      }
    } catch (error) {
      console.error('[importVaultExport] loading collections failed:', error)
      existingIdByName = null
      collectionsFailed = total
    }

    if (existingIdByName) {
      for (const group of [...collectionGroups].reverse()) {
        if (signal?.aborted) {
          collectionsCancelled = true
          break
        }
        const linkIds = [...new Set(group.links.flatMap(url => {
          const id = linkIdByUrl.get(url.trim())
          return id ? [id] : []
        }))]
        let collectionId = existingIdByName.get(group.name.toLowerCase())
        const reused = !!collectionId
        try {
          if (!collectionId) {
            const created = await createCollection(
              { name: group.name, emoji: group.emoji, description: group.description }, dek,
            )
            if (!created.data) throw new Error(created.error)
            collectionId = created.data.id
            onCreate?.('collection', collectionId)
          }
          const members = reused
            ? new Set((await getCollectionMemberships(collectionId)).map(m => m.link_id))
            : new Set<string>()
          const toAdd = linkIds.filter(id => !members.has(id))
          if (toAdd.length > 0) {
            const added = await addLinksToCollection(collectionId, toAdd)
            if (!added) throw new Error('append failed')
          }
          if (!reused) collectionsCreated++
          else if (toAdd.length > 0) collectionsUpdated++
        } catch (error) {
          collectionsFailed++
          console.error(`[importVaultExport] collection "${group.name}" failed:`, error)
        }
        options.onProgress?.({ phase: 'collections', done: ++done, total })
      }
    }
  }

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
    // Older files don't have it; leave the destination's value alone then.
    if (prefs.move_to_end_delay_seconds !== undefined) {
      entries.push(['move-to-end delay', setMoveToEndDelay(supabase, prefs.move_to_end_delay_seconds)])
    }
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
    cancelled: linkResult.cancelled || collectionsCancelled || preferencesSkipped,
    categoriesCreated, domainsCreated, domainsFailed, tagsCreated, preferencesFailed,
    collectionsCreated, collectionsUpdated, collectionsFailed,
  }
}
