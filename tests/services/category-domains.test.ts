import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import {
  getCategoryDomains,
  addCategoryDomain,
  removeCategoryDomain,
  getCategoryIdByDomain,
} from '@/lib/services/category-domains'
import { generateDek, encryptJson } from '@/lib/crypto/vault'

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockEq,
  mockSingle,
  mockInsert,
  mockDeleteEq,
} = vi.hoisted(() => {
  const mockEq = vi.fn()

  const mockSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockDeleteEq = vi.fn()
  const mockGetUser = vi.fn()

  return {
    mockGetUser,
    mockEq,
    mockSingle,
    mockInsert,
    mockDeleteEq,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: mockEq })),
      insert: mockInsert,
      delete: vi.fn(() => ({ eq: mockDeleteEq })),
    })),
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
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
})

// ── getCategoryDomains ────────────────────────────────────────────────────────

describe('getCategoryDomains', () => {
  it('decrypts and returns domains for the given category, sorted', async () => {
    const b = await encryptDomainRow('d2', 'cat-1', 'youtube.com')
    const a = await encryptDomainRow('d1', 'cat-1', 'github.com')
    mockEq.mockResolvedValue({ data: [b, a], error: null })

    const result = await getCategoryDomains('cat-1', dek)

    expect(result.map(d => d.domain)).toEqual(['github.com', 'youtube.com'])
    expect(mockEq).toHaveBeenCalledWith('category_id', 'cat-1')
  })

  it('returns [] on DB error', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'err' } })

    expect(await getCategoryDomains('cat-1', dek)).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockEq.mockResolvedValue({ data: null, error: null })

    expect(await getCategoryDomains('cat-1', dek)).toEqual([])
  })
})

// ── addCategoryDomain ─────────────────────────────────────────────────────────

describe('addCategoryDomain', () => {
  beforeEach(() => {
    mockEq.mockResolvedValue({ data: [], error: null })
  })

  it('returns the created domain on success', async () => {
    const row = await encryptDomainRow('d1', 'cat-1', 'github.com')
    mockSingle.mockResolvedValue({ data: row, error: null })

    const result = await addCategoryDomain('cat-1', 'github.com', dek)

    expect(result.data?.domain).toBe('github.com')
    expect(result.error).toBeNull()
  })

  it('encrypts the normalized domain with correct ids into the insert payload', async () => {
    const row = await encryptDomainRow('d1', 'cat-1', 'github.com')
    mockSingle.mockResolvedValue({ data: row, error: null })

    await addCategoryDomain('cat-1', '  GitHub.com  ', dek)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'cat-1', user_id: 'u1' }),
    )
  })

  it('strips www. prefix from the domain', async () => {
    const row = await encryptDomainRow('d1', 'cat-1', 'github.com')
    mockSingle.mockResolvedValue({ data: row, error: null })

    const result = await addCategoryDomain('cat-1', 'www.github.com', dek)

    expect(result.data?.domain).toBe('github.com')
  })

  it('returns invalid_domain for empty input', async () => {
    const result = await addCategoryDomain('cat-1', '   ', dek)

    expect(result).toEqual({ data: null, error: 'invalid_domain' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns invalid_domain when input has no dot', async () => {
    const result = await addCategoryDomain('cat-1', 'nodot', dek)

    expect(result).toEqual({ data: null, error: 'invalid_domain' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns invalid_domain when input contains spaces', async () => {
    const result = await addCategoryDomain('cat-1', 'bad domain.com', dek)

    expect(result).toEqual({ data: null, error: 'invalid_domain' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await addCategoryDomain('cat-1', 'github.com', dek)

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns domain_taken when the decrypted existing domains already contain it', async () => {
    const existing = await encryptDomainRow('d1', 'cat-2', 'github.com')
    mockEq.mockResolvedValue({ data: [existing], error: null })

    const result = await addCategoryDomain('cat-1', 'github.com', dek)

    expect(result).toEqual({ data: null, error: 'domain_taken' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns db_error on insert failure', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'err' } })

    const result = await addCategoryDomain('cat-1', 'github.com', dek)

    expect(result).toEqual({ data: null, error: 'db_error' })
  })
})

// ── removeCategoryDomain ──────────────────────────────────────────────────────

describe('removeCategoryDomain', () => {
  it('returns true on success', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    expect(await removeCategoryDomain('d1')).toBe(true)
  })

  it('filters by id', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    await removeCategoryDomain('d42')

    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'd42')
  })

  it('returns false on DB error', async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: 'err' } })

    expect(await removeCategoryDomain('d1')).toBe(false)
  })
})

// ── getCategoryIdByDomain ─────────────────────────────────────────────────────

describe('getCategoryIdByDomain', () => {
  it('returns the category_id for a matched domain', async () => {
    const row = await encryptDomainRow('d1', 'cat-yt', 'youtube.com')
    mockEq.mockResolvedValue({ data: [row], error: null })

    const result = await getCategoryIdByDomain('youtube.com', dek)

    expect(result).toBe('cat-yt')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('strips www. when looking up', async () => {
    const row = await encryptDomainRow('d1', 'cat-yt', 'youtube.com')
    mockEq.mockResolvedValue({ data: [row], error: null })

    const result = await getCategoryIdByDomain('www.youtube.com', dek)

    expect(result).toBe('cat-yt')
  })

  it('returns null when no domain matches', async () => {
    const row = await encryptDomainRow('d1', 'cat-yt', 'youtube.com')
    mockEq.mockResolvedValue({ data: [row], error: null })

    expect(await getCategoryIdByDomain('unknown.com', dek)).toBeNull()
  })

  it('returns null for an invalid hostname', async () => {
    expect(await getCategoryIdByDomain('nodot', dek)).toBeNull()
    expect(mockEq).not.toHaveBeenCalled()
  })

  it('returns null for an empty hostname', async () => {
    expect(await getCategoryIdByDomain('', dek)).toBeNull()
    expect(mockEq).not.toHaveBeenCalled()
  })
})
