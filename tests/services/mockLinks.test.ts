import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { seedMockLinks } from '@/lib/services/mockLinks'
import { generateDek, decryptJson } from '@/lib/crypto/vault'

const {
  mockGetUser,
  mockLinksInsert, mockLinksInsertSelect,
  mockLinkTagsInsert,
  mockSyncTagsByName,
  mockGetCategories,
} = vi.hoisted(() => {
  const mockLinksInsertSelect = vi.fn()
  const mockLinksInsert = vi.fn(() => ({ select: mockLinksInsertSelect }))
  const mockLinkTagsInsert = vi.fn().mockResolvedValue({ error: null })
  return {
    mockGetUser: vi.fn(),
    mockLinksInsert, mockLinksInsertSelect,
    mockLinkTagsInsert,
    mockSyncTagsByName: vi.fn(),
    mockGetCategories: vi.fn(),
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'links') return { insert: mockLinksInsert }
      if (table === 'link_tags') return { insert: mockLinkTagsInsert }
      throw new Error(`unexpected table ${table}`)
    },
  }),
}))

vi.mock('@/lib/services/tags', () => ({ syncTagsByName: mockSyncTagsByName }))
vi.mock('@/lib/services/categories', () => ({ getCategories: mockGetCategories }))

const MOCK_CATEGORY_NAMES = [
  'Not defined', 'YouTube', 'Instagram', 'TikTok', 'Article', 'Course', 'Tweet', 'GitHub', 'Other',
]

let dek: CryptoKey

beforeAll(async () => {
  dek = await generateDek()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockGetCategories.mockResolvedValue(
    MOCK_CATEGORY_NAMES.map((name, i) => ({ id: `cat-${i}`, name }))
  )
  mockSyncTagsByName.mockImplementation(async (names: string[]) => names.map((_, i) => `tag-${i}`))
  mockLinksInsertSelect.mockResolvedValue({
    data: Array.from({ length: 100 }, (_, i) => ({ id: `link-${i}` })),
    error: null,
  })
})

describe('seedMockLinks', () => {
  it('inserts exactly 100 links, all owned by the given user', async () => {
    await seedMockLinks(dek)

    expect(mockLinksInsert).toHaveBeenCalledOnce()
    const [rows] = mockLinksInsert.mock.calls[0]
    expect(rows).toHaveLength(100)
    expect(rows.every((r: { user_id: string }) => r.user_id === 'user-1')).toBe(true)
  })

  it('encrypts link content and never leaks plaintext into the insert payload', async () => {
    await seedMockLinks(dek)

    const [rows] = mockLinksInsert.mock.calls[0]
    const first = rows[0]
    expect(first.enc_payload).toBeTypeOf('string')
    expect(JSON.stringify(rows)).not.toContain('React 19 Deep Dive')

    const decrypted = await decryptJson<{ title: string; url: string }>(first.enc_payload, first.enc_iv, dek)
    expect(decrypted.title).toBe('React 19 Deep Dive — New Features Explained')
  })

  it('resolves category_id from the seeded categories by name', async () => {
    await seedMockLinks(dek)

    const [rows] = mockLinksInsert.mock.calls[0]
    expect(rows.every((r: { category_id: string | null }) => r.category_id !== null)).toBe(true)
  })

  it('marks exactly 8 links as soft-deleted', async () => {
    await seedMockLinks(dek)

    const [rows] = mockLinksInsert.mock.calls[0]
    const deletedCount = rows.filter((r: { deleted_at: string | null }) => r.deleted_at !== null).length
    expect(deletedCount).toBe(8)
  })

  it('inserts link_tags pairs referencing the returned link ids and resolved tag ids', async () => {
    await seedMockLinks(dek)

    expect(mockLinkTagsInsert).toHaveBeenCalledOnce()
    const [pairs] = mockLinkTagsInsert.mock.calls[0]
    expect(pairs.length).toBeGreaterThan(0)
    expect(pairs[0]).toHaveProperty('link_id')
    expect(pairs[0]).toHaveProperty('tag_id')
  })

  it('does nothing when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await seedMockLinks(dek)

    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('does not insert link_tags when the links insert fails', async () => {
    mockLinksInsertSelect.mockResolvedValue({ data: null, error: { message: 'db error' } })

    await seedMockLinks(dek)

    expect(mockLinkTagsInsert).not.toHaveBeenCalled()
  })
})
