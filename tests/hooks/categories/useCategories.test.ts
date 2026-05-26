// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCategories } from '@/lib/hooks/categories/useCategories'
import type { Category } from '@/lib/services/categories'

vi.mock('@/lib/services/categories', () => ({
  getCategories: vi.fn(),
}))

import { getCategories } from '@/lib/services/categories'
const mockGetCategories = vi.mocked(getCategories)

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

async function renderLoaded() {
  const utils = renderHook(() => useCategories())
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useCategories', () => {
  describe('initial state', () => {
    it('starts in loading state with no categories', () => {
      const { result } = renderHook(() => useCategories())

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
  })
})
