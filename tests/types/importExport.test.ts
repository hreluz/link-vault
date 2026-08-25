import { describe, it, expect } from 'vitest'
import { getVaultExportValidationError, type VaultExportV2 } from '@/lib/types/importExport'

const VALID_LINK = {
  url: 'https://example.com', title: 'Example', description: null, site_name: 'example.com',
  image_url: null, duration: null, notes: null, status: 'unread', is_favorite: false,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  category: null, tags: ['react'],
}

function makeExport(overrides: Record<string, unknown> = {}): VaultExportV2 {
  return {
    format: 'link-vault-export', version: 2, exportedAt: '2026-01-01T00:00:00Z', mode: 'links',
    links: [VALID_LINK],
    ...overrides,
  } as VaultExportV2
}

describe('getVaultExportValidationError', () => {
  it('accepts a valid "links" mode export', () => {
    expect(getVaultExportValidationError(makeExport())).toBeNull()
  })

  it('accepts a valid "everything" mode export with every optional section present', () => {
    const data = makeExport({
      mode: 'everything',
      categories: [{ name: 'Article', description: 'desc', color: '#000000', emoticon: '📄' }],
      categoryDomains: [{ domain: 'example.com', category: 'Article' }],
      tags: [{ name: 'react', color: '#61dafb', is_private: false }],
      preferences: {
        theme_mode: 'dark', accent_color_light: 'indigo', accent_color_dark: 'violet',
        surface_family: 'slate', auto_fetch_enabled: true,
      },
    })
    expect(getVaultExportValidationError(data)).toBeNull()
  })

  it('accepts nullable link fields explicitly set to null', () => {
    const data = makeExport({ links: [{ ...VALID_LINK, title: null, category: null }] })
    expect(getVaultExportValidationError(data)).toBeNull()
  })

  it('rejects an unknown mode', () => {
    const data = makeExport({ mode: 'bogus' })
    expect(getVaultExportValidationError(data)).toMatch(/mode/i)
  })

  it('rejects when links is not an array', () => {
    const data = makeExport({ links: 'oops' })
    expect(getVaultExportValidationError(data)).toMatch(/"links"/)
  })

  it('rejects a link entry that is not an object', () => {
    const data = makeExport({ links: ['oops'] })
    expect(getVaultExportValidationError(data)).toMatch(/link entry/i)
  })

  it('rejects a link missing its url', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it
    const { url: _url, ...rest } = VALID_LINK
    const data = makeExport({ links: [rest] })
    expect(getVaultExportValidationError(data)).toMatch(/url/i)
  })

  it('rejects a link with a non-nullable-string title', () => {
    const data = makeExport({ links: [{ ...VALID_LINK, title: 123 }] })
    expect(getVaultExportValidationError(data)).toMatch(/title/i)
  })

  it('rejects a link with an invalid status', () => {
    const data = makeExport({ links: [{ ...VALID_LINK, status: 'not-a-status' }] })
    expect(getVaultExportValidationError(data)).toMatch(/status/i)
  })

  it('rejects a link with a non-boolean is_favorite', () => {
    const data = makeExport({ links: [{ ...VALID_LINK, is_favorite: 'yes' }] })
    expect(getVaultExportValidationError(data)).toMatch(/is_favorite/i)
  })

  it('rejects a link missing its timestamps', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it
    const { created_at: _createdAt, ...rest } = VALID_LINK
    const data = makeExport({ links: [rest] })
    expect(getVaultExportValidationError(data)).toMatch(/timestamps/i)
  })

  it('rejects a link with non-array tags', () => {
    const data = makeExport({ links: [{ ...VALID_LINK, tags: 'react' }] })
    expect(getVaultExportValidationError(data)).toMatch(/tags/i)
  })

  it('rejects a link with a non-string entry inside tags', () => {
    const data = makeExport({ links: [{ ...VALID_LINK, tags: ['react', 42] }] })
    expect(getVaultExportValidationError(data)).toMatch(/tags/i)
  })

  it('rejects when categories is present but not an array', () => {
    const data = makeExport({ categories: 'oops' })
    expect(getVaultExportValidationError(data)).toMatch(/"categories"/)
  })

  it('rejects a category missing its name', () => {
    const data = makeExport({ categories: [{ description: null, color: null, emoticon: null }] })
    expect(getVaultExportValidationError(data)).toMatch(/category/i)
  })

  it('rejects a category with an invalid style field', () => {
    const data = makeExport({ categories: [{ name: 'Article', description: null, color: 42, emoticon: null }] })
    expect(getVaultExportValidationError(data)).toMatch(/style/i)
  })

  it('rejects when categoryDomains is present but not an array', () => {
    const data = makeExport({ categoryDomains: 'oops' })
    expect(getVaultExportValidationError(data)).toMatch(/"categoryDomains"/)
  })

  it('rejects a malformed domain rule entry', () => {
    const data = makeExport({ categoryDomains: [{ domain: 'example.com' }] })
    expect(getVaultExportValidationError(data)).toMatch(/domain rule/i)
  })

  it('rejects when tags is present but not an array', () => {
    const data = makeExport({ tags: 'oops' })
    expect(getVaultExportValidationError(data)).toMatch(/"tags"/)
  })

  it('rejects a tag missing its name', () => {
    const data = makeExport({ tags: [{ color: null, is_private: false }] })
    expect(getVaultExportValidationError(data)).toMatch(/tag/i)
  })

  it('rejects a tag with a non-boolean is_private', () => {
    const data = makeExport({ tags: [{ name: 'react', color: null, is_private: 'no' }] })
    expect(getVaultExportValidationError(data)).toMatch(/tag/i)
  })

  it('rejects when preferences is present but not an object', () => {
    const data = makeExport({ preferences: 'oops' })
    expect(getVaultExportValidationError(data)).toMatch(/preferences/i)
  })

  it('rejects an invalid theme_mode in preferences', () => {
    const data = makeExport({
      preferences: {
        theme_mode: 'neon', accent_color_light: 'indigo', accent_color_dark: 'violet',
        surface_family: 'slate', auto_fetch_enabled: true,
      },
    })
    expect(getVaultExportValidationError(data)).toMatch(/theme_mode/i)
  })

  it('rejects a non-boolean auto_fetch_enabled in preferences', () => {
    const data = makeExport({
      preferences: {
        theme_mode: 'dark', accent_color_light: 'indigo', accent_color_dark: 'violet',
        surface_family: 'slate', auto_fetch_enabled: 'yes',
      },
    })
    expect(getVaultExportValidationError(data)).toMatch(/auto_fetch_enabled/i)
  })
})
