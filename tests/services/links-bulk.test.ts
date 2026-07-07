import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { bulkUpdateStatus, bulkSoftDelete, bulkUpdateCategory, bulkAddTags } from '@/lib/services/links'
import { generateDek, encryptJson } from '@/lib/crypto/vault'

// ── shared mocks ──────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockLinksUpdateIn,
  mockLinksUpdate,
  mockTagsGetAll,
  mockTagsInsert,
  mockTagsInsertSingle,
  mockLinkTagsUpsert,
} = vi.hoisted(() => {
  const mockLinksUpdateIn = vi.fn()
  const mockLinksUpdate = vi.fn(() => ({ in: mockLinksUpdateIn }))

  const mockGetUser = vi.fn()

  const mockTagsGetAll = vi.fn()
  const mockTagsInsertSingle = vi.fn()
  const mockTagsInsertSelect = vi.fn(() => ({ single: mockTagsInsertSingle }))
  const mockTagsInsert = vi.fn(() => ({ select: mockTagsInsertSelect }))

  const mockLinkTagsUpsert = vi.fn()

  return {
    mockGetUser,
    mockLinksUpdateIn, mockLinksUpdate,
    mockTagsGetAll, mockTagsInsertSingle, mockTagsInsert,
    mockLinkTagsUpsert,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'links') return { update: mockLinksUpdate }
      if (table === 'tags') return { select: vi.fn(() => mockTagsGetAll()), insert: mockTagsInsert }
      if (table === 'link_tags') return { upsert: mockLinkTagsUpsert }
      return {}
    }),
  })),
}))

let dek: CryptoKey

beforeAll(async () => {
  dek = await generateDek()
})

async function encryptTagRow(id: string, name: string) {
  const { ciphertext, iv } = await encryptJson({ name, color: null }, dek)
  return { id, user_id: 'user-1', enc_payload: ciphertext, enc_iv: iv, is_private: false, created_at: '', link_tags: [] }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockLinksUpdateIn.mockResolvedValue({ error: null })
  mockLinkTagsUpsert.mockResolvedValue({ error: null })
})

// ── bulkUpdateStatus ──────────────────────────────────────────────────────────

describe('bulkUpdateStatus', () => {
  it('returns true on success', async () => {
    expect(await bulkUpdateStatus(['1', '2'], 'archived')).toBe(true)
  })

  it('returns false on DB error', async () => {
    mockLinksUpdateIn.mockResolvedValue({ error: { message: 'DB error' } })
    expect(await bulkUpdateStatus(['1'], 'read')).toBe(false)
  })

  it('returns true immediately when ids is empty', async () => {
    expect(await bulkUpdateStatus([], 'archived')).toBe(true)
    expect(mockLinksUpdate).not.toHaveBeenCalled()
  })

  it('calls update with the correct status', async () => {
    await bulkUpdateStatus(['1', '2'], 'archived')
    expect(mockLinksUpdate).toHaveBeenCalledWith({ status: 'archived' })
  })

  it('calls .in() with the correct ids', async () => {
    await bulkUpdateStatus(['1', '2'], 'archived')
    expect(mockLinksUpdateIn).toHaveBeenCalledWith('id', ['1', '2'])
  })
})

// ── bulkSoftDelete ────────────────────────────────────────────────────────────

describe('bulkSoftDelete', () => {
  it('returns true on success', async () => {
    expect(await bulkSoftDelete(['1', '2'])).toBe(true)
  })

  it('returns false on DB error', async () => {
    mockLinksUpdateIn.mockResolvedValue({ error: { message: 'DB error' } })
    expect(await bulkSoftDelete(['1'])).toBe(false)
  })

  it('returns true immediately when ids is empty', async () => {
    expect(await bulkSoftDelete([])).toBe(true)
    expect(mockLinksUpdate).not.toHaveBeenCalled()
  })

  it('sets deleted_at to a non-null ISO timestamp', async () => {
    await bulkSoftDelete(['1'])
    expect(mockLinksUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) }),
    )
  })

  it('calls .in() with the correct ids', async () => {
    await bulkSoftDelete(['1', '2', '3'])
    expect(mockLinksUpdateIn).toHaveBeenCalledWith('id', ['1', '2', '3'])
  })
})

