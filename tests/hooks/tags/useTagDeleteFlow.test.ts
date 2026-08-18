// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useTagDeleteFlow } from '@/lib/hooks/tags/useTagDeleteFlow'
import type { TagWithCount } from '@/lib/services/tags/tags'

vi.mock('@/lib/services/tags/tags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/tags/tags')>()
  return { ...actual, deleteTag: vi.fn(), getTagLinksCount: vi.fn() }
})

import { deleteTag, getTagLinksCount } from '@/lib/services/tags/tags'
const mockDeleteTag = vi.mocked(deleteTag)
const mockGetTagLinksCount = vi.mocked(getTagLinksCount)
const mockRefetchTags = vi.fn()

const MOCK_TAG: TagWithCount = {
  id: '1', user_id: 'u1', name: 'react', color: 'indigo',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 3,
}
const MOCK_TAG_2: TagWithCount = {
  id: '2', user_id: 'u1', name: 'typescript', color: 'sky',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 1,
}

function useHarness(initial: TagWithCount[] = [MOCK_TAG, MOCK_TAG_2]) {
  const [tags, setTags] = useState<TagWithCount[]>(initial)
  return { tags, ...useTagDeleteFlow(setTags, mockRefetchTags) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTagLinksCount.mockResolvedValue(0)
})

describe('useTagDeleteFlow', () => {
  it('confirmDelete sets deletingId', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(MOCK_TAG.id) })

    expect(result.current.deletingId).toBe(MOCK_TAG.id)
  })

  it('cancelDeleting clears deletingId only', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(MOCK_TAG.id) })
    act(() => { result.current.cancelDeleting() })

    expect(result.current.deletingId).toBeNull()
  })

  it('confirmDelete clears a previous deleteError', async () => {
    mockGetTagLinksCount.mockResolvedValue(1)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(MOCK_TAG.id) })
    await act(async () => result.current.deleteTag(MOCK_TAG.id))
    expect(result.current.deleteError).not.toBeNull()

    act(() => { result.current.confirmDelete(MOCK_TAG_2.id) })
    expect(result.current.deleteError).toBeNull()
  })

  it('calls deleteTag service, removes the tag from the list, and refetches', async () => {
    mockDeleteTag.mockResolvedValue(true)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(MOCK_TAG.id) })
    await act(async () => result.current.deleteTag(MOCK_TAG.id))

    expect(mockDeleteTag).toHaveBeenCalledWith(MOCK_TAG.id)
    expect(result.current.tags.find(t => t.id === MOCK_TAG.id)).toBeUndefined()
    expect(result.current.deletingId).toBeNull()
    expect(mockRefetchTags).toHaveBeenCalledOnce()
  })

  it('sets deleteError and keeps the tag when the service fails', async () => {
    mockDeleteTag.mockResolvedValue(false)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(MOCK_TAG.id) })
    await act(async () => result.current.deleteTag(MOCK_TAG.id))

    expect(result.current.deleteError).toBeTruthy()
    expect(result.current.tags.find(t => t.id === MOCK_TAG.id)).toBeDefined()
  })

  it('sets deleteError and does not delete when the tag has links', async () => {
    mockGetTagLinksCount.mockResolvedValue(3)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(MOCK_TAG.id) })
    await act(async () => result.current.deleteTag(MOCK_TAG.id))

    expect(mockDeleteTag).not.toHaveBeenCalled()
    expect(result.current.tags).toHaveLength(2)
    expect(result.current.deleteError).toBe('This tag has 3 links and cannot be deleted.')
  })

  it('uses singular "link" when count is 1', async () => {
    mockGetTagLinksCount.mockResolvedValue(1)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(MOCK_TAG.id) })
    await act(async () => result.current.deleteTag(MOCK_TAG.id))

    expect(result.current.deleteError).toBe('This tag has 1 link and cannot be deleted.')
  })

  it('keeps deletingId set when the tag has links', async () => {
    mockGetTagLinksCount.mockResolvedValue(2)
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.confirmDelete(MOCK_TAG.id) })
    await act(async () => result.current.deleteTag(MOCK_TAG.id))

    expect(result.current.deletingId).toBe(MOCK_TAG.id)
  })
})
