import { describe, it, expect, vi, beforeEach } from 'vitest'
import { wipeVaultData } from '@/lib/services/vault'

const { mockLinksEq, mockTagsEq, mockCategoriesEq, mockCollectionsEq, mockKeysEq } = vi.hoisted(() => ({
  mockCollectionsEq: vi.fn(),
  mockLinksEq: vi.fn(),
  mockTagsEq: vi.fn(),
  mockCategoriesEq: vi.fn(),
  mockKeysEq: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'links') return { delete: vi.fn(() => ({ eq: mockLinksEq })) }
      if (table === 'tags') return { delete: vi.fn(() => ({ eq: mockTagsEq })) }
      if (table === 'categories') return { delete: vi.fn(() => ({ eq: mockCategoriesEq })) }
      if (table === 'collections') return { delete: vi.fn(() => ({ eq: mockCollectionsEq })) }
      if (table === 'user_encryption_keys') return { delete: vi.fn(() => ({ eq: mockKeysEq })) }
      throw new Error(`unexpected table: ${table}`)
    }),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockLinksEq.mockResolvedValue({ error: null })
  mockTagsEq.mockResolvedValue({ error: null })
  mockCategoriesEq.mockResolvedValue({ error: null })
  mockCollectionsEq.mockResolvedValue({ error: null })
  mockKeysEq.mockResolvedValue({ error: null })
})

describe('wipeVaultData', () => {
  it('returns true and deletes links, tags, categories, collections, and the vault key row, all scoped to the user', async () => {
    const result = await wipeVaultData('u1')

    expect(result).toBe(true)
    expect(mockLinksEq).toHaveBeenCalledWith('user_id', 'u1')
    expect(mockTagsEq).toHaveBeenCalledWith('user_id', 'u1')
    expect(mockCategoriesEq).toHaveBeenCalledWith('user_id', 'u1')
    expect(mockCollectionsEq).toHaveBeenCalledWith('user_id', 'u1')
    expect(mockKeysEq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('deletes links, tags, categories, then collections, all before the vault key row', async () => {
    const order: string[] = []
    mockLinksEq.mockImplementation(async () => { order.push('links'); return { error: null } })
    mockTagsEq.mockImplementation(async () => { order.push('tags'); return { error: null } })
    mockCategoriesEq.mockImplementation(async () => { order.push('categories'); return { error: null } })
    mockCollectionsEq.mockImplementation(async () => { order.push('collections'); return { error: null } })
    mockKeysEq.mockImplementation(async () => { order.push('user_encryption_keys'); return { error: null } })

    await wipeVaultData('u1')

    expect(order).toEqual(['links', 'tags', 'categories', 'collections', 'user_encryption_keys'])
  })

  it('returns false and stops without deleting tags when deleting links fails', async () => {
    mockLinksEq.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await wipeVaultData('u1')

    expect(result).toBe(false)
    expect(mockTagsEq).not.toHaveBeenCalled()
  })

  it('returns false and stops without deleting categories when deleting tags fails', async () => {
    mockTagsEq.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await wipeVaultData('u1')

    expect(result).toBe(false)
    expect(mockCategoriesEq).not.toHaveBeenCalled()
  })

  it('returns false and stops without deleting the vault key row when deleting categories fails', async () => {
    mockCategoriesEq.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await wipeVaultData('u1')

    expect(result).toBe(false)
    expect(mockKeysEq).not.toHaveBeenCalled()
  })

  it('returns false and stops without deleting the vault key row when deleting collections fails', async () => {
    mockCollectionsEq.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await wipeVaultData('u1')

    expect(result).toBe(false)
    expect(mockKeysEq).not.toHaveBeenCalled()
  })

  it('returns false when deleting the vault key row fails', async () => {
    mockKeysEq.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await wipeVaultData('u1')

    expect(result).toBe(false)
  })
})
