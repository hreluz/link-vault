// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCategories } from '@/lib/hooks/categories/useCategories'
import type { Category } from '@/lib/services/categories'

vi.mock('@/lib/services/categories', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/services/categories'
const mockGetCategories = vi.mocked(getCategories)
const mockCreateCategory = vi.mocked(createCategory)
const mockUpdateCategory = vi.mocked(updateCategory)
const mockDeleteCategory = vi.mocked(deleteCategory)

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

  describe('add form', () => {
    it('starts with adding=false', async () => {
      const { result } = await renderLoaded()
      expect(result.current.adding).toBe(false)
    })

    it('openAdd sets adding=true and clears editingId/deletingId', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd() })

      expect(result.current.adding).toBe(true)
      expect(result.current.editingId).toBeNull()
      expect(result.current.deletingId).toBeNull()
    })

    it('closeAdd resets adding and clears form fields', async () => {
      const { result } = await renderLoaded()

      act(() => {
        result.current.openAdd()
        result.current.setNewName('Test')
        result.current.setNewIcon('🎯')
      })
      act(() => { result.current.closeAdd() })

      expect(result.current.adding).toBe(false)
      expect(result.current.newName).toBe('')
      expect(result.current.newIcon).toBe('')
    })

    it('handleAdd calls createCategory and appends the result', async () => {
      const created: Category = { ...CAT_A, id: '99', name: 'New Cat', emoticon: '🎯' }
      mockCreateCategory.mockResolvedValue(created)
      const { result } = await renderLoaded()

      act(() => {
        result.current.openAdd()
        result.current.setNewName('New Cat')
        result.current.setNewIcon('🎯')
      })
      await act(() => result.current.handleAdd())

      expect(mockCreateCategory).toHaveBeenCalledWith({ name: 'New Cat', emoticon: '🎯' })
      expect(result.current.categories).toContainEqual(created)
      expect(result.current.adding).toBe(false)
    })

    it('handleAdd does nothing when name is empty', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd() })
      await act(() => result.current.handleAdd())

      expect(mockCreateCategory).not.toHaveBeenCalled()
    })

    it('handleAdd does not append when createCategory returns null', async () => {
      mockCreateCategory.mockResolvedValue(null)
      const { result } = await renderLoaded()

      act(() => {
        result.current.openAdd()
        result.current.setNewName('New Cat')
      })
      await act(() => result.current.handleAdd())

      expect(result.current.categories).toHaveLength(2)
    })
  })

  describe('edit', () => {
    it('startEdit sets editingId and populates edit fields', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.startEdit(CAT_A) })

      expect(result.current.editingId).toBe(CAT_A.id)
      expect(result.current.editName).toBe(CAT_A.name)
      expect(result.current.editIcon).toBe(CAT_A.emoticon)
    })

    it('startEdit closes the add form', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd() })
      act(() => { result.current.startEdit(CAT_A) })

      expect(result.current.adding).toBe(false)
    })

    it('handleSaveEdit calls updateCategory and updates the list', async () => {
      const updated: Category = { ...CAT_A, name: 'Renamed', emoticon: '🆕' }
      mockUpdateCategory.mockResolvedValue(updated)
      const { result } = await renderLoaded()

      act(() => {
        result.current.startEdit(CAT_A)
        result.current.setEditName('Renamed')
        result.current.setEditIcon('🆕')
      })
      await act(() => result.current.handleSaveEdit())

      expect(mockUpdateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ id: CAT_A.id, name: 'Renamed', emoticon: '🆕' }),
      )
      expect(result.current.categories.find(c => c.id === CAT_A.id)).toEqual(updated)
      expect(result.current.editingId).toBeNull()
    })

    it('handleSaveEdit does not call service when name is empty', async () => {
      const { result } = await renderLoaded()

      act(() => {
        result.current.startEdit(CAT_A)
        result.current.setEditName('')
      })
      await act(() => result.current.handleSaveEdit())

      expect(mockUpdateCategory).not.toHaveBeenCalled()
    })

    it('handleSaveEdit does not update list when service returns null', async () => {
      mockUpdateCategory.mockResolvedValue(null)
      const { result } = await renderLoaded()

      act(() => { result.current.startEdit(CAT_A) })
      await act(() => result.current.handleSaveEdit())

      expect(result.current.categories[0]).toEqual(CAT_A)
    })
  })

  describe('delete', () => {
    it('confirmDelete sets deletingId and closes other forms', async () => {
      const { result } = await renderLoaded()

      act(() => {
        result.current.openAdd()
        result.current.confirmDelete(CAT_A.id)
      })

      expect(result.current.deletingId).toBe(CAT_A.id)
      expect(result.current.adding).toBe(false)
      expect(result.current.editingId).toBeNull()
    })

    it('handleDelete calls deleteCategory and removes from list', async () => {
      mockDeleteCategory.mockResolvedValue(true)
      const { result } = await renderLoaded()

      act(() => { result.current.confirmDelete(CAT_A.id) })
      await act(() => result.current.handleDelete(CAT_A.id))

      expect(mockDeleteCategory).toHaveBeenCalledWith(CAT_A.id)
      expect(result.current.categories.find(c => c.id === CAT_A.id)).toBeUndefined()
      expect(result.current.deletingId).toBeNull()
    })

    it('handleDelete does not remove from list when service returns false', async () => {
      mockDeleteCategory.mockResolvedValue(false)
      const { result } = await renderLoaded()

      act(() => { result.current.confirmDelete(CAT_A.id) })
      await act(() => result.current.handleDelete(CAT_A.id))

      expect(result.current.categories).toHaveLength(2)
    })
  })
})
