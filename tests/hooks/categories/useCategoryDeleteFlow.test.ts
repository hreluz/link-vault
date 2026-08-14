// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useCategoryDeleteFlow } from '@/lib/hooks/categories/useCategoryDeleteFlow'
import type { Category } from '@/lib/services/categories'

vi.mock('@/lib/services/categories', () => ({
  deleteCategory: vi.fn(),
  getCategoryLinksCount: vi.fn(),
  PROTECTED_CATEGORY_NAME: 'Not defined',
}))

import { deleteCategory, getCategoryLinksCount } from '@/lib/services/categories'
const mockDeleteCategory = vi.mocked(deleteCategory)
const mockGetCategoryLinksCount = vi.mocked(getCategoryLinksCount)

const CAT_A: Category = {
  id: '1', user_id: 'u1', name: 'Article', description: 'Blog posts and articles',
  color: '#3B82F6', emoticon: '📄', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
const CAT_B: Category = {
  id: '2', user_id: 'u1', name: 'YouTube', description: 'Videos and tutorials',
  color: '#FF0000', emoticon: '📺', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
const CAT_PROTECTED: Category = {
  id: '3', user_id: 'u1', name: 'Not defined', description: 'Uncategorized links',
  color: '#94A3B8', emoticon: '🔖', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

function useHarness(initial: Category[] = [CAT_A, CAT_B]) {
  const [categories, setCategories] = useState<Category[]>(initial)
  return { categories, ...useCategoryDeleteFlow(categories, setCategories) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCategoryLinksCount.mockResolvedValue(0)
})

describe('useCategoryDeleteFlow', () => {
  it('deleteError is null initially', () => {
    const { result } = renderHook(() => useHarness())

    expect(result.current.deleteError).toBeNull()
  })

  it('confirmDelete sets deletingId', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })

    expect(result.current.deletingId).toBe(CAT_A.id)
  })

  it('cancelDeleting clears deletingId only', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })
    act(() => { result.current.cancelDeleting() })

    expect(result.current.deletingId).toBeNull()
  })

  it('confirmDelete ignores the protected category', () => {
    const { result } = renderHook(() => useHarness([CAT_A, CAT_B, CAT_PROTECTED]))

    act(() => { result.current.confirmDelete(CAT_PROTECTED.id) })

    expect(result.current.deletingId).toBeNull()
  })

  it('confirmDelete clears a previous deleteError', async () => {
    mockGetCategoryLinksCount.mockResolvedValue(1)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })
    await act(() => result.current.handleDelete(CAT_A.id))
    expect(result.current.deleteError).not.toBeNull()

    act(() => { result.current.confirmDelete(CAT_B.id) })
    expect(result.current.deleteError).toBeNull()
  })

  it('handleDelete calls deleteCategory and removes from list', async () => {
    mockDeleteCategory.mockResolvedValue(true)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })
    await act(() => result.current.handleDelete(CAT_A.id))

    expect(mockDeleteCategory).toHaveBeenCalledWith(CAT_A.id)
    expect(result.current.categories.find(c => c.id === CAT_A.id)).toBeUndefined()
    expect(result.current.deletingId).toBeNull()
  })

  it('handleDelete does not remove from list when service returns false', async () => {
    mockDeleteCategory.mockResolvedValue(false)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })
    await act(() => result.current.handleDelete(CAT_A.id))

    expect(result.current.categories).toHaveLength(2)
  })

  it('handleDelete skips the protected category', async () => {
    const { result } = renderHook(() => useHarness([CAT_A, CAT_B, CAT_PROTECTED]))

    await act(() => result.current.handleDelete(CAT_PROTECTED.id))

    expect(mockDeleteCategory).not.toHaveBeenCalled()
    expect(result.current.categories).toHaveLength(3)
  })

  it('handleDelete sets deleteError and does not delete when category has links', async () => {
    mockGetCategoryLinksCount.mockResolvedValue(3)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })
    await act(() => result.current.handleDelete(CAT_A.id))

    expect(mockDeleteCategory).not.toHaveBeenCalled()
    expect(result.current.categories).toHaveLength(2)
    expect(result.current.deleteError).toBe('This category has 3 links and cannot be deleted.')
  })

  it('handleDelete uses singular "link" when count is 1', async () => {
    mockGetCategoryLinksCount.mockResolvedValue(1)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })
    await act(() => result.current.handleDelete(CAT_A.id))

    expect(result.current.deleteError).toBe('This category has 1 link and cannot be deleted.')
  })

  it('handleDelete keeps deletingId set when category has links', async () => {
    mockGetCategoryLinksCount.mockResolvedValue(2)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })
    await act(() => result.current.handleDelete(CAT_A.id))

    expect(result.current.deletingId).toBe(CAT_A.id)
  })

  it('handleDelete clears deleteError after a successful deletion', async () => {
    mockDeleteCategory.mockResolvedValue(true)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(CAT_A.id) })
    await act(() => result.current.handleDelete(CAT_A.id))

    expect(result.current.deleteError).toBeNull()
  })
})