// ── bulkUpdateCategory ────────────────────────────────────────────────────────

describe('bulkUpdateCategory', () => {
  it('returns true on success', async () => {
    expect(await bulkUpdateCategory(['1', '2'], 'cat-1')).toBe(true)
  })

  it('returns false on DB error', async () => {
    mockLinksUpdateIn.mockResolvedValue({ error: { message: 'DB error' } })
    expect(await bulkUpdateCategory(['1'], 'cat-1')).toBe(false)
  })

  it('returns true immediately when ids is empty', async () => {
    expect(await bulkUpdateCategory([], 'cat-1')).toBe(true)
    expect(mockLinksUpdate).not.toHaveBeenCalled()
  })

  it('calls update with the correct category_id', async () => {
    await bulkUpdateCategory(['1'], 'cat-xyz')
    expect(mockLinksUpdate).toHaveBeenCalledWith({ category_id: 'cat-xyz' })
  })

  it('supports setting category_id to null', async () => {
    await bulkUpdateCategory(['1'], null)
    expect(mockLinksUpdate).toHaveBeenCalledWith({ category_id: null })
  })

  it('calls .in() with the correct ids', async () => {
    await bulkUpdateCategory(['1', '2'], 'cat-1')
    expect(mockLinksUpdateIn).toHaveBeenCalledWith('id', ['1', '2'])
  })
})

// ── bulkAddTags ───────────────────────────────────────────────────────────────

describe('bulkAddTags', () => {
  beforeEach(() => {
    mockTagsGetAll.mockResolvedValue({ data: [], error: null })
  })

  it('returns the resolved tag ids on success', async () => {
    const react = await encryptTagRow('tag-a', 'react')
    const ts = await encryptTagRow('tag-b', 'ts')
    mockTagsGetAll.mockResolvedValue({ data: [react, ts], error: null })

    const result = await bulkAddTags(['1', '2'], ['react', 'ts'], dek)

    expect(result).toEqual(['tag-a', 'tag-b'])
  })

  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect(await bulkAddTags(['1'], ['react'], dek)).toBeNull()
  })

  it('returns [] immediately when ids is empty', async () => {
    expect(await bulkAddTags([], ['react'], dek)).toEqual([])
    expect(mockLinkTagsUpsert).not.toHaveBeenCalled()
  })

  it('returns [] immediately when tagNames is empty', async () => {
    expect(await bulkAddTags(['1'], [], dek)).toEqual([])
    expect(mockLinkTagsUpsert).not.toHaveBeenCalled()
  })

  it('resolves existing tags by name without creating duplicates', async () => {
    const react = await encryptTagRow('tag-a', 'react')
    mockTagsGetAll.mockResolvedValue({ data: [react], error: null })

    await bulkAddTags(['1'], ['react'], dek)

    expect(mockTagsInsertSingle).not.toHaveBeenCalled()
  })

  it('upserts link_tag pairs for every (link, tag) combination', async () => {
    const react = await encryptTagRow('tag-a', 'react')
    const ts = await encryptTagRow('tag-b', 'ts')
    mockTagsGetAll.mockResolvedValue({ data: [react, ts], error: null })

    await bulkAddTags(['link-1', 'link-2'], ['react', 'ts'], dek)

    expect(mockLinkTagsUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        { link_id: 'link-1', tag_id: 'tag-a' },
        { link_id: 'link-1', tag_id: 'tag-b' },
        { link_id: 'link-2', tag_id: 'tag-a' },
        { link_id: 'link-2', tag_id: 'tag-b' },
      ]),
      expect.objectContaining({ onConflict: 'link_id,tag_id', ignoreDuplicates: true }),
    )
  })

  it('returns null when link_tags upsert fails', async () => {
    const react = await encryptTagRow('tag-a', 'react')
    mockTagsGetAll.mockResolvedValue({ data: [react], error: null })
    mockLinkTagsUpsert.mockResolvedValue({ error: { message: 'upsert failed' } })

    expect(await bulkAddTags(['1'], ['react'], dek)).toBeNull()
  })
})
