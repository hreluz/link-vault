import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCategories, createCategory, updateCategory, deleteCategory, seedDefaultCategories, DEFAULT_CATEGORIES } from '@/lib/services/categories'
import type { Category } from '@/lib/services/categories'

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockOrder,
  mockNameCheckMaybeSingle,
  mockIlike,
  mockNeq,
  mockInsert, mockInsertSingle,
  mockUpdate, mockUpdateEq, mockUpdateSingle,
  mockDeleteEq,
  mockNameCheckEq,
} = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockGetUser = vi.fn()

  // name-check chain: select().eq().ilike().maybeSingle()   (create)
  //                   select().eq().ilike().neq().maybeSingle()  (update)
  const mockNameCheckMaybeSingle = vi.fn()
  const mockNeq = vi.fn(() => ({ maybeSingle: mockNameCheckMaybeSingle }))
  const mockIlike = vi.fn(() => ({ maybeSingle: mockNameCheckMaybeSingle, neq: mockNeq }))
  const mockNameCheckEq = vi.fn(() => ({ ilike: mockIlike }))

  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockUpdateSingle = vi.fn()
  const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
  const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockDeleteEq = vi.fn()
  const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

  return {
    mockGetUser,
    mockOrder,
    mockNameCheckMaybeSingle,
    mockIlike,
    mockNeq,
    mockNameCheckEq,
    mockInsert, mockInsertSingle,
    mockUpdate, mockUpdateEq, mockUpdateSingle,
    mockDeleteEq, mockDelete,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: mockOrder, eq: mockNameCheckEq })),
      insert: mockInsert,
      update: mockUpdate,
      delete: vi.fn(() => ({ eq: mockDeleteEq })),
    })),
  })),
}))

// ── helper: injectable mock client for seedDefaultCategories ──────────────────

function makeSeedClient({
  count = 0,
  countError = null,
}: {
  count?: number | null
  countError?: object | null
} = {}) {
  const mockInsertSeed = vi.fn().mockResolvedValue({ error: null })
  const mockEq = vi.fn().mockResolvedValue({ count, error: countError })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  const from = vi.fn().mockReturnValue({ select: mockSelect, insert: mockInsertSeed })

  return { client: { from } as unknown as ReturnType<typeof import('@/lib/supabase/client').createClient>, mockInsert: mockInsertSeed, from }
}

