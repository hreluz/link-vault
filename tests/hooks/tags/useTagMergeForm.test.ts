// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useTagMergeForm } from '@/lib/hooks/tags/useTagMergeForm'
import type { TagWithCount } from '@/lib/services/tags'

vi.mock('@/lib/services/tags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/tags')>()
  return { ...actual, mergeTag: vi.fn(), getTagLinksCount: vi.fn() }
})

import { mergeTag, getTagLinksCount } from '@/lib/services/tags'
const mockMergeTag = vi.mocked(mergeTag)
const mockGetTagLinksCount = vi.mocked(getTagLinksCount)
const mockRefetchTags = vi.fn()

const MOCK_TAG: TagWithCount = {
  id: '1', user_id: 'u1', name: 'reading-list', color: 'indigo',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 3,
}
const MOCK_TAG_2: TagWithCount = {
  id: '2', user_id: 'u1', name: 'work-notes', color: 'sky',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 1,
}
const MOCK_TAG_3: TagWithCount = {
  id: '3', user_id: 'u1', name: 'work-in-progress', color: 'emerald',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 0,
}

const AVAILABLE = [
  { id: MOCK_TAG.id, name: MOCK_TAG.name },
  { id: MOCK_TAG_2.id, name: MOCK_TAG_2.name },
  { id: MOCK_TAG_3.id, name: MOCK_TAG_3.name },
]

function useHarness(
  initial: TagWithCount[] = [MOCK_TAG, MOCK_TAG_2, MOCK_TAG_3],
  availableTags: { id: string; name: string }[] = AVAILABLE,
) {
  const [tags, setTags] = useState<TagWithCount[]>(initial)
  return { tags, ...useTagMergeForm(setTags, mockRefetchTags, availableTags) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTagLinksCount.mockResolvedValue(0)
})

describe('useTagMergeForm', () => {
  it('startMerge sets mergingTag and resets query/target/error', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startMerge(MOCK_TAG) })

    expect(result.current.mergingTag).toEqual(MOCK_TAG)
    expect(result.current.mergeQuery).toBe('')
    expect(result.current.mergeTarget).toBeNull()
  })

  it('cancelMerging clears mergingTag', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startMerge(MOCK_TAG) })
    act(() => { result.current.cancelMerging() })

    expect(result.current.mergingTag).toBeNull()
  })

  it('suggestions exclude the tag being merged', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startMerge(MOCK_TAG) })

    expect(result.current.suggestions.map(t => t.id)).not.toContain(MOCK_TAG.id)
    expect(result.current.suggestions).toHaveLength(2)
  })

  it('suggestions filter by the typed query (case-insensitive substring)', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startMerge(MOCK_TAG) })
    act(() => { result.current.setMergeQuery('WORK-N') })

    expect(result.current.suggestions).toEqual([{ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name }])
  })

  it('selecting a suggestion sets mergeTarget', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startMerge(MOCK_TAG) })
    act(() => { result.current.selectSuggestion({ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name }) })

    expect(result.current.mergeTarget).toEqual({ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name })
  })

  it('cancelMerge clears mergeTarget but keeps the form open on the source tag', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startMerge(MOCK_TAG) })
    act(() => { result.current.selectSuggestion({ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name }) })
    act(() => { result.current.cancelMerge() })

    expect(result.current.mergeTarget).toBeNull()
    expect(result.current.mergingTag).toEqual(MOCK_TAG)
  })

  describe('onKeyPress', () => {
    it('ArrowDown/ArrowUp move selectedIndex within suggestion bounds', () => {
      const { result } = renderHook(() => useHarness())
      act(() => { result.current.startMerge(MOCK_TAG) })

      act(() => { result.current.onKeyPress('ArrowDown') })
      expect(result.current.selectedIndex).toBe(0)
      act(() => { result.current.onKeyPress('ArrowDown') })
      expect(result.current.selectedIndex).toBe(1)
      act(() => { result.current.onKeyPress('ArrowDown') })
      expect(result.current.selectedIndex).toBe(1)

      act(() => { result.current.onKeyPress('ArrowUp') })
      expect(result.current.selectedIndex).toBe(0)
    })

    it('Escape resets selectedIndex', () => {
      const { result } = renderHook(() => useHarness())
      act(() => { result.current.startMerge(MOCK_TAG) })
      act(() => { result.current.onKeyPress('ArrowDown') })

      act(() => { result.current.onKeyPress('Escape') })

      expect(result.current.selectedIndex).toBe(-1)
    })

    it('Enter selects the highlighted suggestion and advances to the confirm step', () => {
      const { result } = renderHook(() => useHarness())
      act(() => { result.current.startMerge(MOCK_TAG) })
      act(() => { result.current.onKeyPress('ArrowDown') })

      act(() => { result.current.onKeyPress('Enter') })

      expect(result.current.mergeTarget).toEqual({ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name })
    })

    it('Enter does nothing when nothing is highlighted', () => {
      const { result } = renderHook(() => useHarness())
      act(() => { result.current.startMerge(MOCK_TAG) })

      act(() => { result.current.onKeyPress('Enter') })

      expect(result.current.mergeTarget).toBeNull()
    })
  })

  describe('confirmMerge', () => {
    it('calls mergeTag, removes the source tag, clears state, and refetches', async () => {
      mockMergeTag.mockResolvedValue(true)
      const { result } = renderHook(() => useHarness())

      act(() => { result.current.startMerge(MOCK_TAG) })
      act(() => { result.current.selectSuggestion({ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name }) })
      await act(async () => result.current.confirmMerge())

      expect(mockMergeTag).toHaveBeenCalledWith(MOCK_TAG.id, MOCK_TAG_2.id)
      expect(result.current.tags.find(t => t.id === MOCK_TAG.id)).toBeUndefined()
      expect(result.current.mergingTag).toBeNull()
      expect(result.current.mergeTarget).toBeNull()
      expect(mockRefetchTags).toHaveBeenCalledOnce()
    })

    it("refreshes the target tag's link_count from the server instead of leaving it stale", async () => {
      mockMergeTag.mockResolvedValue(true)
      mockGetTagLinksCount.mockResolvedValue(4) // MOCK_TAG(3) + MOCK_TAG_2(1), deduped server-side
      const { result } = renderHook(() => useHarness())

      act(() => { result.current.startMerge(MOCK_TAG) })
      act(() => { result.current.selectSuggestion({ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name }) })
      await act(async () => result.current.confirmMerge())

      expect(mockGetTagLinksCount).toHaveBeenCalledWith(MOCK_TAG_2.id)
      expect(result.current.tags.find(t => t.id === MOCK_TAG_2.id)?.link_count).toBe(4)
    })

    it('sets mergeError and keeps mergeTarget when mergeTag fails', async () => {
      mockMergeTag.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      act(() => { result.current.startMerge(MOCK_TAG) })
      act(() => { result.current.selectSuggestion({ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name }) })
      await act(async () => result.current.confirmMerge())

      expect(result.current.mergeError).toBeTruthy()
      expect(result.current.mergeTarget).toEqual({ id: MOCK_TAG_2.id, name: MOCK_TAG_2.name })
      expect(result.current.tags.find(t => t.id === MOCK_TAG.id)).toBeTruthy()
    })

    it('does nothing when there is no mergingTag or mergeTarget', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => result.current.confirmMerge())

      expect(mockMergeTag).not.toHaveBeenCalled()
    })
  })
})
