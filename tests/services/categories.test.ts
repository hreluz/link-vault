import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCategories, seedDefaultCategories, DEFAULT_CATEGORIES } from '@/lib/services/categories'

// ── mocks for getCategories (browser client) ──────────────────────────────────

const { mockOrder } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ order: mockOrder }),
    }),
  })),
}))

// ── helper: build an injectable mock client for seedDefaultCategories ─────────

function makeMockClient({
  count = 0,
  countError = null,
}: {
  count?: number | null
  countError?: object | null
} = {}) {
  const mockInsert = vi.fn().mockResolvedValue({ error: null })
  const mockEq = vi.fn().mockResolvedValue({ count, error: countError })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  const from = vi.fn().mockReturnValue({ select: mockSelect, insert: mockInsert })

  return { client: { from } as ReturnType<typeof import('@/lib/supabase/client').createClient>, mockInsert, from }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getCategories ─────────────────────────────────────────────────────────────

describe('getCategories', () => {
  it('returns categories ordered alphabetically by name', async () => {
    const cats = [
      { id: '1', user_id: 'u1', name: 'Article', description: 'Blog posts', color: '#3B82F6',
        emoticon: '📄', created_at: '', updated_at: '' },
    ]
    mockOrder.mockResolvedValue({ data: cats, error: null })

    const result = await getCategories()

    expect(result).toEqual(cats)
    expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('returns [] on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getCategories()).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })

    expect(await getCategories()).toEqual([])
  })
})

// ── seedDefaultCategories ─────────────────────────────────────────────────────

describe('seedDefaultCategories', () => {
  it('inserts all default categories when the user has none', async () => {
    const { client, mockInsert } = makeMockClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123')

    expect(mockInsert).toHaveBeenCalledOnce()
    expect(mockInsert).toHaveBeenCalledWith(
      DEFAULT_CATEGORIES.map(cat => ({ ...cat, user_id: 'user-123' })),
    )
  })

  it('skips insertion when the user already has categories', async () => {
    const { client, mockInsert } = makeMockClient({ count: 3 })

    await seedDefaultCategories(client, 'user-123')

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('skips insertion when the count query fails', async () => {
    const { client, mockInsert } = makeMockClient({ count: null, countError: { message: 'error' } })

    await seedDefaultCategories(client, 'user-123')

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('inserts exactly 8 categories', async () => {
    const { client, mockInsert } = makeMockClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123')

    const [inserted] = mockInsert.mock.calls[0]
    expect(inserted).toHaveLength(8)
  })

  it('inserts categories with correct names, descriptions, colors, and emoticons', async () => {
    const { client, mockInsert } = makeMockClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123')

    const [inserted] = mockInsert.mock.calls[0]
    expect(inserted.map((c: { name: string }) => c.name)).toEqual([
      'YouTube', 'Instagram', 'TikTok', 'Article', 'Course', 'Tweet', 'GitHub', 'Other',
    ])
    expect(inserted.every((c: { description: string }) => typeof c.description === 'string')).toBe(true)
    expect(inserted.every((c: { color: string }) => typeof c.color === 'string')).toBe(true)
    expect(inserted.every((c: { emoticon: string }) => typeof c.emoticon === 'string')).toBe(true)
  })

  it('sets user_id on every inserted category', async () => {
    const { client, mockInsert } = makeMockClient({ count: 0 })

    await seedDefaultCategories(client, 'user-abc')

    const [inserted] = mockInsert.mock.calls[0]
    expect(inserted.every((c: { user_id: string }) => c.user_id === 'user-abc')).toBe(true)
  })
})
