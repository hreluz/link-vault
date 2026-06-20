import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrCreateCategoryByName } from '@/lib/services/categories'
import type { Category } from '@/lib/services/categories'

const {
  mockGetUser,
  mockMaybeSingle,
  mockIlike,
  mockNameCheckEq,
  mockInsert,
  mockInsertSingle,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockIlike = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
  const mockNameCheckEq = vi.fn(() => ({ ilike: mockIlike }))

  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockGetUser = vi.fn()

  return { mockGetUser, mockMaybeSingle, mockIlike, mockNameCheckEq, mockInsert, mockInsertSingle }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: mockNameCheckEq })),
      insert: mockInsert,
    })),
  })),
}))

const MOCK_CAT: Category = {
  id: 'cat-1', user_id: 'u1', name: 'Article', description: null,
  color: null, emoticon: null, created_at: '', updated_at: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  mockMaybeSingle.mockResolvedValue({ data: null, error: null })
})

describe('getOrCreateCategoryByName', () => {
  it('returns null when the name is blank', async () => {
    expect(await getOrCreateCategoryByName('   ')).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await getOrCreateCategoryByName('Article')).toBeNull()
  })

  it('returns the existing category id when found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'cat-99' }, error: null })

    expect(await getOrCreateCategoryByName('Article')).toBe('cat-99')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('performs the lookup case-insensitively', async () => {
    mockInsertSingle.mockResolvedValue({ data: MOCK_CAT, error: null })

    await getOrCreateCategoryByName('article')

    expect(mockIlike).toHaveBeenCalledWith('name', 'article')
  })

  it('creates a new category when not found and returns its id', async () => {
    mockInsertSingle.mockResolvedValue({ data: { ...MOCK_CAT, id: 'new-cat' }, error: null })

    expect(await getOrCreateCategoryByName('NewCat')).toBe('new-cat')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NewCat', user_id: 'u1' }),
    )
  })

  it('returns null when creation fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getOrCreateCategoryByName('Article')).toBeNull()
  })

  it('trims whitespace from the name before lookup and creation', async () => {
    mockInsertSingle.mockResolvedValue({ data: { ...MOCK_CAT, id: 'new-cat' }, error: null })

    await getOrCreateCategoryByName('  Article  ')

    expect(mockIlike).toHaveBeenCalledWith('name', 'Article')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Article' }),
    )
  })
})
