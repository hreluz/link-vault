import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildVaultExport } from '@/lib/services/importExport/exportVault'
import type { LinkWithTags } from '@/lib/services/links'
import type { Category } from '@/lib/services/categories'
import type { TagWithCount } from '@/lib/services/tags/tags'
import type { CategoryDomain } from '@/lib/services/category-domains'

const {
  mockGetLinks, mockGetCategories, mockGetAllCategoryDomains, mockGetTags,
  mockGetAutoFetchPreference, mockGetAccentColors, mockGetSurfaceFamily, mockGetThemeMode,
} = vi.hoisted(() => ({
  mockGetLinks: vi.fn(),
  mockGetCategories: vi.fn(),
  mockGetAllCategoryDomains: vi.fn(),
  mockGetTags: vi.fn(),
  mockGetAutoFetchPreference: vi.fn(),
  mockGetAccentColors: vi.fn(),
  mockGetSurfaceFamily: vi.fn(),
  mockGetThemeMode: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({})) }))
vi.mock('@/lib/services/links', () => ({ getLinks: mockGetLinks }))
vi.mock('@/lib/services/categories', () => ({ getCategories: mockGetCategories }))
vi.mock('@/lib/services/category-domains', () => ({ getAllCategoryDomains: mockGetAllCategoryDomains }))
vi.mock('@/lib/services/userPreferences', () => ({
  getAutoFetchPreference: mockGetAutoFetchPreference,
  getAccentColors: mockGetAccentColors,
  getSurfaceFamily: mockGetSurfaceFamily,
  getThemeMode: mockGetThemeMode,
}))
// isTagVisible is pure logic under test elsewhere -- keep the real implementation here.
vi.mock('@/lib/services/tags/tags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/tags/tags')>()
  return { ...actual, getTags: mockGetTags }
})

const FAKE_DEK = {} as CryptoKey

const CATEGORY: Category = {
  id: 'cat-1', user_id: 'u1', name: 'Article', description: 'Blog posts', color: '#3B82F6', emoticon: '📄',
  created_at: '', updated_at: '',
}

function makeTag(overrides: Partial<TagWithCount> = {}): TagWithCount {
  return { id: 't1', user_id: 'u1', name: 'react', color: null, is_private: false, created_at: '', link_count: 0, ...overrides }
}

function makeLink(overrides: Partial<LinkWithTags> = {}): LinkWithTags {
  return {
    id: 'l1', user_id: 'u1', url: 'https://example.com', title: 'Example',
    description: null, site_name: 'example.com', image_url: null, duration: null, notes: null,
    category_id: 'cat-1', status: 'unread', is_favorite: false,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
    tags: [], ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLinks.mockResolvedValue([])
  mockGetCategories.mockResolvedValue([])
  mockGetTags.mockResolvedValue([])
  mockGetAllCategoryDomains.mockResolvedValue([])
  mockGetAutoFetchPreference.mockResolvedValue(true)
  mockGetAccentColors.mockResolvedValue({ light: 'indigo', dark: 'violet' })
  mockGetSurfaceFamily.mockResolvedValue('slate')
  mockGetThemeMode.mockResolvedValue('dark')
})

