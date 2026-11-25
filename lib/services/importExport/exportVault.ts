import { createClient } from '@/lib/supabase/client'
import { getLinks } from '@/lib/services/links'
import { getCategories } from '@/lib/services/categories'
import { getAllCategoryDomains } from '@/lib/services/category-domains'
import { getTags, isTagVisible } from '@/lib/services/tags/tags'
import { getCollections, getCollectionMemberships } from '@/lib/services/collections'
import { getAutoFetchPreference, getAccentColors, getSurfaceFamily, getThemeMode, getMoveToEndDelay } from '@/lib/services/userPreferences'
import { EXPORT_FORMAT, EXPORT_VERSION, type ExportMode, type VaultExportV2 } from '@/lib/types/importExport'

export type BuildVaultExportResult = {
  data: VaultExportV2
  /** Links excluded because they carry a private tag that isn't unlocked this session -- see tags.isTagVisible. */
  hiddenPrivateLinksCount: number
}

export async function buildVaultExport(
  mode: ExportMode,
  dek: CryptoKey,
  unlockedTagIds: Set<string>,
  privateTagIds: Set<string>,
): Promise<BuildVaultExportResult> {
  const [links, categories, tags] = await Promise.all([
    getLinks(dek),
    getCategories(dek),
    getTags(dek),
  ])

  const categoryNameById = new Map(categories.map(c => [c.id, c.name]))
  const tagNameById = new Map(tags.map(t => [t.id, t.name]))

  const visibleLinks = links.filter(link =>
    link.tags.every(tagId => isTagVisible(privateTagIds.has(tagId), tagId, unlockedTagIds)),
  )
  const hiddenPrivateLinksCount = links.length - visibleLinks.length

  const data: VaultExportV2 = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    mode,
    links: visibleLinks.map(link => ({
      url: link.url,
      title: link.title,
      description: link.description,
      site_name: link.site_name,
      image_url: link.image_url,
      duration: link.duration,
      notes: link.notes,
      status: link.status,
      is_favorite: link.is_favorite,
      created_at: link.created_at,
      updated_at: link.updated_at,
      category: link.category_id ? categoryNameById.get(link.category_id) ?? null : null,
      tags: link.tags.map(id => tagNameById.get(id) ?? id),
    })),
  }

  if (mode === 'everything') {
    const supabase = createClient()
    const [categoryDomains, autoFetchEnabled, accentColors, surfaceFamily, themeMode, moveToEndDelaySeconds, collections] = await Promise.all([
      getAllCategoryDomains(dek),
      getAutoFetchPreference(supabase),
      getAccentColors(supabase),
      getSurfaceFamily(supabase),
      getThemeMode(supabase),
      getMoveToEndDelay(supabase),
      getCollections(dek),
    ])
    // One query per collection; collections are few compared with links.
    const memberships = await Promise.all(collections.map(c => getCollectionMemberships(c.id)))

    // Same visibility rule as links: a locked private tag's definition isn't migrated either.
    const visibleTags = tags.filter(t => isTagVisible(t.is_private, t.id, unlockedTagIds))

    data.categories = categories.map(c => ({
      name: c.name, description: c.description, color: c.color, emoticon: c.emoticon,
    }))
    data.categoryDomains = categoryDomains
      .map(d => ({ domain: d.domain, category: categoryNameById.get(d.category_id) ?? '' }))
      .filter(d => d.category)
    data.tags = visibleTags.map(t => ({ name: t.name, color: t.color, is_private: t.is_private }))
    data.preferences = {
      theme_mode: themeMode,
      accent_color_light: accentColors.light,
      accent_color_dark: accentColors.dark,
      surface_family: surfaceFamily,
      auto_fetch_enabled: autoFetchEnabled,
      move_to_end_delay_seconds: moveToEndDelaySeconds,
    }
    // Only members exported in `links` are listed, so Trash and locked-private links stay out.
    // getCollections is recently-updated-first and memberships come back in position order.
    const urlByLinkId = new Map(visibleLinks.map(link => [link.id, link.url]))
    data.collections = collections.map((c, index) => ({
      name: c.name,
      emoji: c.emoji,
      description: c.description,
      links: memberships[index].flatMap(m => {
        const url = urlByLinkId.get(m.link_id)
        return url === undefined ? [] : [url]
      }),
    }))
  }

  return { data, hiddenPrivateLinksCount }
}
