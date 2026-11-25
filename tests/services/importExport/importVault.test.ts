import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importVaultExport, type VaultImportProgress } from '@/lib/services/importExport/importVault'
import type { VaultExportV2 } from '@/lib/types/importExport'
import type { Category } from '@/lib/services/categories'
import type { TagWithCount } from '@/lib/services/tags/tags'

const {
  mockGetCategories, mockGetOrCreateCategoryByName, mockAddCategoryDomain,
  mockGetTags, mockSyncTagDefinitions,
  mockImportLinks,
  mockSetThemeMode, mockSetAccentColor, mockSetSurfaceFamily, mockSetAutoFetchPreference, mockSetMoveToEndDelay,
  mockGetCollections, mockCreateCollection, mockGetCollectionMemberships, mockAddLinksToCollection,
} = vi.hoisted(() => ({
  mockGetCollections: vi.fn(),
  mockCreateCollection: vi.fn(),
  mockGetCollectionMemberships: vi.fn(),
  mockAddLinksToCollection: vi.fn(),
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
  mockSetMoveToEndDelay: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({})) }))
vi.mock('@/lib/services/links', () => ({ importLinks: mockImportLinks }))
vi.mock('@/lib/services/categories', () => ({
  getCategories: mockGetCategories,
  getOrCreateCategoryByName: mockGetOrCreateCategoryByName,
}))
vi.mock('@/lib/services/collections', () => ({
  getCollections: mockGetCollections,
  createCollection: mockCreateCollection,
  getCollectionMemberships: mockGetCollectionMemberships,
  addLinksToCollection: mockAddLinksToCollection,
}))
vi.mock('@/lib/services/category-domains', () => ({ addCategoryDomain: mockAddCategoryDomain }))
vi.mock('@/lib/services/userPreferences', () => ({
  setThemeMode: mockSetThemeMode,
  setAccentColor: mockSetAccentColor,
  setSurfaceFamily: mockSetSurfaceFamily,
  setAutoFetchPreference: mockSetAutoFetchPreference,
  setMoveToEndDelay: mockSetMoveToEndDelay,
  validateMoveToEndDelay: () => null,
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
  mockImportLinks.mockResolvedValue({ imported: 1, skipped: 0, duplicates: 0, failures: [] })
  mockSetThemeMode.mockResolvedValue({ success: true })
  mockSetAccentColor.mockResolvedValue({ success: true })
  mockSetSurfaceFamily.mockResolvedValue({ success: true })
  mockSetAutoFetchPreference.mockResolvedValue({ success: true })
  mockSetMoveToEndDelay.mockResolvedValue({ success: true })
  mockGetCollections.mockResolvedValue([])
  mockCreateCollection.mockImplementation(async (input: { name: string }) => ({
    data: { id: `col-${input.name}`, name: input.name }, error: null,
  }))
  mockGetCollectionMemberships.mockResolvedValue([])
  mockAddLinksToCollection.mockImplementation(async (_id: string, ids: string[]) => ids.map(() => ({})))
})

describe('importVaultExport', () => {
  it('delegates link insertion to importLinks with the resolved default category', async () => {
    const result = await importVaultExport(makeExport(), { defaultCategoryId: 'cat-default', applyPreferences: false }, FAKE_DEK)

    expect(mockImportLinks).toHaveBeenCalledWith(expect.any(Array), 'cat-default', FAKE_DEK, { onProgress: expect.any(Function) })
    expect(result.imported).toBe(1)
  })

  it('does not ask importLinks to fill missing titles from the url, so a restore keeps null titles', async () => {
    await importVaultExport(makeExport(), { defaultCategoryId: 'cat-default', applyPreferences: false }, FAKE_DEK)

    expect(mockImportLinks.mock.calls[0][3]).not.toHaveProperty('titleFromUrl')
  })

  it('reports created categories and tags through onCreate and forwards it to importLinks', async () => {
    mockGetOrCreateCategoryByName.mockImplementation(
      async (name: string, _dek: CryptoKey, _style: unknown, onCreate?: (id: string) => void) => {
        onCreate?.(`id-${name}`)
        return `id-${name}`
      },
    )
    mockSyncTagDefinitions.mockImplementation(async (_defs: unknown, _dek: CryptoKey, onCreate?: (id: string) => void) => {
      onCreate?.('tag-new')
      return ['tag-new']
    })
    const onCreate = vi.fn()
    const data = makeExport({
      categories: [{ name: 'Article', description: null, color: null, emoticon: null }],
      tags: [{ name: 'secret', color: null, is_private: true }],
    })

    await importVaultExport(data, { defaultCategoryId: null, applyPreferences: false, onCreate }, FAKE_DEK)

    expect(onCreate).toHaveBeenCalledWith('category', 'id-Article')
    expect(onCreate).toHaveBeenCalledWith('tag', 'tag-new')
    expect(mockImportLinks.mock.calls[0][3].onCreate).toBe(onCreate)
  })

  it('throws a descriptive error and never touches the DB when the export is malformed', async () => {
    // Cast through unknown: the whole point is testing a runtime shape TS wouldn't allow.
    const malformed = makeExport({ categories: 'oops' as unknown as never })

    await expect(
      importVaultExport(malformed, { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK),
    ).rejects.toThrow(/"categories"/)
    expect(mockGetCategories).not.toHaveBeenCalled()
    expect(mockImportLinks).not.toHaveBeenCalled()
  })

  it('passes each link\'s created_at and updated_at through to importLinks', async () => {
    await importVaultExport(makeExport(), { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK)

    expect(mockImportLinks).toHaveBeenCalledWith(
      [expect.objectContaining({ created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })],
      null,
      FAKE_DEK,
      { onProgress: expect.any(Function) },
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
        'Article', FAKE_DEK, { description: 'Blog posts', color: '#3B82F6', emoticon: '📄' }, undefined,
      )
    })

    it('resolves a link\'s category name even with no categories section', async () => {
      const data = makeExport({
        categories: undefined,
        links: [{ ...makeExport().links[0], category: 'Video' }],
      })

      await importVaultExport(data, { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK)

      expect(mockGetOrCreateCategoryByName).toHaveBeenCalledWith('Video', FAKE_DEK, undefined, undefined)
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
        { onProgress: expect.any(Function) },
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
      expect(result.domainsFailed).toBe(0)
    })

    it('counts a real domain rule failure separately from an idempotent skip', async () => {
      mockGetOrCreateCategoryByName.mockResolvedValue('cat-1')
      mockAddCategoryDomain.mockResolvedValue({ data: null, error: 'invalid_domain' })

      const result = await importVaultExport(
        makeExport({
          categories: [{ name: 'Article', description: null, color: null, emoticon: null }],
          categoryDomains: [{ domain: 'not a domain', category: 'Article' }],
        }),
        { defaultCategoryId: null, applyPreferences: false },
        FAKE_DEK,
      )

      expect(result.domainsCreated).toBe(0)
      expect(result.domainsFailed).toBe(1)
    })
  })

  describe('tags', () => {
    it('pre-creates tag definitions with color/privacy before importing links', async () => {
      const data = makeExport({ tags: [{ name: 'secret', color: '#000', is_private: true }] })

      await importVaultExport(data, { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK)

      expect(mockSyncTagDefinitions).toHaveBeenCalledWith(data.tags, FAKE_DEK, undefined)
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

    it('applies the move-to-end delay when the file has it', async () => {
      await importVaultExport(
        makeExport({ mode: 'everything', preferences: { ...PREFS, move_to_end_delay_seconds: 45 } }),
        { defaultCategoryId: null, applyPreferences: true },
        FAKE_DEK,
      )
      expect(mockSetMoveToEndDelay).toHaveBeenCalledWith(expect.anything(), 45)
    })

    it('leaves the delay alone for an older file without it', async () => {
      await importVaultExport(
        makeExport({ mode: 'everything', preferences: PREFS }),
        { defaultCategoryId: null, applyPreferences: true },
        FAKE_DEK,
      )
      expect(mockSetMoveToEndDelay).not.toHaveBeenCalled()
    })

    it('reports a failed delay by label', async () => {
      mockSetMoveToEndDelay.mockResolvedValue({ success: false, error: 'nope' })
      const result = await importVaultExport(
        makeExport({ mode: 'everything', preferences: { ...PREFS, move_to_end_delay_seconds: 45 } }),
        { defaultCategoryId: null, applyPreferences: true },
        FAKE_DEK,
      )
      expect(result.preferencesFailed).toEqual(['move-to-end delay'])
    })

    it('reports failed preferences by label without failing the whole import', async () => {
      mockSetThemeMode.mockResolvedValue({ success: false, error: 'Invalid theme mode' })
      mockSetAccentColor.mockResolvedValueOnce({ success: false, error: 'Invalid accent color' }).mockResolvedValue({ success: true })

      const result = await importVaultExport(
        makeExport({ mode: 'everything', preferences: PREFS }),
        { defaultCategoryId: null, applyPreferences: true },
        FAKE_DEK,
      )

      expect(result.preferencesFailed).toEqual(expect.arrayContaining(['theme', 'accent (light)']))
      expect(result.preferencesFailed).toHaveLength(2)
    })

    it('reports no failed preferences when all setters succeed', async () => {
      const result = await importVaultExport(
        makeExport({ mode: 'everything', preferences: PREFS }),
        { defaultCategoryId: null, applyPreferences: true },
        FAKE_DEK,
      )

      expect(result.preferencesFailed).toEqual([])
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

  describe('progress reporting', () => {
    type Event = { phase: string; done: number; total: number }

    it('reports categories, domains, tags, and links phases in that order', async () => {
      mockGetOrCreateCategoryByName.mockResolvedValue('cat-1')
      mockImportLinks.mockImplementation(async (
        _inputs: unknown, _catId: unknown, _dek: unknown, { onProgress }: { onProgress?: (done: number, total: number) => void } = {},
      ) => {
        onProgress?.(1, 1)
        return { imported: 1, skipped: 0, duplicates: 0 }
      })
      const events: Event[] = []

      await importVaultExport(
        makeExport({
          categories: [{ name: 'Article', description: null, color: null, emoticon: null }],
          categoryDomains: [{ domain: 'example.com', category: 'Article' }],
          tags: [{ name: 'react', color: null, is_private: false }],
        }),
        { defaultCategoryId: null, applyPreferences: false, onProgress: p => events.push(p) },
        FAKE_DEK,
      )

      expect(events.map(e => e.phase)).toEqual(['categories', 'domains', 'tags', 'tags', 'links'])
    })

    it('reports done incrementing up to total across concurrent category creation', async () => {
      const events: Event[] = []

      await importVaultExport(
        makeExport({
          categories: [
            { name: 'A', description: null, color: null, emoticon: null },
            { name: 'B', description: null, color: null, emoticon: null },
          ],
        }),
        { defaultCategoryId: null, applyPreferences: false, onProgress: p => events.push(p) },
        FAKE_DEK,
      )

      const categoryEvents = events.filter(e => e.phase === 'categories')
      expect(categoryEvents).toHaveLength(2)
      expect(categoryEvents.every(e => e.total === 2)).toBe(true)
      expect(categoryEvents.map(e => e.done).sort()).toEqual([1, 2])
    })

    it('reports the links phase via importLinks\'s own onProgress callback', async () => {
      mockImportLinks.mockImplementation(async (
        _inputs: unknown, _catId: unknown, _dek: unknown, { onProgress }: { onProgress?: (done: number, total: number) => void } = {},
      ) => {
        onProgress?.(1, 1)
        return { imported: 1, skipped: 0, duplicates: 0 }
      })
      const events: Event[] = []

      await importVaultExport(
        makeExport(),
        { defaultCategoryId: null, applyPreferences: false, onProgress: p => events.push(p) },
        FAKE_DEK,
      )

      expect(events).toContainEqual({ phase: 'links', done: 1, total: 1 })
    })

    it('forwards each link row outcome on the links phase and passes failures through', async () => {
      const failed = { url: 'bad url', status: 'failed', reason: 'invalid_url' } as const
      mockImportLinks.mockImplementation(async (
        _inputs: unknown, _catId: unknown, _dek: unknown,
        { onProgress }: { onProgress?: (done: number, total: number, outcome: unknown) => void } = {},
      ) => {
        onProgress?.(1, 1, failed)
        return { imported: 0, skipped: 1, duplicates: 0, failures: [{ url: 'bad url', reason: 'invalid_url' }] }
      })
      const events: VaultImportProgress[] = []

      const result = await importVaultExport(
        makeExport(),
        { defaultCategoryId: null, applyPreferences: false, onProgress: p => events.push(p) },
        FAKE_DEK,
      )

      expect(events).toContainEqual({ phase: 'links', done: 1, total: 1, outcome: failed })
      expect(result.failures).toEqual([{ url: 'bad url', reason: 'invalid_url' }])
    })

    it('reports the preferences phase start and end when applying preferences', async () => {
      const events: Event[] = []

      await importVaultExport(
        makeExport({
          mode: 'everything',
          preferences: {
            theme_mode: 'dark', accent_color_light: 'indigo', accent_color_dark: 'violet',
            surface_family: 'slate', auto_fetch_enabled: true,
          },
        }),
        { defaultCategoryId: null, applyPreferences: true, onProgress: p => events.push(p) },
        FAKE_DEK,
      )

      expect(events).toContainEqual({ phase: 'preferences', done: 0, total: 1 })
      expect(events).toContainEqual({ phase: 'preferences', done: 1, total: 1 })
    })

    it('does not throw when onProgress is omitted', async () => {
      await expect(
        importVaultExport(makeExport(), { defaultCategoryId: null, applyPreferences: false }, FAKE_DEK),
      ).resolves.toBeDefined()
    })
  })

  describe('cancel (signal)', () => {
    const PREFS = {
      theme_mode: 'dark' as const, accent_color_light: 'indigo', accent_color_dark: 'violet',
      surface_family: 'slate', auto_fetch_enabled: true,
    }
    const everything = () => makeExport({
      mode: 'everything',
      preferences: PREFS,
      categories: [{ name: 'Article', description: null, color: null, emoticon: null }],
      categoryDomains: [{ domain: 'example.com', category: 'Article' }],
      tags: [{ name: 'react', color: null, is_private: false }],
    })

    it('inserts no links and applies no preferences when aborted during categories', async () => {
      const controller = new AbortController()
      mockGetOrCreateCategoryByName.mockImplementation(async (name: string) => {
        controller.abort()
        return `id-${name}`
      })

      const result = await importVaultExport(
        everything(),
        { defaultCategoryId: null, applyPreferences: true, signal: controller.signal },
        FAKE_DEK,
      )

      expect(mockImportLinks).not.toHaveBeenCalled()
      expect(mockAddCategoryDomain).not.toHaveBeenCalled()
      expect(mockSyncTagDefinitions).not.toHaveBeenCalled()
      expect(mockSetThemeMode).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        imported: 0, cancelled: true, notProcessed: ['https://example.com'], categoriesCreated: 1,
      })
    })

    it('skips preferences and keeps the created counts when aborted during links', async () => {
      const controller = new AbortController()
      mockImportLinks.mockImplementation(async () => {
        controller.abort()
        return { imported: 1, skipped: 0, duplicates: 0, failures: [], cancelled: true, notProcessed: ['https://b.com'] }
      })

      const result = await importVaultExport(
        everything(),
        { defaultCategoryId: null, applyPreferences: true, signal: controller.signal },
        FAKE_DEK,
      )

      expect(mockImportLinks).toHaveBeenCalledWith(
        expect.any(Array), null, FAKE_DEK, expect.objectContaining({ signal: controller.signal }),
      )
      expect(mockSetThemeMode).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        imported: 1, cancelled: true, notProcessed: ['https://b.com'],
        categoriesCreated: 1, domainsCreated: 1, tagsCreated: 1, preferencesFailed: [],
      })
    })
  })

  describe('collections', () => {
    type Outcome =
      | { url: string; status: 'imported'; metaMissing: false; id: string; isFavorite: false }
      | { url: string; status: 'duplicate'; id: string }
      | { url: string; status: 'failed'; reason: 'invalid_url' | 'save_error' }
      | { url: string; status: 'skipped_generic' }
    const imported = (url: string, id: string): Outcome => ({ url, status: 'imported', metaMissing: false, id, isFavorite: false })
    const duplicate = (url: string, id: string): Outcome => ({ url, status: 'duplicate', id })

    /** importLinks reports each outcome through onProgress, then resolves. */
    function linksPhase(outcomes: Outcome[], beforeReturn?: () => void) {
      mockImportLinks.mockImplementation(async (_inputs: unknown, _cat: unknown, _dek: unknown,
        opts: { onProgress?: (done: number, total: number, outcome: Outcome) => void }) => {
        outcomes.forEach((outcome, i) => opts.onProgress?.(i + 1, outcomes.length, outcome))
        beforeReturn?.()
        return { imported: 0, skipped: 0, duplicates: 0, failures: [], cancelled: false, notProcessed: [], retryable: [] }
      })
    }
    const entry = (name: string, links: string[], extra: Partial<{ emoji: string | null; description: string | null }> = {}) =>
      ({ name, emoji: null, description: null, links, ...extra })
    const withCollections = (collections: ReturnType<typeof entry>[]) => makeExport({ collections })
    const run = (data: VaultExportV2, extra: Record<string, unknown> = {}) =>
      importVaultExport(data, { defaultCategoryId: null, applyPreferences: false, ...extra }, FAKE_DEK)
    const existing = (id: string, name: string) => ({ id, name, emoji: '⭐', description: 'mine' })

    it('never runs the phase for a file without collections or with an empty list', async () => {
      const onProgress = vi.fn()
      for (const data of [makeExport(), withCollections([])]) {
        const result = await run(data, { onProgress })
        expect(result).toMatchObject({ collectionsCreated: 0, collectionsUpdated: 0, collectionsFailed: 0 })
      }
      expect(onProgress.mock.calls.some(([p]) => p.phase === 'collections')).toBe(false)
      expect(mockGetCollections).not.toHaveBeenCalled()
      expect(mockCreateCollection).not.toHaveBeenCalled()
    })

    it('creates each collection with its style, appends links in file order and reports onCreate', async () => {
      linksPhase([imported('https://a.com', 'la'), imported('https://b.com', 'lb')])
      const onCreate = vi.fn()

      const result = await run(withCollections([
        entry('Rust', ['https://b.com', 'https://a.com'], { emoji: '🦀', description: 'Systems' }),
      ]), { onCreate })

      expect(mockCreateCollection).toHaveBeenCalledWith({ name: 'Rust', emoji: '🦀', description: 'Systems' }, FAKE_DEK)
      expect(mockGetCollectionMemberships).not.toHaveBeenCalled()
      expect(mockAddLinksToCollection).toHaveBeenCalledWith('col-Rust', ['lb', 'la'])
      expect(onCreate).toHaveBeenCalledWith('collection', 'col-Rust')
      expect(result).toMatchObject({ collectionsCreated: 1, collectionsUpdated: 0, collectionsFailed: 0 })
    })

    it('processes collections in reverse file order', async () => {
      await run(withCollections([entry('A', []), entry('B', []), entry('C', [])]))

      expect(mockCreateCollection.mock.calls.map(([input]) => input.name)).toEqual(['C', 'B', 'A'])
    })

    it('reuses a same-named collection (any case) without restyling it and appends only missing links', async () => {
      linksPhase([imported('https://a.com', 'la'), imported('https://b.com', 'lb')])
      mockGetCollections.mockResolvedValue([existing('mine', 'learn rust')])
      mockGetCollectionMemberships.mockResolvedValue([{ collection_id: 'mine', link_id: 'la', position: 1, added_at: '' }])

      const result = await run(withCollections([entry('Learn Rust', ['https://a.com', 'https://b.com'])]))

      expect(mockCreateCollection).not.toHaveBeenCalled()
      expect(mockGetCollectionMemberships).toHaveBeenCalledWith('mine')
      expect(mockAddLinksToCollection).toHaveBeenCalledWith('mine', ['lb'])
      expect(result).toMatchObject({ collectionsCreated: 0, collectionsUpdated: 1 })
    })

    it('does not append or count an update when every link is already a member', async () => {
      linksPhase([imported('https://a.com', 'la')])
      mockGetCollections.mockResolvedValue([existing('mine', 'Rust')])
      mockGetCollectionMemberships.mockResolvedValue([{ collection_id: 'mine', link_id: 'la', position: 1, added_at: '' }])

      const result = await run(withCollections([entry('Rust', ['https://a.com'])]))

      expect(mockAddLinksToCollection).not.toHaveBeenCalled()
      expect(result.collectionsUpdated).toBe(0)
    })

    it('reuses the first match in list order when the destination has two same-named collections', async () => {
      linksPhase([imported('https://a.com', 'la')])
      mockGetCollections.mockResolvedValue([existing('newer', 'Rust'), existing('older', 'rust')])

      await run(withCollections([entry('Rust', ['https://a.com'])]))

      expect(mockAddLinksToCollection).toHaveBeenCalledWith('newer', ['la'])
    })

    it('merges same-named entries in the file into one collection, first entry wins', async () => {
      linksPhase([imported('https://a.com', 'la'), imported('https://b.com', 'lb'), imported('https://c.com', 'lc')])

      await run(withCollections([
        entry('Rust', ['https://a.com', 'https://b.com'], { emoji: '🦀', description: 'first' }),
        entry('rust', ['https://b.com', 'https://c.com'], { emoji: '⚙️', description: 'second' }),
      ]))

      expect(mockCreateCollection).toHaveBeenCalledTimes(1)
      expect(mockCreateCollection).toHaveBeenCalledWith({ name: 'Rust', emoji: '🦀', description: 'first' }, FAKE_DEK)
      expect(mockAddLinksToCollection).toHaveBeenCalledWith('col-Rust', ['la', 'lb', 'lc'])
    })

    it('appends a link that already existed in the destination', async () => {
      linksPhase([duplicate('https://a.com', 'old-a'), imported('https://b.com', 'lb')])

      await run(withCollections([entry('Rust', ['https://a.com', 'https://b.com'])]))

      expect(mockAddLinksToCollection).toHaveBeenCalledWith('col-Rust', ['old-a', 'lb'])
    })

    it('silently drops URLs that failed, were skipped as generic or are not in the file', async () => {
      linksPhase([
        imported('https://a.com', 'la'),
        { url: 'bad', status: 'failed', reason: 'invalid_url' },
        { url: 'https://x.com', status: 'failed', reason: 'save_error' },
        { url: 'https://g.com', status: 'skipped_generic' },
        imported('https://b.com', 'lb'),
      ])

      await run(withCollections([
        entry('Rust', ['https://a.com', 'bad', 'https://x.com', 'https://g.com', 'https://nowhere.com', 'https://b.com']),
      ]))

      expect(mockAddLinksToCollection).toHaveBeenCalledWith('col-Rust', ['la', 'lb'])
    })

    it('appends a URL listed twice in one entry only once', async () => {
      linksPhase([imported('https://a.com', 'la')])

      await run(withCollections([entry('Rust', ['https://a.com', 'https://a.com'])]))

      expect(mockAddLinksToCollection).toHaveBeenCalledWith('col-Rust', ['la'])
    })

    it('resolves a collection URL with surrounding spaces', async () => {
      linksPhase([imported('https://a.com', 'la')])

      await run(withCollections([entry('Rust', ['  https://a.com  '])]))

      expect(mockAddLinksToCollection).toHaveBeenCalledWith('col-Rust', ['la'])
    })

    it('counts a failed create, logs it and moves on to the next collection', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateCollection
        .mockResolvedValueOnce({ data: null, error: 'db_error' })
        .mockResolvedValueOnce({ data: { id: 'col-A', name: 'A' }, error: null })

      const result = await run(withCollections([entry('A', []), entry('B', [])]))

      expect(mockCreateCollection).toHaveBeenCalledTimes(2)
      expect(result).toMatchObject({ collectionsCreated: 1, collectionsFailed: 1 })
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })

    it('counts a failed append as failed, still reports the created collection and moves on', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      linksPhase([imported('https://a.com', 'la')])
      mockAddLinksToCollection.mockResolvedValueOnce(null)
      const onCreate = vi.fn()

      const result = await run(withCollections([entry('A', []), entry('B', ['https://a.com'])]), { onCreate })

      expect(onCreate).toHaveBeenCalledWith('collection', 'col-B')
      expect(onCreate).toHaveBeenCalledWith('collection', 'col-A')
      expect(result).toMatchObject({ collectionsCreated: 1, collectionsFailed: 1 })
      consoleError.mockRestore()
    })

    it('reports the collections phase between links and preferences, done counting up to the groups', async () => {
      linksPhase([imported('https://example.com', 'l1')])
      const phases: VaultImportProgress[] = []

      await importVaultExport(
        makeExport({
          collections: [entry('A', []), entry('a', []), entry('B', [])],
          preferences: {
            theme_mode: 'dark', accent_color_light: 'indigo', accent_color_dark: 'violet',
            surface_family: 'slate', auto_fetch_enabled: true,
          },
        }),
        { defaultCategoryId: null, applyPreferences: true, onProgress: p => phases.push(p) },
        FAKE_DEK,
      )

      const collections = phases.filter(p => p.phase === 'collections')
      expect(collections.map(p => [p.done, p.total])).toEqual([[0, 2], [1, 2], [2, 2]])
      const order = phases.map(p => p.phase)
      expect(order.lastIndexOf('links')).toBeLessThan(order.indexOf('collections'))
      expect(order.lastIndexOf('collections')).toBeLessThan(order.indexOf('preferences'))
    })

    it('skips the whole phase and preferences when cancelled during links', async () => {
      const controller = new AbortController()
      linksPhase([imported('https://example.com', 'l1')], () => controller.abort())

      const result = await importVaultExport(
        withCollections([entry('A', ['https://example.com'])]),
        { defaultCategoryId: null, applyPreferences: true, signal: controller.signal },
        FAKE_DEK,
      )

      expect(mockGetCollections).not.toHaveBeenCalled()
      expect(mockCreateCollection).not.toHaveBeenCalled()
      expect(mockAddLinksToCollection).not.toHaveBeenCalled()
      expect(mockSetThemeMode).not.toHaveBeenCalled()
      expect(result.cancelled).toBe(true)
    })

    it('stops after the current collection when cancelled during the phase, keeping what was written', async () => {
      const controller = new AbortController()
      mockCreateCollection.mockImplementation(async (input: { name: string }) => {
        controller.abort()
        return { data: { id: `col-${input.name}`, name: input.name }, error: null }
      })

      const result = await importVaultExport(
        makeExport({
          collections: [entry('A', []), entry('B', [])],
          preferences: {
            theme_mode: 'dark', accent_color_light: 'indigo', accent_color_dark: 'violet',
            surface_family: 'slate', auto_fetch_enabled: true,
          },
        }),
        { defaultCategoryId: null, applyPreferences: true, signal: controller.signal },
        FAKE_DEK,
      )

      expect(mockCreateCollection.mock.calls.map(([input]) => input.name)).toEqual(['B'])
      expect(mockSetThemeMode).not.toHaveBeenCalled()
      expect(result).toMatchObject({ cancelled: true, collectionsCreated: 1 })
    })
  })
})
