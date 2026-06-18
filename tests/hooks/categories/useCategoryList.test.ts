// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import type { Category } from '@/lib/services/categories'

const mockGetCategories = vi.hoisted(() => vi.fn())

vi.mock('@/lib/services/categories', () => ({ getCategories: mockGetCategories }))

const MOCK_CATEGORIES: Category[] = [
  { id: '1', user_id: 'u1', name: 'Article', description: null, color: '#3B82F6', emoticon: '📄', created_at: '', updated_at: '' },
  { id: '2', user_id: 'u1', name: 'YouTube', description: null, color: '#FF0000', emoticon: '📺', created_at: '', updated_at: '' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCategoryList', () => {
  it('starts in loading state with empty categories', () => {
    mockGetCategories.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useCategoryList())

    expect(result.current.loading).toBe(true)
    expect(result.current.categories).toEqual([])
  })

  it('populates categories and clears loading after fetch resolves', async () => {
    mockGetCategories.mockResolvedValue(MOCK_CATEGORIES)

    const { result } = renderHook(() => useCategoryList())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toEqual(MOCK_CATEGORIES)
  })

  it('calls getCategories once on mount', async () => {
    mockGetCategories.mockResolvedValue([])

    renderHook(() => useCategoryList())

    await waitFor(() => expect(mockGetCategories).toHaveBeenCalledOnce())
  })

  it('returns empty categories and clears loading on service error', async () => {
    mockGetCategories.mockResolvedValue([])

    const { result } = renderHook(() => useCategoryList())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toEqual([])
  })
})
