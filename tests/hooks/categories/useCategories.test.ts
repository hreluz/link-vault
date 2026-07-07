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
  getCategoryLinksCount: vi.fn(),
  PROTECTED_CATEGORY_NAME: 'Not defined',
}))

const FAKE_DEK = {} as CryptoKey
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

import { getCategories, createCategory, updateCategory, deleteCategory, getCategoryLinksCount } from '@/lib/services/categories'
const mockGetCategories = vi.mocked(getCategories)
const mockCreateCategory = vi.mocked(createCategory)
const mockUpdateCategory = vi.mocked(updateCategory)
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

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCategories.mockResolvedValue([CAT_A, CAT_B])
  mockGetCategoryLinksCount.mockResolvedValue(0)
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
    it('starts with adding=false and no error', async () => {
      const { result } = await renderLoaded()
      expect(result.current.adding).toBe(false)
      expect(result.current.addError).toBeNull()
    })

    it('openAdd sets adding=true and clears editingId/deletingId/addError', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd() })

      expect(result.current.adding).toBe(true)
      expect(result.current.editingId).toBeNull()
      expect(result.current.deletingId).toBeNull()
      expect(result.current.addError).toBeNull()
    })

    it('closeAdd resets adding, clears form fields and error', async () => {
      const { result } = await renderLoaded()

      act(() => {
        result.current.openAdd()
        result.current.setNewName('Test')
        result.current.setNewIcon('🎯')
        result.current.setNewColor('rose')
      })
      act(() => { result.current.closeAdd() })

      expect(result.current.adding).toBe(false)
      expect(result.current.newName).toBe('')
      expect(result.current.newIcon).toBe('')
      expect(result.current.newColor).toBe('indigo')
      expect(result.current.addError).toBeNull()
    })

    it('handleAdd calls createCategory and appends the result', async () => {
      const created: Category = { ...CAT_A, id: '99', name: 'New Cat', emoticon: '🎯' }
      mockCreateCategory.mockResolvedValue({ data: created, error: null })
      const { result } = await renderLoaded()

      act(() => {
        result.current.openAdd()
        result.current.setNewName('New Cat')
        result.current.setNewIcon('🎯')
        result.current.setNewColor('emerald')
      })
      await act(() => result.current.handleAdd())

      expect(mockCreateCategory).toHaveBeenCalledWith({ name: 'New Cat', emoticon: '🎯', color: 'emerald' }, FAKE_DEK)
      expect(result.current.categories).toContainEqual(created)
      expect(result.current.adding).toBe(false)
      expect(result.current.addError).toBeNull()
    })

    it('handleAdd sets addError and keeps form open when name is taken', async () => {
      mockCreateCategory.mockResolvedValue({ data: null, error: 'name_taken' })
      const { result } = await renderLoaded()

      act(() => {
        result.current.openAdd()
        result.current.setNewName('Article')
      })
      await act(() => result.current.handleAdd())

      expect(result.current.addError).toBe('A category with that name already exists.')
      expect(result.current.adding).toBe(true)
      expect(result.current.categories).toHaveLength(2)
    })

    it('openAdd clears a previous addError', async () => {
      mockCreateCategory.mockResolvedValue({ data: null, error: 'name_taken' })
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd(); result.current.setNewName('Article') })
      await act(() => result.current.handleAdd())
      expect(result.current.addError).not.toBeNull()

      act(() => { result.current.openAdd() })
      expect(result.current.addError).toBeNull()
    })

    it('handleAdd does nothing when name is empty', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd() })
      await act(() => result.current.handleAdd())

      expect(mockCreateCategory).not.toHaveBeenCalled()
    })

    it('handleAdd uses 🔗 as default emoticon when icon is empty', async () => {
      mockCreateCategory.mockResolvedValue({ data: CAT_A, error: null })
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd(); result.current.setNewName('Article') })
      await act(() => result.current.handleAdd())

      expect(mockCreateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ emoticon: '🔗' }), FAKE_DEK,
      )
    })

    it('handleAdd passes the selected color to createCategory', async () => {
      mockCreateCategory.mockResolvedValue({ data: CAT_A, error: null })
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd(); result.current.setNewName('Article'); result.current.setNewColor('rose') })
      await act(() => result.current.handleAdd())

      expect(mockCreateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'rose' }), FAKE_DEK,
      )
    })

    it('handleAdd defaults to indigo color when none is set', async () => {
      mockCreateCategory.mockResolvedValue({ data: CAT_A, error: null })
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd(); result.current.setNewName('Article') })
      await act(() => result.current.handleAdd())

      expect(mockCreateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'indigo' }), FAKE_DEK,
      )
    })

    it('handleAdd closes the form without appending on db_error', async () => {
      mockCreateCategory.mockResolvedValue({ data: null, error: 'db_error' })
      const { result } = await renderLoaded()

      act(() => {
        result.current.openAdd()
        result.current.setNewName('New Cat')
      })
      await act(() => result.current.handleAdd())

      expect(result.current.categories).toHaveLength(2)
      expect(result.current.adding).toBe(false)
    })
  })

  describe('edit', () => {
    it('startEdit sets editingId and populates edit fields', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.startEdit(CAT_A) })

      expect(result.current.editingId).toBe(CAT_A.id)
      expect(result.current.editName).toBe(CAT_A.name)
      expect(result.current.editIcon).toBe(CAT_A.emoticon)
      expect(result.current.editColor).toBe(CAT_A.color)
    })

    it('startEdit closes the add form', async () => {
      const { result } = await renderLoaded()

      act(() => { result.current.openAdd() })
      act(() => { result.current.startEdit(CAT_A) })

      expect(result.current.adding).toBe(false)
    })

    it('startEdit clears a previous editError', async () => {
      mockUpdateCategory.mockResolvedValue({ data: null, error: 'name_taken' })
      const { result } = await renderLoaded()

      act(() => { result.current.startEdit(CAT_A) })
      await act(() => result.current.handleSaveEdit())
      expect(result.current.editError).not.toBeNull()

      act(() => { result.current.startEdit(CAT_B) })
      expect(result.current.editError).toBeNull()
    })

    it('handleSaveEdit calls updateCategory and updates the list', async () => {
      const updated: Category = { ...CAT_A, name: 'Renamed', emoticon: '🆕' }
      mockUpdateCategory.mockResolvedValue({ data: updated, error: null })
      const { result } = await renderLoaded()

      act(() => {
        result.current.startEdit(CAT_A)
        result.current.setEditName('Renamed')
        result.current.setEditIcon('🆕')
        result.current.setEditColor('sky')
      })
      await act(() => result.current.handleSaveEdit())

      expect(mockUpdateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ id: CAT_A.id, name: 'Renamed', emoticon: '🆕', color: 'sky' }), FAKE_DEK,
      )
      expect(result.current.categories.find(c => c.id === CAT_A.id)).toEqual(updated)
      expect(result.current.editingId).toBeNull()
      expect(result.current.editError).toBeNull()
    })

    it('handleSaveEdit passes the selected color to updateCategory', async () => {
      mockUpdateCategory.mockResolvedValue({ data: CAT_A, error: null })
      const { result } = await renderLoaded()

      act(() => { result.current.startEdit(CAT_A); result.current.setEditColor('purple') })
      await act(() => result.current.handleSaveEdit())

      expect(mockUpdateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'purple' }), FAKE_DEK,
      )
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

    it('handleSaveEdit uses 🔗 as default emoticon when editIcon is empty', async () => {
      mockUpdateCategory.mockResolvedValue({ data: CAT_A, error: null })
      const { result } = await renderLoaded()

      act(() => {
        result.current.startEdit(CAT_A)
        result.current.setEditIcon('')
      })
      await act(() => result.current.handleSaveEdit())

      expect(mockUpdateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ emoticon: '🔗' }), FAKE_DEK,
      )
    })

    it('handleSaveEdit sets editError and keeps form open when name is taken', async () => {
      mockUpdateCategory.mockResolvedValue({ data: null, error: 'name_taken' })
      const { result } = await renderLoaded()

      act(() => { result.current.startEdit(CAT_A) })
      await act(() => result.current.handleSaveEdit())

      expect(result.current.editError).toBe('A category with that name already exists.')
      expect(result.current.editingId).toBe(CAT_A.id)
      expect(result.current.categories[0]).toEqual(CAT_A)
    })

    it('handleSaveEdit does not update list on db_error', async () => {
      mockUpdateCategory.mockResolvedValue({ data: null, error: 'db_error' })
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

    it('confirmDelete ignores the protected category', async () => {
      mockGetCategories.mockResolvedValue([CAT_A, CAT_B, CAT_PROTECTED])
      const { result } = await renderLoaded()

      act(() => { result.current.confirmDelete(CAT_PROTECTED.id) })

      expect(result.current.deletingId).toBeNull()
    })

    it('handleDelete skips the protected category', async () => {
      mockGetCategories.mockResolvedValue([CAT_A, CAT_B, CAT_PROTECTED])
      const { result } = await renderLoaded()

      await act(() => result.current.handleDelete(CAT_PROTECTED.id))

      expect(mockDeleteCategory).not.toHaveBeenCalled()
      expect(result.current.categories).toHaveLength(3)
    })

    it('deleteError is null initially', async () => {
      const { result } = await renderLoaded()

      expect(result.current.deleteError).toBeNull()
    })

    it('handleDelete sets deleteError and does not delete when category has links', async () => {
      mockGetCategoryLinksCount.mockResolvedValue(3)
      const { result } = await renderLoaded()

      act(() => { result.current.confirmDelete(CAT_A.id) })
      await act(() => result.current.handleDelete(CAT_A.id))

      expect(mockDeleteCategory).not.toHaveBeenCalled()
      expect(result.current.categories).toHaveLength(2)
      expect(result.current.deleteError).toBe('This category has 3 links and cannot be deleted.')
    })

    it('handleDelete uses singular "link" when count is 1', async () => {
      mockGetCategoryLinksCount.mockResolvedValue(1)
      const { result } = await renderLoaded()

      act(() => { result.current.confirmDelete(CAT_A.id) })
      await act(() => result.current.handleDelete(CAT_A.id))

      expect(result.current.deleteError).toBe('This category has 1 link and cannot be deleted.')
    })

    it('handleDelete keeps deletingId set when category has links', async () => {
      mockGetCategoryLinksCount.mockResolvedValue(2)
      const { result } = await renderLoaded()

      act(() => { result.current.confirmDelete(CAT_A.id) })
      await act(() => result.current.handleDelete(CAT_A.id))

      expect(result.current.deletingId).toBe(CAT_A.id)
    })

    it('confirmDelete clears a previous deleteError', async () => {
      mockGetCategoryLinksCount.mockResolvedValue(1)
      const { result } = await renderLoaded()

      act(() => { result.current.confirmDelete(CAT_A.id) })
      await act(() => result.current.handleDelete(CAT_A.id))
      expect(result.current.deleteError).not.toBeNull()

      act(() => { result.current.confirmDelete(CAT_B.id) })
      expect(result.current.deleteError).toBeNull()
    })

    it('handleDelete clears deleteError after a successful deletion', async () => {
      mockDeleteCategory.mockResolvedValue(true)
      const { result } = await renderLoaded()

      act(() => { result.current.confirmDelete(CAT_A.id) })
      await act(() => result.current.handleDelete(CAT_A.id))

      expect(result.current.deleteError).toBeNull()
    })
  })
})
