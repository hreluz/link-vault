import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildVaultExport } from '@/lib/services/importExport/exportVault'
import type { LinkWithTags } from '@/lib/services/links'
import type { Category } from '@/lib/services/categories'
import type { TagWithCount } from '@/lib/services/tags/tags'
import type { CategoryDomain } from '@/lib/services/category-domains'

const {
  mockGetLinks, mockGetCategories, mockGetAllCategoryDomains, mockGetTags,
  mockGetAutoFetchPreference, mockGetAccentColors, mockGetSurfaceFamily, mockGetThemeMode, mockGetMoveToEndDelay,
  mockGetCollections, mockGetCollectionMemberships,
} = vi.hoisted(() => ({
  mockGetCollections: vi.fn(),
  mockGetCollectionMemberships: vi.fn(),
  mockGetLinks: vi.fn(),
  mockGetCategories: vi.fn(),
  mockGetAllCategoryDomains: vi.fn(),
  mockGetTags: vi.fn(),
  mockGetAutoFetchPreference: vi.fn(),
  mockGetAccentColors: vi.fn(),
  mockGetSurfaceFamily: vi.fn(),
  mockGetThemeMode: vi.fn(),
  mockGetMoveToEndDelay: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({})) }))
vi.mock('@/lib/services/links', () => ({ getLinks: mockGetLinks }))
vi.mock('@/lib/services/categories', () => ({ getCategories: mockGetCategories }))
vi.mock('@/lib/services/collections', () => ({
  getCollections: mockGetCollections,
  getCollectionMemberships: mockGetCollectionMemberships,
}))
vi.mock('@/lib/services/category-domains', () => ({ getAllCategoryDomains: mockGetAllCategoryDomains }))
vi.mock('@/lib/services/userPreferences', () => ({
  getAutoFetchPreference: mockGetAutoFetchPreference,
  getAccentColors: mockGetAccentColors,
  getSurfaceFamily: mockGetSurfaceFamily,
  getThemeMode: mockGetThemeMode,
  getMoveToEndDelay: mockGetMoveToEndDelay,
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
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, moved_to_end_at: null,
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
  mockGetMoveToEndDelay.mockResolvedValue(45)
  mockGetAccentColors.mockResolvedValue({ light: 'indigo', dark: 'violet' })
  mockGetSurfaceFamily.mockResolvedValue('slate')
  mockGetThemeMode.mockResolvedValue('dark')
  mockGetCollections.mockResolvedValue([])
  mockGetCollectionMemberships.mockResolvedValue([])
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
        surface_family: 'slate', auto_fetch_enabled: true, move_to_end_delay_seconds: 45,
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

  describe('collections ("everything" mode)', () => {
    function makeCollection(id: string, name: string, extra: Record<string, unknown> = {}) {
      return { id, user_id: 'u1', name, emoji: null, description: null, created_at: '', updated_at: '', ...extra }
    }
    function membership(collectionId: string, linkId: string, position: number) {
      return { collection_id: collectionId, link_id: linkId, position, added_at: '2026-01-01T00:00:00Z' }
    }
    function setMemberships(byCollection: Record<string, ReturnType<typeof membership>[]>) {
      mockGetCollectionMemberships.mockImplementation(async (id: string) => byCollection[id] ?? [])
    }
    const LINKS = [
      makeLink({ id: 'l1', url: 'https://one.example' }),
      makeLink({ id: 'l2', url: 'https://two.example' }),
      makeLink({ id: 'l3', url: 'https://three.example' }),
    ]

    it('lists every collection in getCollections order, with its style fields', async () => {
      mockGetLinks.mockResolvedValue(LINKS)
      mockGetCollections.mockResolvedValue([
        makeCollection('c2', 'Newer', { emoji: '🦀', description: 'Systems' }),
        makeCollection('c1', 'Older'),
      ])
      setMemberships({ c2: [membership('c2', 'l1', 1)], c1: [membership('c1', 'l2', 1)] })

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set())

      expect(data.collections).toEqual([
        { name: 'Newer', emoji: '🦀', description: 'Systems', links: ['https://one.example'] },
        { name: 'Older', emoji: null, description: null, links: ['https://two.example'] },
      ])
    })

    it('lists member URLs in the order getCollectionMemberships returns (position order)', async () => {
      mockGetLinks.mockResolvedValue(LINKS)
      mockGetCollections.mockResolvedValue([makeCollection('c1', 'Mixed')])
      setMemberships({ c1: [membership('c1', 'l3', 1), membership('c1', 'l1', 2), membership('c1', 'l2', 3)] })

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set())

      expect(data.collections?.[0].links).toEqual(['https://three.example', 'https://one.example', 'https://two.example'])
    })

    it('exports an empty collection with links: []', async () => {
      mockGetCollections.mockResolvedValue([makeCollection('c1', 'Empty')])

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set())

      expect(data.collections).toEqual([{ name: 'Empty', emoji: null, description: null, links: [] }])
    })

    it('leaves out a member that is in Trash (not returned by getLinks)', async () => {
      mockGetLinks.mockResolvedValue([LINKS[0]])
      mockGetCollections.mockResolvedValue([makeCollection('c1', 'Some')])
      setMemberships({ c1: [membership('c1', 'l1', 1), membership('c1', 'trashed', 2)] })

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set())

      expect(data.collections?.[0].links).toEqual(['https://one.example'])
    })

    it('leaves out a member with a locked private tag, and lists it once unlocked', async () => {
      mockGetLinks.mockResolvedValue([LINKS[0], makeLink({ id: 'l2', url: 'https://two.example', tags: ['secret'] })])
      mockGetCollections.mockResolvedValue([makeCollection('c1', 'Some')])
      setMemberships({ c1: [membership('c1', 'l1', 1), membership('c1', 'l2', 2)] })

      const locked = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set(['secret']))
      expect(locked.data.collections?.[0].links).toEqual(['https://one.example'])

      const unlocked = await buildVaultExport('everything', FAKE_DEK, new Set(['secret']), new Set(['secret']))
      expect(unlocked.data.collections?.[0].links).toEqual(['https://one.example', 'https://two.example'])
    })

    it('still exports a collection whose members are all left out, with links: []', async () => {
      mockGetCollections.mockResolvedValue([makeCollection('c1', 'Hidden')])
      setMemberships({ c1: [membership('c1', 'gone', 1)] })

      const { data } = await buildVaultExport('everything', FAKE_DEK, new Set(), new Set())

      expect(data.collections).toEqual([{ name: 'Hidden', emoji: null, description: null, links: [] }])
    })

    it('has no collections key in "links" mode and never loads collections', async () => {
      const { data } = await buildVaultExport('links', FAKE_DEK, new Set(), new Set())

      expect(data).not.toHaveProperty('collections')
      expect(mockGetCollections).not.toHaveBeenCalled()
    })
  })
})
