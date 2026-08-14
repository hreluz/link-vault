// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useCategoryEditForm } from '@/lib/hooks/categories/useCategoryEditForm'
import type { Category } from '@/lib/services/categories'

vi.mock('@/lib/services/categories', () => ({
  updateCategory: vi.fn(),
}))

import { updateCategory } from '@/lib/services/categories'
const mockUpdateCategory = vi.mocked(updateCategory)

const FAKE_DEK = {} as CryptoKey

const CAT_A: Category = {
  id: '1', user_id: 'u1', name: 'Article', description: 'Blog posts and articles',
  color: '#3B82F6', emoticon: '📄', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
const CAT_B: Category = {
  id: '2', user_id: 'u1', name: 'YouTube', description: 'Videos and tutorials',
  color: '#FF0000', emoticon: '📺', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

function useHarness(initial: Category[] = [CAT_A, CAT_B]) {
  const [categories, setCategories] = useState<Category[]>(initial)
  return { categories, ...useCategoryEditForm(setCategories, FAKE_DEK) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCategoryEditForm', () => {
  it('startEdit sets editingId and populates edit fields', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(CAT_A) })

    expect(result.current.editingId).toBe(CAT_A.id)
    expect(result.current.editName).toBe(CAT_A.name)
    expect(result.current.editIcon).toBe(CAT_A.emoticon)
    expect(result.current.editColor).toBe(CAT_A.color)
  })

  it('startEdit clears a previous editError', async () => {
    mockUpdateCategory.mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(CAT_A) })
    await act(() => result.current.handleSaveEdit())
    expect(result.current.editError).not.toBeNull()

    act(() => { result.current.startEdit(CAT_B) })
    expect(result.current.editError).toBeNull()
  })

  it('cancelEditing clears editingId only', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(CAT_A) })
    act(() => { result.current.cancelEditing() })

    expect(result.current.editingId).toBeNull()
  })

  it('handleSaveEdit calls updateCategory and updates the list', async () => {
    const updated: Category = { ...CAT_A, name: 'Renamed', emoticon: '🆕' }
    mockUpdateCategory.mockResolvedValue({ data: updated, error: null })
    const { result } = renderHook(() => useHarness())

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
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(CAT_A); result.current.setEditColor('purple') })
    await act(() => result.current.handleSaveEdit())

    expect(mockUpdateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'purple' }), FAKE_DEK,
    )
  })

  it('handleSaveEdit does not call service when name is empty', async () => {
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.startEdit(CAT_A)
      result.current.setEditName('')
    })
    await act(() => result.current.handleSaveEdit())

    expect(mockUpdateCategory).not.toHaveBeenCalled()
  })

  it('handleSaveEdit uses 🔗 as default emoticon when editIcon is empty', async () => {
    mockUpdateCategory.mockResolvedValue({ data: CAT_A, error: null })
    const { result } = renderHook(() => useHarness())

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
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(CAT_A) })
    await act(() => result.current.handleSaveEdit())

    expect(result.current.editError).toBe('A category with that name already exists.')
    expect(result.current.editingId).toBe(CAT_A.id)
    expect(result.current.categories[0]).toEqual(CAT_A)
  })

  it('handleSaveEdit does not update list on db_error', async () => {
    mockUpdateCategory.mockResolvedValue({ data: null, error: 'db_error' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(CAT_A) })
    await act(() => result.current.handleSaveEdit())

    expect(result.current.categories[0]).toEqual(CAT_A)
  })
})
