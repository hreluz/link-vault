import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCategoryDomains,
  addCategoryDomain,
  removeCategoryDomain,
  getCategoryIdByDomain,
} from '@/lib/services/category-domains'
import type { CategoryDomain } from '@/lib/services/category-domains'

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockOrder,
  mockMaybeSingle,
  mockEq,
  mockSingle,
  mockInsertSelect,
  mockInsert,
  mockDeleteEq,
} = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockEq = vi.fn(() => ({ order: mockOrder, maybeSingle: mockMaybeSingle }))

  const mockSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockDeleteEq = vi.fn()
  const mockGetUser = vi.fn()

  return {
    mockGetUser,
    mockOrder,
    mockMaybeSingle,
    mockEq,
    mockSingle,
    mockInsertSelect,
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

const DOMAIN_A: CategoryDomain = {
  id: 'd1', category_id: 'cat-1', user_id: 'u1',
  domain: 'github.com', created_at: '2026-01-01T00:00:00Z',
}
const DOMAIN_B: CategoryDomain = {
  id: 'd2', category_id: 'cat-1', user_id: 'u1',
  domain: 'youtube.com', created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
})

// ── getCategoryDomains ────────────────────────────────────────────────────────

describe('getCategoryDomains', () => {
  it('returns domains for the given category', async () => {
    mockOrder.mockResolvedValue({ data: [DOMAIN_A, DOMAIN_B], error: null })

    const result = await getCategoryDomains('cat-1')

    expect(result).toEqual([DOMAIN_A, DOMAIN_B])
    expect(mockEq).toHaveBeenCalledWith('category_id', 'cat-1')
    expect(mockOrder).toHaveBeenCalledWith('domain', { ascending: true })
  })

  it('returns [] on DB error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'err' } })

    expect(await getCategoryDomains('cat-1')).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })

    expect(await getCategoryDomains('cat-1')).toEqual([])
  })
})

// ── addCategoryDomain ─────────────────────────────────────────────────────────

describe('addCategoryDomain', () => {
  it('returns the created domain on success', async () => {
    mockSingle.mockResolvedValue({ data: DOMAIN_A, error: null })

    const result = await addCategoryDomain('cat-1', 'github.com')

    expect(result).toEqual({ data: DOMAIN_A, error: null })
  })

  it('inserts with the normalized domain and correct ids', async () => {
    mockSingle.mockResolvedValue({ data: DOMAIN_A, error: null })

    await addCategoryDomain('cat-1', '  GitHub.com  ')

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'cat-1', user_id: 'u1', domain: 'github.com' }),
    )
  })

  it('strips www. prefix from the domain', async () => {
    mockSingle.mockResolvedValue({ data: DOMAIN_A, error: null })

    await addCategoryDomain('cat-1', 'www.github.com')

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'github.com' }),
    )
  })

  it('returns invalid_domain for empty input', async () => {
    const result = await addCategoryDomain('cat-1', '   ')

    expect(result).toEqual({ data: null, error: 'invalid_domain' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns invalid_domain when input has no dot', async () => {
    const result = await addCategoryDomain('cat-1', 'nodot')

    expect(result).toEqual({ data: null, error: 'invalid_domain' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns invalid_domain when input contains spaces', async () => {
    const result = await addCategoryDomain('cat-1', 'bad domain.com')

    expect(result).toEqual({ data: null, error: 'invalid_domain' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await addCategoryDomain('cat-1', 'github.com')

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns domain_taken on unique constraint violation', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'unique' } })

    const result = await addCategoryDomain('cat-1', 'github.com')

    expect(result).toEqual({ data: null, error: 'domain_taken' })
  })

  it('returns db_error on other insert failures', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: '42000', message: 'err' } })

    const result = await addCategoryDomain('cat-1', 'github.com')

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
    mockMaybeSingle.mockResolvedValue({ data: { category_id: 'cat-yt' } })

    const result = await getCategoryIdByDomain('youtube.com')

    expect(result).toBe('cat-yt')
    expect(mockEq).toHaveBeenCalledWith('domain', 'youtube.com')
  })

  it('strips www. when looking up', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { category_id: 'cat-yt' } })

    await getCategoryIdByDomain('www.youtube.com')

    expect(mockEq).toHaveBeenCalledWith('domain', 'youtube.com')
  })

  it('returns null when no domain matches', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })

    expect(await getCategoryIdByDomain('unknown.com')).toBeNull()
  })

  it('returns null for an invalid hostname', async () => {
    expect(await getCategoryIdByDomain('nodot')).toBeNull()
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('returns null for an empty hostname', async () => {
    expect(await getCategoryIdByDomain('')).toBeNull()
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })
})
