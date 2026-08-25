import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { getOrCreateCategoryByName } from '@/lib/services/categories'
import { generateDek, encryptJson, decryptJson } from '@/lib/crypto/vault'

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

  describe('style', () => {
    it('encrypts the given style into the insert payload when creating', async () => {
      const row = await encryptCategoryRow('new-cat', 'Article')
      mockInsertSingle.mockResolvedValue({ data: row, error: null })

      await getOrCreateCategoryByName('Article', dek, { description: 'Blog posts', color: '#3B82F6', emoticon: '📄' })

      const call = mockInsert.mock.calls[0][0]
      const decrypted = await decryptJson<{ name: string; description: string | null; color: string | null; emoticon: string | null }>(
        call.enc_payload, call.enc_iv, dek,
      )
      expect(decrypted).toEqual({ name: 'Article', description: 'Blog posts', color: '#3B82F6', emoticon: '📄' })
    })

    it('falls back to null style fields when no style is given', async () => {
      const row = await encryptCategoryRow('new-cat', 'NewCat')
      mockInsertSingle.mockResolvedValue({ data: row, error: null })

      await getOrCreateCategoryByName('NewCat', dek)

      const call = mockInsert.mock.calls[0][0]
      const decrypted = await decryptJson<{ description: string | null; color: string | null; emoticon: string | null }>(
        call.enc_payload, call.enc_iv, dek,
      )
      expect(decrypted).toEqual(expect.objectContaining({ description: null, color: null, emoticon: null }))
    })

    it('does not apply the given style when the category already exists', async () => {
      const existing = await encryptCategoryRow('cat-99', 'Article')
      mockCategoriesSelect.mockResolvedValue({ data: [existing], error: null })

      const id = await getOrCreateCategoryByName('Article', dek, { color: '#000000' })

      expect(id).toBe('cat-99')
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })
})
