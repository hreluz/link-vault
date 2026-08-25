import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { getAllCategoryDomains } from '@/lib/services/category-domains'
import { generateDek, encryptJson } from '@/lib/crypto/vault'

const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({ select: mockSelect })),
  })),
}))

let dek: CryptoKey

beforeAll(async () => {
  dek = await generateDek()
})

async function encryptDomainRow(id: string, categoryId: string, domain: string) {
  const { ciphertext, iv } = await encryptJson({ domain }, dek)
  return { id, category_id: categoryId, user_id: 'u1', enc_payload: ciphertext, enc_iv: iv, created_at: '2026-01-01T00:00:00Z' }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAllCategoryDomains', () => {
  it('decrypts and returns every domain across all categories, sorted', async () => {
    const b = await encryptDomainRow('d2', 'cat-1', 'youtube.com')
    const a = await encryptDomainRow('d1', 'cat-2', 'github.com')
    mockSelect.mockResolvedValue({ data: [b, a], error: null })

    const result = await getAllCategoryDomains(dek)

    expect(result.map(d => d.domain)).toEqual(['github.com', 'youtube.com'])
  })

  it('selects without scoping to a single category', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null })

    await getAllCategoryDomains(dek)

    expect(mockSelect).toHaveBeenCalledWith('*')
  })

  it('returns [] on DB error', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'err' } })

    expect(await getAllCategoryDomains(dek)).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null })

    expect(await getAllCategoryDomains(dek)).toEqual([])
  })
})