const MOCK_CAT: Category = {
  id: '1', user_id: 'u1', name: 'Article', description: 'Blog posts',
  color: '#3B82F6', emoticon: '📄', created_at: '', updated_at: '',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getCategories ─────────────────────────────────────────────────────────────

describe('getCategories', () => {
  it('returns categories ordered alphabetically by name', async () => {
    mockOrder.mockResolvedValue({ data: [MOCK_CAT], error: null })

    const result = await getCategories()

    expect(result).toEqual([MOCK_CAT])
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

// ── createCategory ────────────────────────────────────────────────────────────

describe('createCategory', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockNameCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('returns the created category on success', async () => {
    mockInsertSingle.mockResolvedValue({ data: MOCK_CAT, error: null })

    const result = await createCategory({ name: 'Article', emoticon: '📄', color: '#3B82F6' })

    expect(result).toEqual({ data: MOCK_CAT, error: null })
  })

  it('includes name, emoticon, and color in the insert payload', async () => {
    mockInsertSingle.mockResolvedValue({ data: MOCK_CAT, error: null })

    await createCategory({ name: 'Article', emoticon: '📄', color: 'indigo' })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Article', emoticon: '📄', color: 'indigo', user_id: 'u1' }),
    )
  })

  it('returns name_taken when a category with the same name exists', async () => {
    mockNameCheckMaybeSingle.mockResolvedValue({ data: { id: '99' }, error: null })

    const result = await createCategory({ name: 'Article' })

    expect(result).toEqual({ data: null, error: 'name_taken' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('performs the name check case-insensitively', async () => {
    mockNameCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsertSingle.mockResolvedValue({ data: MOCK_CAT, error: null })

    await createCategory({ name: 'article' })

    expect(mockIlike).toHaveBeenCalledWith('name', 'article')
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createCategory({ name: 'Article' })

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns db_error on insert failure', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await createCategory({ name: 'Article' })

    expect(result).toEqual({ data: null, error: 'db_error' })
  })
})

// ── updateCategory ────────────────────────────────────────────────────────────

describe('updateCategory', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockNameCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('returns the updated category on success', async () => {
    const updated = { ...MOCK_CAT, name: 'Updated', emoticon: '🆕' }
    mockUpdateSingle.mockResolvedValue({ data: updated, error: null })

    const result = await updateCategory({ id: '1', name: 'Updated', emoticon: '🆕' })

    expect(result).toEqual({ data: updated, error: null })
  })

  it('filters by id when updating', async () => {
    mockUpdateSingle.mockResolvedValue({ data: MOCK_CAT, error: null })

    await updateCategory({ id: 'cat-99', name: 'X' })

    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'cat-99')
  })

  it('excludes the current category from the name-conflict check', async () => {
    mockUpdateSingle.mockResolvedValue({ data: MOCK_CAT, error: null })

    await updateCategory({ id: 'cat-99', name: 'Article' })

    expect(mockNeq).toHaveBeenCalledWith('id', 'cat-99')
  })

  it('performs the name-conflict check case-insensitively', async () => {
    mockUpdateSingle.mockResolvedValue({ data: MOCK_CAT, error: null })

    await updateCategory({ id: '1', name: 'article' })

    expect(mockIlike).toHaveBeenCalledWith('name', 'article')
  })

  it('returns name_taken when another category has the same name', async () => {
    mockNameCheckMaybeSingle.mockResolvedValue({ data: { id: '99' }, error: null })

    const result = await updateCategory({ id: '1', name: 'Article' })

    expect(result).toEqual({ data: null, error: 'name_taken' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await updateCategory({ id: '1', name: 'Article' })

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns db_error on update failure', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await updateCategory({ id: '1', name: 'X' })

    expect(result).toEqual({ data: null, error: 'db_error' })
  })
})

// ── deleteCategory ────────────────────────────────────────────────────────────

describe('deleteCategory', () => {
  it('returns true when the delete succeeds', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    expect(await deleteCategory('cat-1')).toBe(true)
  })

  it('filters by id', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    await deleteCategory('cat-42')

    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'cat-42')
  })

  it('returns false on DB error', async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: 'DB error' } })

    expect(await deleteCategory('cat-1')).toBe(false)
  })
})

// ── seedDefaultCategories ─────────────────────────────────────────────────────

describe('seedDefaultCategories', () => {
  it('inserts all default categories when the user has none', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123')

    expect(mockInsertSeed).toHaveBeenCalledOnce()
    expect(mockInsertSeed).toHaveBeenCalledWith(
      DEFAULT_CATEGORIES.map(cat => ({ ...cat, user_id: 'user-123' })),
    )
  })

  it('skips insertion when the user already has categories', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 3 })

    await seedDefaultCategories(client, 'user-123')

    expect(mockInsertSeed).not.toHaveBeenCalled()
  })

  it('skips insertion when the count query fails', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: null, countError: { message: 'error' } })

    await seedDefaultCategories(client, 'user-123')

    expect(mockInsertSeed).not.toHaveBeenCalled()
  })

  it('inserts exactly 8 categories', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123')

    const [inserted] = mockInsertSeed.mock.calls[0]
    expect(inserted).toHaveLength(8)
  })

  it('sets user_id on every inserted category', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-abc')

    const [inserted] = mockInsertSeed.mock.calls[0]
    expect(inserted.every((c: { user_id: string }) => c.user_id === 'user-abc')).toBe(true)
  })
})
