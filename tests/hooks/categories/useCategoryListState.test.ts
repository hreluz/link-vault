// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCategoryListState } from '@/lib/hooks/categories/useCategoryListState'
import type { Category } from '@/lib/services/categories'

vi.mock('@/lib/services/categories', () => ({
  getCategories: vi.fn(),
}))

import { getCategories } from '@/lib/services/categories'
const mockGetCategories = vi.mocked(getCategories)

const FAKE_DEK = {} as CryptoKey

const CAT_A: Category = {
  id: '1', user_id: 'u1', name: 'Article', description: 'Blog posts and articles',
  color: '#3B82F6', emoticon: '📄', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
const CAT_B: Category = {
  id: '2', user_id: 'u1', name: 'YouTube', description: 'Videos and tutorials',
  color: '#FF0000', emoticon: '📺', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCategories.mockResolvedValue([CAT_A, CAT_B])
})

async function renderLoaded(dek: CryptoKey | null = FAKE_DEK) {
  const utils = renderHook(() => useCategoryListState(dek))
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useCategoryListState', () => {
  it('starts in loading state with no categories', () => {
    const { result } = renderHook(() => useCategoryListState(FAKE_DEK))

    expect(result.current.loading).toBe(true)
    expect(result.current.categories).toHaveLength(0)
  })

  it('loads categories from the service and clears loading', async () => {
    const { result } = await renderLoaded()

    expect(result.current.categories).toHaveLength(2)
    expect(result.current.loading).toBe(false)
  })

  it('exposes the full category objects returned by the service', async () => {
    const { result } = await renderLoaded()

    expect(result.current.categories[0]).toEqual(CAT_A)
    expect(result.current.categories[1]).toEqual(CAT_B)
  })

  it('returns an empty list when the service returns none', async () => {
    mockGetCategories.mockResolvedValue([])
    const { result } = await renderLoaded()

    expect(result.current.categories).toHaveLength(0)
  })

  it('does not fetch when dek is null', () => {
    renderHook(() => useCategoryListState(null))

    expect(mockGetCategories).not.toHaveBeenCalled()
  })

  describe('search / filteredCategories', () => {
    it('filteredCategories matches all categories when search is empty', async () => {
      const { result } = await renderLoaded()

      expect(result.current.filteredCategories).toHaveLength(2)
    })

    it('filteredCategories narrows by case-insensitive name substring', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.setSearch('you') })

      expect(result.current.filteredCategories).toEqual([CAT_B])
    })

    it('filteredCategories is empty when nothing matches', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.setSearch('zzz') })

      expect(result.current.filteredCategories).toHaveLength(0)
    })
  })
})
