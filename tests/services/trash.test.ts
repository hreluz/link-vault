import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTrashedLinks, restoreLink, deleteLinkPermanently, emptyTrash } from '@/lib/services/trash'

// ── shared mocks ──────────────────────────────────────────────────────────────

const {
  // getTrashedLinks chain: from('links').select().not().order()
  mockSelect, mockSelectNot, mockOrder,
  // auth
  mockGetUser,
  // restoreLink chain: from('links').update({ deleted_at: null }).eq()
  mockUpdate, mockUpdateEq,
  // deleteLinkPermanently chain: from('links').delete().eq()
  // emptyTrash chain:            from('links').delete().eq('user_id').not()
  mockDelete, mockDeleteEq, mockEmptyNot,
} = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockSelectNot = vi.fn(() => ({ order: mockOrder }))
  const mockSelect = vi.fn(() => ({ not: mockSelectNot }))

  const mockGetUser = vi.fn()

  const mockUpdateEq = vi.fn()
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockEmptyNot = vi.fn()
  const mockDeleteEq = vi.fn((field: string) => {
    if (field === 'user_id') return { not: mockEmptyNot }
    return Promise.resolve({ error: null })
  })
  const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

  return {
    mockSelect, mockSelectNot, mockOrder,
    mockGetUser,
    mockUpdate, mockUpdateEq,
    mockDelete, mockDeleteEq, mockEmptyNot,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    })),
  })),
}))

const RAW_LINK = {
  id: '1', url: 'https://example.com', title: 'Example',
  description: 'A description', site_name: 'example.com',
  status: 'unread', is_favorite: false,
  notes: null, user_id: 'user-1', category_id: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  deleted_at: '2026-06-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockUpdateEq.mockResolvedValue({ error: null })
  mockEmptyNot.mockResolvedValue({ error: null })
})

// ── getTrashedLinks ───────────────────────────────────────────────────────────

describe('getTrashedLinks', () => {
  it('returns trashed links with tags flattened', async () => {
    mockOrder.mockResolvedValue({
      data: [{ ...RAW_LINK, link_tags: [{ tags: { name: 'react' } }, { tags: { name: 'css' } }] }],
      error: null,
    })

    const result = await getTrashedLinks()

    expect(result).toHaveLength(1)
    expect(result[0].tags).toEqual(['react', 'css'])
  })

  it('omits link_tags from the returned objects', async () => {
    mockOrder.mockResolvedValue({
      data: [{ ...RAW_LINK, link_tags: [{ tags: { name: 'react' } }] }],
      error: null,
    })

    const result = await getTrashedLinks()

    expect(result[0]).not.toHaveProperty('link_tags')
  })

  it('returns an empty tags array when link has no tags', async () => {
    mockOrder.mockResolvedValue({ data: [{ ...RAW_LINK, link_tags: [] }], error: null })

    const result = await getTrashedLinks()

    expect(result[0].tags).toEqual([])
  })

  it('skips null tag entries', async () => {
    mockOrder.mockResolvedValue({
      data: [{ ...RAW_LINK, link_tags: [{ tags: null }, { tags: { name: 'react' } }] }],
      error: null,
    })

    const result = await getTrashedLinks()

    expect(result[0].tags).toEqual(['react'])
  })

  it('returns [] on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getTrashedLinks()).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })

    expect(await getTrashedLinks()).toEqual([])
  })

  it('queries with deleted_at IS NOT NULL', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    await getTrashedLinks()

    expect(mockSelectNot).toHaveBeenCalledWith('deleted_at', 'is', null)
  })

  it('orders by deleted_at descending', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    await getTrashedLinks()

    expect(mockOrder).toHaveBeenCalledWith('deleted_at', { ascending: false })
  })

  it('selects link_tags with nested tags', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    await getTrashedLinks()

    expect(mockSelect).toHaveBeenCalledWith('*, link_tags(tags(name))')
  })
})

// ── restoreLink ───────────────────────────────────────────────────────────────

describe('restoreLink', () => {
  it('returns true when the update succeeds', async () => {
    expect(await restoreLink('link-1')).toBe(true)
  })

  it('returns false on DB error', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'DB error' } })

    expect(await restoreLink('link-1')).toBe(false)
  })

  it('sets deleted_at to null', async () => {
    await restoreLink('link-1')

    expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: null })
  })

  it('targets the correct link id', async () => {
    await restoreLink('link-42')

    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'link-42')
  })
})

// ── deleteLinkPermanently ─────────────────────────────────────────────────────

describe('deleteLinkPermanently', () => {
  beforeEach(() => {
    mockDeleteEq.mockImplementation((field: string) => {
      if (field === 'user_id') return { not: mockEmptyNot }
      return Promise.resolve({ error: null })
    })
  })

  it('returns true when the delete succeeds', async () => {
    expect(await deleteLinkPermanently('link-1')).toBe(true)
  })

  it('returns false on DB error', async () => {
    mockDeleteEq.mockImplementation(() => Promise.resolve({ error: { message: 'DB error' } }))

    expect(await deleteLinkPermanently('link-1')).toBe(false)
  })

  it('calls delete on the links table', async () => {
    await deleteLinkPermanently('link-1')

    expect(mockDelete).toHaveBeenCalled()
  })

  it('targets the correct link id', async () => {
    await deleteLinkPermanently('link-42')

    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'link-42')
  })
})

// ── emptyTrash ────────────────────────────────────────────────────────────────

describe('emptyTrash', () => {
  it('returns true when the delete succeeds', async () => {
    expect(await emptyTrash()).toBe(true)
  })

  it('returns false on DB error', async () => {
    mockEmptyNot.mockResolvedValue({ error: { message: 'DB error' } })

    expect(await emptyTrash()).toBe(false)
  })

  it('returns false when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await emptyTrash()).toBe(false)
  })

  it('scopes the delete to the current user', async () => {
    await emptyTrash()

    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('limits deletion to rows where deleted_at IS NOT NULL', async () => {
    await emptyTrash()

    expect(mockEmptyNot).toHaveBeenCalledWith('deleted_at', 'is', null)
  })

  it('does not call delete when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await emptyTrash()

    expect(mockDelete).not.toHaveBeenCalled()
  })
})
