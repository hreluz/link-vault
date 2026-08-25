import type { AccentColor, LinkStatus, SurfaceFamily, ThemeMode } from '@/lib/types/database'

export const EXPORT_FORMAT = 'link-vault-export' as const
export const EXPORT_VERSION = 2 as const

export type ExportMode = 'links' | 'everything'

export type ExportedLink = {
  url: string
  title: string | null
  description: string | null
  site_name: string | null
  image_url: string | null
  duration: string | null
  notes: string | null
  status: LinkStatus
  is_favorite: boolean
  created_at: string
  updated_at: string
  category: string | null
  tags: string[]
}

export type ExportedCategory = {
  name: string
  description: string | null
  color: string | null
  emoticon: string | null
}

export type ExportedCategoryDomain = {
  domain: string
  category: string
}

export type ExportedTag = {
  name: string
  color: string | null
  is_private: boolean
}

export type ExportedPreferences = {
  theme_mode: ThemeMode
  accent_color_light: AccentColor
  accent_color_dark: AccentColor
  surface_family: SurfaceFamily
  auto_fetch_enabled: boolean
}

export type VaultExportV2 = {
  format: typeof EXPORT_FORMAT
  version: typeof EXPORT_VERSION
  exportedAt: string
  mode: ExportMode
  links: ExportedLink[]
  categories?: ExportedCategory[]
  categoryDomains?: ExportedCategoryDomain[]
  tags?: ExportedTag[]
  preferences?: ExportedPreferences
}

/** Sniffs a parsed JSON value for the v2 full-vault export shape, as opposed to a legacy bare-array export. */
export function isVaultExportV2(data: unknown): data is VaultExportV2 {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  return (
    record.format === EXPORT_FORMAT &&
    record.version === EXPORT_VERSION &&
    Array.isArray(record.links)
  )
}

const LINK_STATUSES = ['unread', 'watching', 'read', 'archived'] as const
const THEME_MODES = ['light', 'dark', 'system'] as const

function isString(v: unknown): v is string { return typeof v === 'string' }
function isNullableString(v: unknown): v is string | null { return v === null || typeof v === 'string' }
function isBoolean(v: unknown): v is boolean { return typeof v === 'boolean' }
function isStringArray(v: unknown): v is string[] { return Array.isArray(v) && v.every(isString) }
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Deep-validates a value `isVaultExportV2` already confirmed is v2-shaped at the top
 * level, so a hand-edited or corrupted "everything" file fails here with an actionable
 * message instead of throwing deep inside `importVaultExport` after some categories/tags
 * may have already been created. Returns the first problem found, or null if the export
 * is well-formed enough to safely process.
 */
export function getVaultExportValidationError(data: VaultExportV2): string | null {
  if (data.mode !== 'links' && data.mode !== 'everything') {
    return 'Invalid export file: unknown export mode.'
  }
  if (!Array.isArray(data.links)) {
    return 'Invalid export file: "links" must be a list.'
  }
  for (const link of data.links) {
    if (!isPlainObject(link)) return 'Invalid export file: a link entry is malformed.'
    if (!isString(link.url)) return 'Invalid export file: a link is missing its url.'
    if (!isNullableString(link.title)) return 'Invalid export file: a link has an invalid title.'
    if (!isNullableString(link.description)) return 'Invalid export file: a link has an invalid description.'
    if (!isNullableString(link.site_name)) return 'Invalid export file: a link has an invalid site_name.'
    if (!isNullableString(link.image_url)) return 'Invalid export file: a link has an invalid image_url.'
    if (!isNullableString(link.duration)) return 'Invalid export file: a link has an invalid duration.'
    if (!isNullableString(link.notes)) return 'Invalid export file: a link has an invalid notes value.'
    if (!isString(link.status) || !(LINK_STATUSES as readonly string[]).includes(link.status)) {
      return 'Invalid export file: a link has an invalid status.'
    }
    if (!isBoolean(link.is_favorite)) return 'Invalid export file: a link has an invalid is_favorite value.'
    if (!isString(link.created_at) || !isString(link.updated_at)) {
      return 'Invalid export file: a link is missing its timestamps.'
    }
    if (!isNullableString(link.category)) return 'Invalid export file: a link has an invalid category.'
    if (!isStringArray(link.tags)) return 'Invalid export file: a link has invalid tags.'
  }

  if (data.categories !== undefined) {
    if (!Array.isArray(data.categories)) return 'Invalid export file: "categories" must be a list.'
    for (const c of data.categories) {
      if (!isPlainObject(c) || !isString(c.name)) return 'Invalid export file: a category is missing its name.'
      if (!isNullableString(c.description) || !isNullableString(c.color) || !isNullableString(c.emoticon)) {
        return 'Invalid export file: a category has an invalid style field.'
      }
    }
  }

  if (data.categoryDomains !== undefined) {
    if (!Array.isArray(data.categoryDomains)) return 'Invalid export file: "categoryDomains" must be a list.'
    for (const d of data.categoryDomains) {
      if (!isPlainObject(d) || !isString(d.domain) || !isString(d.category)) {
        return 'Invalid export file: a domain rule is malformed.'
      }
    }
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) return 'Invalid export file: "tags" must be a list.'
    for (const t of data.tags) {
      if (!isPlainObject(t) || !isString(t.name)) return 'Invalid export file: a tag is missing its name.'
      if (!isNullableString(t.color) || !isBoolean(t.is_private)) {
        return 'Invalid export file: a tag has an invalid field.'
      }
    }
  }

  if (data.preferences !== undefined) {
    const p = data.preferences
    if (!isPlainObject(p)) return 'Invalid export file: "preferences" is malformed.'
    if (!isString(p.theme_mode) || !(THEME_MODES as readonly string[]).includes(p.theme_mode)) {
      return 'Invalid export file: invalid theme_mode in preferences.'
    }
    if (!isString(p.accent_color_light) || !isString(p.accent_color_dark) || !isString(p.surface_family)) {
      return 'Invalid export file: invalid preferences fields.'
    }
    if (!isBoolean(p.auto_fetch_enabled)) return 'Invalid export file: invalid auto_fetch_enabled in preferences.'
  }

  return null
}
