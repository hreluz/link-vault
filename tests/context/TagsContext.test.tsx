// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { TagsProvider, useTagsContext } from '@/lib/context/TagsContext'
import type { TagWithCount } from '@/lib/services/tags'

const mockGetTags = vi.fn()
vi.mock('@/lib/services/tags', () => ({ getTags: () => mockGetTags() }))

function wrapper({ children }: { children: React.ReactNode }) {
  return <TagsProvider>{children}</TagsProvider>
}

const TAG_A: TagWithCount = {
  id: '1', user_id: 'u1', name: 'react', color: null, is_private: false,
  created_at: '', link_count: 0,
}
const TAG_B: TagWithCount = {
  id: '2', user_id: 'u1', name: 'css', color: null, is_private: false,
  created_at: '', link_count: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TagsContext', () => {
  it('starts with loading true and no tags', () => {
    mockGetTags.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useTagsContext(), { wrapper })
    expect(result.current.loading).toBe(true)
    expect(result.current.tags).toEqual([])
  })

  it('fetches tags once on mount', async () => {
    mockGetTags.mockResolvedValue([TAG_A, TAG_B])
    const { result } = renderHook(() => useTagsContext(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.tags).toEqual([TAG_A, TAG_B])
    expect(mockGetTags).toHaveBeenCalledOnce()
  })

  it('refetchTags re-fetches and replaces the tag list', async () => {
    mockGetTags.mockResolvedValue([TAG_A])
    const { result } = renderHook(() => useTagsContext(), { wrapper })
    await waitFor(() => expect(result.current.tags).toEqual([TAG_A]))

    mockGetTags.mockResolvedValue([TAG_A, TAG_B])
    await act(async () => result.current.refetchTags())

    expect(result.current.tags).toEqual([TAG_A, TAG_B])
    expect(mockGetTags).toHaveBeenCalledTimes(2)
  })

  it('default context (no provider) returns an empty, non-loading list and a no-op refetch', () => {
    const { result } = renderHook(() => useTagsContext())
    expect(result.current.tags).toEqual([])
    expect(() => result.current.refetchTags()).not.toThrow()
  })
})
