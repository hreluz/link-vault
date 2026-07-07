// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAvailableTags, useAvailableTagsWithIds } from '@/lib/hooks/tags/useAvailableTags'
import type { TagWithCount } from '@/lib/services/tags'

const mockUseTagsContext = vi.fn()
vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => mockUseTagsContext(),
}))

const mockUseUnlockedTags = vi.fn()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => mockUseUnlockedTags(),
}))

function tag(overrides: Partial<TagWithCount>): TagWithCount {
  return {
    id: '1', user_id: 'u1', name: 'react', color: null, is_private: false,
    created_at: '', link_count: 0, ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set() })
})

describe('useAvailableTags', () => {
  it('returns the names of all public tags', () => {
    mockUseTagsContext.mockReturnValue({
      tags: [tag({ name: 'react' }), tag({ id: '2', name: 'css' })],
      loading: false,
    })

    const { result } = renderHook(() => useAvailableTags())

    expect(result.current).toEqual(['react', 'css'])
  })

  it('excludes private tags that are not unlocked', () => {
    mockUseTagsContext.mockReturnValue({
      tags: [tag({ name: 'react' }), tag({ id: '2', name: 'secret', is_private: true })],
      loading: false,
    })

    const { result } = renderHook(() => useAvailableTags())

    expect(result.current).toEqual(['react'])
  })

  it('includes private tags once they are unlocked', () => {
    mockUseTagsContext.mockReturnValue({
      tags: [tag({ name: 'react' }), tag({ id: '2', name: 'secret', is_private: true })],
      loading: false,
    })
    mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(['2']) })

    const { result } = renderHook(() => useAvailableTags())

    expect(result.current).toEqual(['react', 'secret'])
  })

  it('returns an empty array when there are no tags', () => {
    mockUseTagsContext.mockReturnValue({ tags: [], loading: false })

    const { result } = renderHook(() => useAvailableTags())

    expect(result.current).toEqual([])
  })
})

describe('useAvailableTagsWithIds', () => {
  it('returns visible tags as id+name pairs, for selection UIs that filter by id', () => {
    mockUseTagsContext.mockReturnValue({
      tags: [tag({ id: '1', name: 'react' }), tag({ id: '2', name: 'secret', is_private: true })],
      loading: false,
    })

    const { result } = renderHook(() => useAvailableTagsWithIds())

    expect(result.current).toEqual([{ id: '1', name: 'react' }])
  })

  it('includes a private tag once unlocked, keyed by id', () => {
    mockUseTagsContext.mockReturnValue({
      tags: [tag({ id: '2', name: 'secret', is_private: true })],
      loading: false,
    })
    mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(['2']) })

    const { result } = renderHook(() => useAvailableTagsWithIds())

    expect(result.current).toEqual([{ id: '2', name: 'secret' }])
  })
})
