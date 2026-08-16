// @vitest-environment jsdom

// Per-hook behavior is covered by useTagListState/useTagAddForm/useTagEditForm/useTagDeleteFlow
// tests. This file only covers the cross-flow coordination useTagList() layers on top when
// composing them (e.g. opening the add form closes any in-progress edit/delete).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTagList } from '@/lib/hooks/tags/useTagList'
import type { TagWithCount } from '@/lib/services/tags'

vi.mock('@/lib/services/tags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/tags')>()
  return {
    ...actual,
    getTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    getTagLinksCount: vi.fn(),
  }
})

const { FAKE_DEK } = vi.hoisted(() => ({ FAKE_DEK: {} as CryptoKey }))
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))
vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: vi.fn() }),
}))

import { getTags } from '@/lib/services/tags'

const MOCK_TAG: TagWithCount = {
  id: '1', user_id: 'u1', name: 'react', color: 'indigo',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 3,
}
const MOCK_TAG_2: TagWithCount = {
  id: '2', user_id: 'u1', name: 'typescript', color: 'sky',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getTags).mockResolvedValue([MOCK_TAG, MOCK_TAG_2])
})

async function renderLoaded() {
  const utils = renderHook(() => useTagList())
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useTagList cross-flow coordination', () => {
  it('openAdd sets adding=true and clears editingId/deletingId/addError', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.startEdit(MOCK_TAG)
      result.current.confirmDelete(MOCK_TAG_2.id)
    })
    act(() => { result.current.openAdd() })

    expect(result.current.adding).toBe(true)
    expect(result.current.editingId).toBeNull()
    expect(result.current.deletingId).toBeNull()
    expect(result.current.addError).toBeNull()
  })

  it('startEdit closes the add form and any in-progress delete', async () => {
    const { result } = await renderLoaded()

    act(() => { result.current.openAdd(); result.current.confirmDelete(MOCK_TAG_2.id) })
    act(() => { result.current.startEdit(MOCK_TAG) })

    expect(result.current.adding).toBe(false)
    expect(result.current.deletingId).toBeNull()
    expect(result.current.editingId).toBe(MOCK_TAG.id)
  })

  it('confirmDelete sets deletingId and closes other forms', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.openAdd()
      result.current.confirmDelete(MOCK_TAG.id)
    })

    expect(result.current.deletingId).toBe(MOCK_TAG.id)
    expect(result.current.adding).toBe(false)
    expect(result.current.editingId).toBeNull()
  })

  it('startMerge sets mergingTag and closes the add/edit/delete forms', async () => {
    const { result } = await renderLoaded()

    act(() => {
      result.current.openAdd()
      result.current.startEdit(MOCK_TAG_2)
    })
    act(() => { result.current.startMerge(MOCK_TAG) })

    expect(result.current.mergingTag).toEqual(MOCK_TAG)
    expect(result.current.adding).toBe(false)
    expect(result.current.editingId).toBeNull()
  })

  it('opening add/edit/delete each close an in-progress merge', async () => {
    const { result: r1 } = await renderLoaded()
    act(() => { r1.current.startMerge(MOCK_TAG) })
    act(() => { r1.current.openAdd() })
    expect(r1.current.mergingTag).toBeNull()

    const { result: r2 } = await renderLoaded()
    act(() => { r2.current.startMerge(MOCK_TAG) })
    act(() => { r2.current.startEdit(MOCK_TAG_2) })
    expect(r2.current.mergingTag).toBeNull()

    const { result: r3 } = await renderLoaded()
    act(() => { r3.current.startMerge(MOCK_TAG) })
    act(() => { r3.current.confirmDelete(MOCK_TAG_2.id) })
    expect(r3.current.mergingTag).toBeNull()
  })
})