describe('buildVaultExport', () => {
  it('stamps the export format, version, and requested mode', async () => {
    const { data } = await buildVaultExport('links', FAKE_DEK, new Set(), new Set())

    expect(data.format).toBe('link-vault-export')
    expect(data.version).toBe(2)
    expect(data.mode).toBe('links')
  })

  it('resolves each link category_id to its name', async () => {
    mockGetCategories.mockResolvedValue([CATEGORY])
    mockGetLinks.mockResolvedValue([makeLink({ category_id: 'cat-1' })])

    const { data } = await buildVaultExport('links', FAKE_DEK, new Set(), new Set())

    expect(data.links[0].category).toBe('Article')
  })

  it('sets category to null when the link has no category', async () => {
    mockGetLinks.mockResolvedValue([makeLink({ category_id: null })])

    const { data } = await buildVaultExport('links', FAKE_DEK, new Set(), new Set())

    expect(data.links[0].category).toBeNull()
  })

  it('resolves tag ids to names', async () => {
    mockGetTags.mockResolvedValue([makeTag({ id: 't1', name: 'react' })])
    mockGetLinks.mockResolvedValue([makeLink({ tags: ['t1'] })])

    const { data } = await buildVaultExport('links', FAKE_DEK, new Set(), new Set())

    expect(data.links[0].tags).toEqual(['react'])
  })

  it('carries every per-link field through in "links" mode', async () => {
    mockGetLinks.mockResolvedValue([makeLink({
      title: 'T', description: 'D', site_name: 'S', image_url: 'I', duration: '4:33', notes: 'N',
      status: 'read', is_favorite: true,
    })])

    const { data } = await buildVaultExport('links', FAKE_DEK, new Set(), new Set())

    expect(data.links[0]).toEqual(expect.objectContaining({
      title: 'T', description: 'D', site_name: 'S', image_url: 'I', duration: '4:33', notes: 'N',
      status: 'read', is_favorite: true,
    }))
  })

  it('omits categories/categoryDomains/tags/preferences in "links" mode', async () => {
    const { data } = await buildVaultExport('links', FAKE_DEK, new Set(), new Set())

    expect(data.categories).toBeUndefined()
    expect(data.categoryDomains).toBeUndefined()
    expect(data.tags).toBeUndefined()
    expect(data.preferences).toBeUndefined()
  })

  describe('"everything" mode extras', () => {
    it('includes category style, domain rules, tag colors, and preferences', async () => {
      mockGetCategories.mockResolvedValue([CATEGORY])
      mockGetAllCategoryDomains.mockResolvedValue([
        { id: 'd1', category_id: 'cat-1', user_id: 'u1', domain: 'example.com', created_at: '' } satisfies CategoryDomain,
      ])
      mockGetTags.mockResolvedValue([makeTag({ id: 't1', name: 'react', color: '#61dafb' })])

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set())

      expect(data.categories).toEqual([{ name: 'Article', description: 'Blog posts', color: '#3B82F6', emoticon: '📄' }])
      expect(data.categoryDomains).toEqual([{ domain: 'example.com', category: 'Article' }])
      expect(data.tags).toEqual([{ name: 'react', color: '#61dafb', is_private: false }])
      expect(data.preferences).toEqual({
        theme_mode: 'dark', accent_color_light: 'indigo', accent_color_dark: 'violet',
        surface_family: 'slate', auto_fetch_enabled: true,
      })
    })

    it('drops a domain rule whose category no longer resolves to a name', async () => {
      mockGetCategories.mockResolvedValue([])
      mockGetAllCategoryDomains.mockResolvedValue([
        { id: 'd1', category_id: 'missing-cat', user_id: 'u1', domain: 'example.com', created_at: '' } satisfies CategoryDomain,
      ])

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set())

      expect(data.categoryDomains).toEqual([])
    })
  })

  describe('locked private tags', () => {
    it('excludes a link that carries a locked private tag', async () => {
      mockGetTags.mockResolvedValue([makeTag({ id: 'secret', name: 'secret', is_private: true })])
      mockGetLinks.mockResolvedValue([
        makeLink({ id: 'l1', tags: ['secret'] }),
        makeLink({ id: 'l2', tags: [] }),
      ])

      const { data, hiddenPrivateLinksCount } = await buildVaultExport('links', FAKE_DEK, new Set(), new Set(['secret']))

      expect(data.links.map(l => l.url)).toHaveLength(1)
      expect(hiddenPrivateLinksCount).toBe(1)
    })

    it('includes the link once its private tag is unlocked', async () => {
      mockGetTags.mockResolvedValue([makeTag({ id: 'secret', name: 'secret', is_private: true })])
      mockGetLinks.mockResolvedValue([makeLink({ id: 'l1', tags: ['secret'] })])

      const { data, hiddenPrivateLinksCount } = await buildVaultExport(
        'links', FAKE_DEK, new Set(['secret']), new Set(['secret']),
      )

      expect(data.links).toHaveLength(1)
      expect(hiddenPrivateLinksCount).toBe(0)
    })

    it('excludes a locked private tag\'s own definition from "everything" mode', async () => {
      mockGetTags.mockResolvedValue([
        makeTag({ id: 'secret', name: 'secret', is_private: true }),
        makeTag({ id: 'public', name: 'public', is_private: false }),
      ])

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set(['secret']))

      expect(data.tags).toEqual([{ name: 'public', color: null, is_private: false }])
    })

    it('includes the private tag definition once unlocked', async () => {
      mockGetTags.mockResolvedValue([makeTag({ id: 'secret', name: 'secret', is_private: true })])

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(['secret']), new Set(['secret']))

      expect(data.tags).toEqual([{ name: 'secret', color: null, is_private: true }])
    })
  })
})
