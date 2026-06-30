// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAvailableTags } from '@/lib/hooks/tags/useAvailableTags'

const mockGetTags = vi.hoisted(() => vi.fn())

vi.mock('@/lib/services/tags', () => ({ getTags: mockGetTags }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAvailableTags', () => {
  it('returns empty array before fetch resolves', () => {
    mockGetTags.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAvailableTags())
    expect(result.current).toEqual([])
  })

  it('returns tag names after fetch resolves', async () => {
    mockGetTags.mockResolvedValue([
      { id: '1', name: 'react', color: null, is_private: false, user_id: 'u1', created_at: '', link_count: 0 },
      { id: '2', name: 'css', color: '#3b82f6', is_private: false, user_id: 'u1', created_at: '', link_count: 2 },
    ])

    const { result } = renderHook(() => useAvailableTags())

    await waitFor(() => expect(result.current).toEqual(['react', 'css']))
  })

  it('calls getTags once on mount', async () => {
    mockGetTags.mockResolvedValue([])
    renderHook(() => useAvailableTags())
    await waitFor(() => expect(mockGetTags).toHaveBeenCalledOnce())
  })

  it('returns empty array when getTags resolves with empty list', async () => {
    mockGetTags.mockResolvedValue([])
    const { result } = renderHook(() => useAvailableTags())
    await waitFor(() => expect(result.current).toEqual([]))
  })
})
