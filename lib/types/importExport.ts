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
