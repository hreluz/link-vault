// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useCategoryAddForm } from '@/lib/hooks/categories/useCategoryAddForm'
import type { Category } from '@/lib/services/categories'

vi.mock('@/lib/services/categories', () => ({
  createCategory: vi.fn(),
}))

import { createCategory } from '@/lib/services/categories'
const mockCreateCategory = vi.mocked(createCategory)

const FAKE_DEK = {} as CryptoKey

const CAT_A: Category = {
  id: '1', user_id: 'u1', name: 'Article', description: 'Blog posts and articles',
  color: '#3B82F6', emoticon: '📄', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

function useHarness(initial: Category[] = [CAT_A]) {
  const [categories, setCategories] = useState<Category[]>(initial)
  return { categories, ...useCategoryAddForm(setCategories, FAKE_DEK) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCategoryAddForm', () => {
  it('starts with adding=false and no error', () => {
    const { result } = renderHook(() => useHarness())
    expect(result.current.adding).toBe(false)
    expect(result.current.addError).toBeNull()
  })

  it('openAdd sets adding=true and clears addError', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd() })

    expect(result.current.adding).toBe(true)
    expect(result.current.addError).toBeNull()
  })

  it('closeAdd resets adding, clears form fields and error', () => {
    const { result } = renderHook(() => useHarness())

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

  it('cancelAdding sets adding=false without touching fields or error', async () => {
    mockCreateCategory.mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('Article') })
    await act(() => result.current.handleAdd())
    expect(result.current.addError).not.toBeNull()

    act(() => { result.current.cancelAdding() })

    expect(result.current.adding).toBe(false)
    expect(result.current.addError).not.toBeNull()
  })

  it('addDomainsAfterCreate defaults to true', () => {
    const { result } = renderHook(() => useHarness())
    expect(result.current.addDomainsAfterCreate).toBe(true)
  })

  it('setAddDomainsAfterCreate toggles the flag', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.setAddDomainsAfterCreate(false) })

    expect(result.current.addDomainsAfterCreate).toBe(false)
  })

  it('closeAdd resets addDomainsAfterCreate to true', () => {
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.openAdd()
      result.current.setAddDomainsAfterCreate(false)
    })
    act(() => { result.current.closeAdd() })

    expect(result.current.addDomainsAfterCreate).toBe(true)
  })

  it('createdCategory is null initially', () => {
    const { result } = renderHook(() => useHarness())
    expect(result.current.createdCategory).toBeNull()
  })

  it('handleAdd calls createCategory and appends the result', async () => {
    const created: Category = { ...CAT_A, id: '99', name: 'New Cat', emoticon: '🎯' }
    mockCreateCategory.mockResolvedValue({ data: created, error: null })
    const { result } = renderHook(() => useHarness())

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
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.openAdd()
      result.current.setNewName('Article')
    })
    await act(() => result.current.handleAdd())

    expect(result.current.addError).toBe('A category with that name already exists.')
    expect(result.current.adding).toBe(true)
    expect(result.current.categories).toHaveLength(1)
  })

  it('openAdd clears a previous addError', async () => {
    mockCreateCategory.mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('Article') })
    await act(() => result.current.handleAdd())
    expect(result.current.addError).not.toBeNull()

    act(() => { result.current.openAdd() })
    expect(result.current.addError).toBeNull()
  })

  it('handleAdd does nothing when name is empty', async () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd() })
    await act(() => result.current.handleAdd())

    expect(mockCreateCategory).not.toHaveBeenCalled()
  })

  it('handleAdd uses 🔗 as default emoticon when icon is empty', async () => {
    mockCreateCategory.mockResolvedValue({ data: CAT_A, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('Article') })
    await act(() => result.current.handleAdd())

    expect(mockCreateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ emoticon: '🔗' }), FAKE_DEK,
    )
  })

  it('handleAdd passes the selected color to createCategory', async () => {
    mockCreateCategory.mockResolvedValue({ data: CAT_A, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('Article'); result.current.setNewColor('rose') })
    await act(() => result.current.handleAdd())

    expect(mockCreateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'rose' }), FAKE_DEK,
    )
  })

  it('handleAdd defaults to indigo color when none is set', async () => {
    mockCreateCategory.mockResolvedValue({ data: CAT_A, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('Article') })
    await act(() => result.current.handleAdd())

    expect(mockCreateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'indigo' }), FAKE_DEK,
    )
  })

  it('handleAdd closes the form without appending on db_error', async () => {
    mockCreateCategory.mockResolvedValue({ data: null, error: 'db_error' })
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.openAdd()
      result.current.setNewName('New Cat')
    })
    await act(() => result.current.handleAdd())

    expect(result.current.categories).toHaveLength(1)
    expect(result.current.adding).toBe(false)
  })

  it('handleAdd sets createdCategory on success when addDomainsAfterCreate is true', async () => {
    const created: Category = { ...CAT_A, id: '99', name: 'New Cat', emoticon: '🎯' }
    mockCreateCategory.mockResolvedValue({ data: created, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.openAdd()
      result.current.setNewName('New Cat')
    })
    await act(() => result.current.handleAdd())

    expect(result.current.createdCategory).toEqual(created)
  })

  it('handleAdd does not set createdCategory when addDomainsAfterCreate is false', async () => {
    const created: Category = { ...CAT_A, id: '99', name: 'New Cat', emoticon: '🎯' }
    mockCreateCategory.mockResolvedValue({ data: created, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.openAdd()
      result.current.setNewName('New Cat')
      result.current.setAddDomainsAfterCreate(false)
    })
    await act(() => result.current.handleAdd())

    expect(result.current.createdCategory).toBeNull()
  })

  it('handleAdd does not set createdCategory when creation fails', async () => {
    mockCreateCategory.mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.openAdd()
      result.current.setNewName('Article')
    })
    await act(() => result.current.handleAdd())

    expect(result.current.createdCategory).toBeNull()
  })

  it('setCreatedCategory can clear createdCategory back to null', async () => {
    const created: Category = { ...CAT_A, id: '99', name: 'New Cat', emoticon: '🎯' }
    mockCreateCategory.mockResolvedValue({ data: created, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('New Cat') })
    await act(() => result.current.handleAdd())
    expect(result.current.createdCategory).toEqual(created)

    act(() => { result.current.setCreatedCategory(null) })

    expect(result.current.createdCategory).toBeNull()
  })
})
