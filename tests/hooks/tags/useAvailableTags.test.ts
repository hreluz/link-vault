// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAvailableTags } from '@/lib/hooks/tags/useAvailableTags'
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
  mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set() })
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
    mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(['secret']) })

    const { result } = renderHook(() => useAvailableTags())

    expect(result.current).toEqual(['react', 'secret'])
  })

  it('returns an empty array when there are no tags', () => {
    mockUseTagsContext.mockReturnValue({ tags: [], loading: false })

    const { result } = renderHook(() => useAvailableTags())

    expect(result.current).toEqual([])
  })
})
