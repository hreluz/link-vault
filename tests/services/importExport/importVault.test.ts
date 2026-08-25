import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importVaultExport } from '@/lib/services/importExport/importVault'
import type { VaultExportV2 } from '@/lib/types/importExport'
import type { Category } from '@/lib/services/categories'
import type { TagWithCount } from '@/lib/services/tags/tags'

const {
  mockGetCategories, mockGetOrCreateCategoryByName, mockAddCategoryDomain,
  mockGetTags, mockSyncTagDefinitions,
  mockImportLinks,
  mockSetThemeMode, mockSetAccentColor, mockSetSurfaceFamily, mockSetAutoFetchPreference,
} = vi.hoisted(() => ({
  mockGetCategories: vi.fn(),
  mockGetOrCreateCategoryByName: vi.fn(),
  mockAddCategoryDomain: vi.fn(),
  mockGetTags: vi.fn(),
  mockSyncTagDefinitions: vi.fn(),
  mockImportLinks: vi.fn(),
  mockSetThemeMode: vi.fn(),
  mockSetAccentColor: vi.fn(),
  mockSetSurfaceFamily: vi.fn(),
  mockSetAutoFetchPreference: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({})) }))
vi.mock('@/lib/services/links', () => ({ importLinks: mockImportLinks }))
vi.mock('@/lib/services/categories', () => ({
  getCategories: mockGetCategories,
  getOrCreateCategoryByName: mockGetOrCreateCategoryByName,
}))
vi.mock('@/lib/services/category-domains', () => ({ addCategoryDomain: mockAddCategoryDomain }))
vi.mock('@/lib/services/userPreferences', () => ({
  setThemeMode: mockSetThemeMode,
  setAccentColor: mockSetAccentColor,
  setSurfaceFamily: mockSetSurfaceFamily,
  setAutoFetchPreference: mockSetAutoFetchPreference,
}))
// toKebabCase is pure logic under test elsewhere -- keep the real implementation here.
vi.mock('@/lib/services/tags/tags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/tags/tags')>()
  return { ...actual, getTags: mockGetTags, syncTagDefinitions: mockSyncTagDefinitions }
})

const FAKE_DEK = {} as CryptoKey

function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 'cat-1', user_id: 'u1', name: 'Article', description: null, color: null, emoticon: null, created_at: '', updated_at: '', ...overrides }
}

function makeTag(overrides: Partial<TagWithCount> = {}): TagWithCount {
  return { id: 't1', user_id: 'u1', name: 'react', color: null, is_private: false, created_at: '', link_count: 0, ...overrides }
}

function makeExport(overrides: Partial<VaultExportV2> = {}): VaultExportV2 {
  return {
    format: 'link-vault-export', version: 2, exportedAt: '2026-01-01T00:00:00Z', mode: 'everything',
    links: [{
      url: 'https://example.com', title: 'Example', description: null, site_name: 'example.com',
      image_url: null, duration: null, notes: null, status: 'unread', is_favorite: false,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', category: null, tags: [],
    }],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCategories.mockResolvedValue([])
  mockGetTags.mockResolvedValue([])
  mockGetOrCreateCategoryByName.mockImplementation(async (name: string) => `id-${name}`)
  mockAddCategoryDomain.mockResolvedValue({ data: { id: 'd1', category_id: 'cat-1', user_id: 'u1', domain: 'x.com', created_at: '' }, error: null })
  mockSyncTagDefinitions.mockResolvedValue(['t1'])
  mockImportLinks.mockResolvedValue({ imported: 1, skipped: 0, duplicates: 0 })
})

