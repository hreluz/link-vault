import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bulkUpdateStatus, bulkSoftDelete, bulkUpdateCategory, bulkAddTags } from '@/lib/services/links'

// ── shared mocks ──────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockLinksUpdateIn,
  mockLinksUpdate,
  mockTagsUpsert,
  mockTagsSelectIn,
  mockTagsSelectEq,
  mockTagsSelect,
  mockLinkTagsUpsert,
} = vi.hoisted(() => {
  const mockLinksUpdateIn = vi.fn()
  const mockLinksUpdate = vi.fn(() => ({ in: mockLinksUpdateIn }))

  const mockGetUser = vi.fn()

  const mockTagsUpsert = vi.fn()
  const mockTagsSelectIn = vi.fn()
  const mockTagsSelectEq = vi.fn(() => ({ in: mockTagsSelectIn }))
  const mockTagsSelect = vi.fn(() => ({ eq: mockTagsSelectEq }))

  const mockLinkTagsUpsert = vi.fn()

  return {
    mockGetUser,
    mockLinksUpdateIn, mockLinksUpdate,
    mockTagsUpsert, mockTagsSelectIn, mockTagsSelectEq, mockTagsSelect,
    mockLinkTagsUpsert,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'links') return { update: mockLinksUpdate }
      if (table === 'tags') return { upsert: mockTagsUpsert, select: mockTagsSelect }
      if (table === 'link_tags') return { upsert: mockLinkTagsUpsert }
      return {}
    }),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockLinksUpdateIn.mockResolvedValue({ error: null })
  mockTagsUpsert.mockResolvedValue({ error: null })
  mockTagsSelectIn.mockResolvedValue({ data: [{ id: 't1' }, { id: 't2' }] })
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

  it('uses update (soft delete) not hard delete', async () => {
    await bulkSoftDelete(['1'])
    expect(mockLinksUpdate).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String) }))
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
  it('returns true on success', async () => {
    expect(await bulkAddTags(['1', '2'], ['react', 'ts'])).toBe(true)
  })

  it('returns false when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect(await bulkAddTags(['1'], ['react'])).toBe(false)
  })

  it('returns true immediately when ids is empty', async () => {
    expect(await bulkAddTags([], ['react'])).toBe(true)
    expect(mockTagsUpsert).not.toHaveBeenCalled()
  })

  it('returns true immediately when tagNames is empty', async () => {
    expect(await bulkAddTags(['1'], [])).toBe(true)
    expect(mockTagsUpsert).not.toHaveBeenCalled()
  })

  it('upserts all tag names for the current user', async () => {
    await bulkAddTags(['1'], ['react', 'ts'])
    expect(mockTagsUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-1', name: 'react' }, { user_id: 'user-1', name: 'ts' }],
      expect.objectContaining({ onConflict: 'user_id,name', ignoreDuplicates: true }),
    )
  })

  it('fetches tag ids for the current user filtered by name', async () => {
    await bulkAddTags(['1'], ['react'])
    expect(mockTagsSelectEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockTagsSelectIn).toHaveBeenCalledWith('name', ['react'])
  })

  it('upserts link_tag pairs for every (link, tag) combination', async () => {
    mockTagsSelectIn.mockResolvedValue({ data: [{ id: 'tag-a' }, { id: 'tag-b' }] })

    await bulkAddTags(['link-1', 'link-2'], ['react', 'ts'])

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

  it('returns false when no tag rows are found after upsert', async () => {
    mockTagsSelectIn.mockResolvedValue({ data: [] })
    expect(await bulkAddTags(['1'], ['unknown-tag'])).toBe(false)
  })

  it('returns false when tag select returns null', async () => {
    mockTagsSelectIn.mockResolvedValue({ data: null })
    expect(await bulkAddTags(['1'], ['react'])).toBe(false)
  })

  it('returns false when link_tags upsert fails', async () => {
    mockLinkTagsUpsert.mockResolvedValue({ error: { message: 'upsert failed' } })
    expect(await bulkAddTags(['1'], ['react'])).toBe(false)
  })
})
