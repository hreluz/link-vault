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

  describe('move_to_end_delay_seconds in preferences', () => {
    const withDelay = (value: unknown) => makeExport({
      preferences: {
        theme_mode: 'dark', accent_color_light: 'indigo', accent_color_dark: 'violet',
        surface_family: 'slate', auto_fetch_enabled: true, move_to_end_delay_seconds: value,
      },
    })

    it('accepts a value in range', () => {
      expect(getVaultExportValidationError(withDelay(5))).toBeNull()
      expect(getVaultExportValidationError(withDelay(600))).toBeNull()
    })

    it('rejects out-of-range, fractional and non-number values', () => {
      for (const value of [4, 601, 30.5, '30', null]) {
        expect(getVaultExportValidationError(withDelay(value))).toMatch(/move_to_end_delay_seconds/)
      }
    })
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

describe('getVaultExportValidationError — collections', () => {
  const COLLECTION = { name: 'Learn Rust', emoji: '🦀', description: 'Systems', links: ['https://example.com'] }
  const withCollections = (collections: unknown) => makeExport({ mode: 'everything', collections })
  const NAME_ERROR = 'Invalid export file: a collection has an invalid name.'
  const FIELD_ERROR = 'Invalid export file: a collection has an invalid field.'
  const LINKS_ERROR = 'Invalid export file: a collection has invalid links.'

  it('accepts valid collections, with and without emoji/description, and with empty links', () => {
    const data = withCollections([
      COLLECTION,
      { name: 'Plain', emoji: null, description: null, links: [] },
    ])
    expect(getVaultExportValidationError(data)).toBeNull()
  })

  it('accepts a v2 file without collections', () => {
    expect(getVaultExportValidationError(makeExport({ mode: 'everything' }))).toBeNull()
  })

  it('rejects collections that is not a list', () => {
    expect(getVaultExportValidationError(withCollections({}))).toBe('Invalid export file: "collections" must be a list.')
  })

  it.each([
    ['not an object', 'Learn Rust'],
    ['no name', { emoji: null, description: null, links: [] }],
    ['a non-string name', { ...COLLECTION, name: 42 }],
    ['a whitespace-only name', { ...COLLECTION, name: '   ' }],
    ['a 61-character name', { ...COLLECTION, name: 'a'.repeat(61) }],
  ])('rejects an entry with %s', (_label, entry) => {
    expect(getVaultExportValidationError(withCollections([entry]))).toBe(NAME_ERROR)
  })

  it('accepts a 60-character name', () => {
    expect(getVaultExportValidationError(withCollections([{ ...COLLECTION, name: 'a'.repeat(60) }]))).toBeNull()
  })

  it.each([
    ['a non-string emoji', { ...COLLECTION, emoji: 1 }],
    ['a non-string description', { ...COLLECTION, description: 1 }],
    ['a 201-character description', { ...COLLECTION, description: 'a'.repeat(201) }],
  ])('rejects an entry with %s', (_label, entry) => {
    expect(getVaultExportValidationError(withCollections([entry]))).toBe(FIELD_ERROR)
  })

  it('accepts a 200-character description', () => {
    expect(getVaultExportValidationError(withCollections([{ ...COLLECTION, description: 'a'.repeat(200) }]))).toBeNull()
  })

  it.each([
    ['missing links', { name: 'X', emoji: null, description: null }],
    ['links that is not a list', { ...COLLECTION, links: 'https://example.com' }],
    ['links holding a non-string', { ...COLLECTION, links: ['https://example.com', 3] }],
  ])('rejects an entry with %s', (_label, entry) => {
    expect(getVaultExportValidationError(withCollections([entry]))).toBe(LINKS_ERROR)
  })
})