describe('importVaultExport', () => {
  it('delegates link insertion to importLinks with the resolved default category', async () => {
    const result = await importVaultExport(makeExport(), { defaultCategoryId: 'cat-default', applyPreferences: false }, FAKE_DEK)

    expect(mockImportLinks).toHaveBeenCalledWith(expect.any(Array), 'cat-default', FAKE_DEK)
    expect(result.imported).toBe(1)
  })

  it('passes each link\'s created_at and updated_at through to importLinks', async () => {
    await importVaultExport(makeExport(), { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK)

    expect(mockImportLinks).toHaveBeenCalledWith(
      [expect.objectContaining({ created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })],
      null,
      FAKE_DEK,
    )
  })

  describe('categories', () => {
    it('creates a category from the categories section with its style', async () => {
      await importVaultExport(
        makeExport({ categories: [{ name: 'Article', description: 'Blog posts', color: '#3B82F6', emoticon: '📄' }] }),
        { defaultCategoryId: null, applyPreferences: false },
        FAKE_DEK,
      )

      expect(mockGetOrCreateCategoryByName).toHaveBeenCalledWith(
        'Article', FAKE_DEK, { description: 'Blog posts', color: '#3B82F6', emoticon: '📄' },
      )
    })

    it('resolves a link\'s category name even with no categories section', async () => {
      const data = makeExport({
        categories: undefined,
        links: [{ ...makeExport().links[0], category: 'Video' }],
      })

      await importVaultExport(data, { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK)

      expect(mockGetOrCreateCategoryByName).toHaveBeenCalledWith('Video', FAKE_DEK, undefined)
    })

    it('counts a category as created only when its name did not already exist', async () => {
      mockGetCategories.mockResolvedValue([makeCategory({ name: 'Existing' })])

      const result = await importVaultExport(
        makeExport({ categories: [{ name: 'Existing', description: null, color: null, emoticon: null }, { name: 'New', description: null, color: null, emoticon: null }] }),
        { defaultCategoryId: null, applyPreferences: false },
        FAKE_DEK,
      )

      expect(result.categoriesCreated).toBe(1)
    })

    it('resolves a link\'s category_id via the resolved category map', async () => {
      mockGetOrCreateCategoryByName.mockResolvedValue('cat-resolved')
      const data = makeExport({ links: [{ ...makeExport().links[0], category: 'Article' }] })

      await importVaultExport(data, { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK)

      expect(mockImportLinks).toHaveBeenCalledWith(
        [expect.objectContaining({ category_id: 'cat-resolved' })],
        null,
        FAKE_DEK,
      )
    })
  })

  describe('domains', () => {
    it('creates a domain rule resolved against the category name', async () => {
      mockGetOrCreateCategoryByName.mockResolvedValue('cat-1')

      const result = await importVaultExport(
        makeExport({
          categories: [{ name: 'Article', description: null, color: null, emoticon: null }],
          categoryDomains: [{ domain: 'example.com', category: 'Article' }],
        }),
        { defaultCategoryId: null, applyPreferences: false },
        FAKE_DEK,
      )

      expect(mockAddCategoryDomain).toHaveBeenCalledWith('cat-1', 'example.com', FAKE_DEK)
      expect(result.domainsCreated).toBe(1)
    })

    it('skips a domain rule whose category never resolved', async () => {
      const result = await importVaultExport(
        makeExport({ categoryDomains: [{ domain: 'example.com', category: 'Nonexistent' }] }),
        { defaultCategoryId: null, applyPreferences: false },
        FAKE_DEK,
      )

      expect(mockAddCategoryDomain).not.toHaveBeenCalled()
      expect(result.domainsCreated).toBe(0)
    })

    it('does not count an idempotent re-import (domain_taken) as created', async () => {
      mockGetOrCreateCategoryByName.mockResolvedValue('cat-1')
      mockAddCategoryDomain.mockResolvedValue({ data: null, error: 'domain_taken' })

      const result = await importVaultExport(
        makeExport({
          categories: [{ name: 'Article', description: null, color: null, emoticon: null }],
          categoryDomains: [{ domain: 'example.com', category: 'Article' }],
        }),
        { defaultCategoryId: null, applyPreferences: false },
        FAKE_DEK,
      )

      expect(result.domainsCreated).toBe(0)
    })
  })

  describe('tags', () => {
    it('pre-creates tag definitions with color/privacy before importing links', async () => {
      const data = makeExport({ tags: [{ name: 'secret', color: '#000', is_private: true }] })

      await importVaultExport(data, { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK)

      expect(mockSyncTagDefinitions).toHaveBeenCalledWith(data.tags, FAKE_DEK)
    })

    it('counts a tag as created only when its kebab name did not already exist', async () => {
      mockGetTags.mockResolvedValue([makeTag({ name: 'existing' })])

      const result = await importVaultExport(
        makeExport({ tags: [{ name: 'existing', color: null, is_private: false }, { name: 'New Tag', color: null, is_private: false }] }),
        { defaultCategoryId: null, applyPreferences: false },
        FAKE_DEK,
      )

      expect(result.tagsCreated).toBe(1)
    })

    it('does not call syncTagDefinitions when there is no tags section', async () => {
      await importVaultExport(makeExport({ tags: undefined }), { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK)

      expect(mockSyncTagDefinitions).not.toHaveBeenCalled()
    })
  })

  describe('preferences', () => {
    const PREFS = {
      theme_mode: 'dark' as const, accent_color_light: 'indigo', accent_color_dark: 'violet',
      surface_family: 'slate', auto_fetch_enabled: true,
    }

    it('applies preferences when opted in on an "everything" export', async () => {
      await importVaultExport(
        makeExport({ mode: 'everything', preferences: PREFS }),
        { defaultCategoryId: null, applyPreferences: true },
        FAKE_DEK,
      )

      expect(mockSetThemeMode).toHaveBeenCalledWith(expect.anything(), 'dark')
      expect(mockSetAccentColor).toHaveBeenCalledWith(expect.anything(), 'light', 'indigo')
      expect(mockSetAccentColor).toHaveBeenCalledWith(expect.anything(), 'dark', 'violet')
      expect(mockSetSurfaceFamily).toHaveBeenCalledWith(expect.anything(), 'slate')
      expect(mockSetAutoFetchPreference).toHaveBeenCalledWith(expect.anything(), true)
    })

    it('does not apply preferences when not opted in', async () => {
      await importVaultExport(
        makeExport({ mode: 'everything', preferences: PREFS }),
        { defaultCategoryId: null, applyPreferences: false },
        FAKE_DEK,
      )

      expect(mockSetThemeMode).not.toHaveBeenCalled()
    })

    it('does not apply preferences on a "links" mode export even if requested', async () => {
      await importVaultExport(
        makeExport({ mode: 'links', preferences: PREFS }),
        { defaultCategoryId: null, applyPreferences: true },
        FAKE_DEK,
      )

      expect(mockSetThemeMode).not.toHaveBeenCalled()
    })

    it('does not throw when applyPreferences is true but there is no preferences block', async () => {
      await expect(importVaultExport(
        makeExport({ mode: 'everything', preferences: undefined }),
        { defaultCategoryId: null, applyPreferences: true },
        FAKE_DEK,
      )).resolves.toBeDefined()
      expect(mockSetThemeMode).not.toHaveBeenCalled()
    })
  })
})
