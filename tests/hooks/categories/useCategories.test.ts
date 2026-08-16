// @vitest-environment jsdom

// Per-hook behavior is covered by useCategoryListState/useCategoryAddForm/useCategoryEditForm/
// useCategoryDeleteFlow tests. This file only covers the cross-flow coordination useCategories()
// layers on top when composing them (e.g. opening the add form closes any in-progress edit/delete).

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

describe('useCategories cross-flow coordination', () => {
  it('openAdd sets adding=true and clears editingId/deletingId/addError', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.startEdit(CAT_A)
      result.current.confirmDelete(CAT_B.id)
    })
    act(() => { result.current.openAdd() })

    expect(result.current.adding).toBe(true)
    expect(result.current.editingId).toBeNull()
    expect(result.current.deletingId).toBeNull()
    expect(result.current.addError).toBeNull()
  })

  it('startEdit closes the add form and any in-progress delete', async () => {
    const { result } = await renderLoaded()

    act(() => { result.current.openAdd(); result.current.confirmDelete(CAT_B.id) })
    act(() => { result.current.startEdit(CAT_A) })

    expect(result.current.adding).toBe(false)
    expect(result.current.deletingId).toBeNull()
    expect(result.current.editingId).toBe(CAT_A.id)
  })

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
})
