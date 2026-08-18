// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTagListState } from '@/lib/hooks/tags/useTagListState'
import type { TagWithCount } from '@/lib/services/tags/tags'

vi.mock('@/lib/services/tags/tags', () => ({
  getTags: vi.fn(),
}))

import { getTags } from '@/lib/services/tags/tags'
const mockGetTags = vi.mocked(getTags)

const FAKE_DEK = {} as CryptoKey

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
  mockGetTags.mockResolvedValue([MOCK_TAG, MOCK_TAG_2])
})

describe('useTagListState', () => {
  it('starts in loading state and resolves with service data', async () => {
    const { result } = renderHook(() => useTagListState(FAKE_DEK))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tags).toEqual([MOCK_TAG, MOCK_TAG_2])
  })

  it('calls getTags on mount', async () => {
    const { result } = renderHook(() => useTagListState(FAKE_DEK))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockGetTags).toHaveBeenCalledOnce()
  })

  it('does not fetch when dek is null', () => {
    renderHook(() => useTagListState(null))

    expect(mockGetTags).not.toHaveBeenCalled()
  })

  it('search starts empty', () => {
    const { result } = renderHook(() => useTagListState(FAKE_DEK))

    expect(result.current.search).toBe('')
  })
})
