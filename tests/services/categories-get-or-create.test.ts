import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { getOrCreateCategoryByName } from '@/lib/services/categories'
import { generateDek, encryptJson } from '@/lib/crypto/vault'

const {
  mockGetUser,
  mockCategoriesSelect,
  mockInsert,
  mockInsertSingle,
} = vi.hoisted(() => {
  const mockCategoriesSelect = vi.fn()
  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))
  const mockGetUser = vi.fn()

  return { mockGetUser, mockCategoriesSelect, mockInsert, mockInsertSingle }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => mockCategoriesSelect()),
      insert: mockInsert,
    })),
  })),
}))

let dek: CryptoKey

beforeAll(async () => {
  dek = await generateDek()
})

async function encryptCategoryRow(id: string, name: string) {
  const { ciphertext, iv } = await encryptJson({ name, description: null, color: null, emoticon: null }, dek)
  return { id, user_id: 'u1', enc_payload: ciphertext, enc_iv: iv, created_at: '', updated_at: '' }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  mockCategoriesSelect.mockResolvedValue({ data: [], error: null })
})

describe('getOrCreateCategoryByName', () => {
  it('returns null when the name is blank', async () => {
    expect(await getOrCreateCategoryByName('   ', dek)).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await getOrCreateCategoryByName('Article', dek)).toBeNull()
  })

  it('returns the existing category id when found', async () => {
    const existing = await encryptCategoryRow('cat-99', 'Article')
    mockCategoriesSelect.mockResolvedValue({ data: [existing], error: null })

    expect(await getOrCreateCategoryByName('Article', dek)).toBe('cat-99')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('performs the lookup case-insensitively', async () => {
    const existing = await encryptCategoryRow('cat-99', 'Article')
    mockCategoriesSelect.mockResolvedValue({ data: [existing], error: null })

    expect(await getOrCreateCategoryByName('article', dek)).toBe('cat-99')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates a new category when not found and returns its id', async () => {
    const row = await encryptCategoryRow('new-cat', 'NewCat')
    mockInsertSingle.mockResolvedValue({ data: row, error: null })

    expect(await getOrCreateCategoryByName('NewCat', dek)).toBe('new-cat')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1' }),
    )
  })

  it('returns null when creation fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getOrCreateCategoryByName('Article', dek)).toBeNull()
  })

  it('trims whitespace from the name before lookup and creation', async () => {
    const row = await encryptCategoryRow('new-cat', 'Article')
    mockInsertSingle.mockResolvedValue({ data: row, error: null })

    const id = await getOrCreateCategoryByName('  Article  ', dek)

    expect(id).toBe('new-cat')
  })
})
