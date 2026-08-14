// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinkModals } from '@/lib/hooks/links/list/useLinkModals'

const { mockReplace, mockParams } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockParams,
}))

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of Array.from(mockParams.keys())) mockParams.delete(key)
})

const LINK = {
  id: '1', title: 'Test', site_name: 'test.com',
  status: 'unread' as const, is_favorite: false, image_url: null, deleted_at: null, duration: null,
  tags: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  url: 'https://test.com', description: '', notes: null, user_id: 'user-1', category_id: null,
}

describe('useLinkModals', () => {
  it('starts with all modals closed and no active/editing link', () => {
    const { result } = renderHook(() => useLinkModals())

    expect(result.current.modalOpen).toBe(false)
    expect(result.current.filterOpen).toBe(false)
    expect(result.current.activeLink).toBeNull()
    expect(result.current.editingLink).toBeNull()
  })

  it('opens and closes the add-link modal', () => {
    const { result } = renderHook(() => useLinkModals())

    act(() => result.current.setModalOpen(true))
    expect(result.current.modalOpen).toBe(true)

    act(() => result.current.setModalOpen(false))
    expect(result.current.modalOpen).toBe(false)
  })

  it('opens and closes the filter sheet', () => {
    const { result } = renderHook(() => useLinkModals())

    act(() => result.current.setFilterOpen(true))
    expect(result.current.filterOpen).toBe(true)

    act(() => result.current.setFilterOpen(false))
    expect(result.current.filterOpen).toBe(false)
  })

  it('sets and clears the active link', () => {
    const { result } = renderHook(() => useLinkModals())

    act(() => result.current.setActiveLink(LINK))
    expect(result.current.activeLink).toEqual(LINK)

    act(() => result.current.setActiveLink(null))
    expect(result.current.activeLink).toBeNull()
  })

  it('sets and clears the editing link', () => {
    const { result } = renderHook(() => useLinkModals())

    act(() => result.current.setEditingLink(LINK))
    expect(result.current.editingLink).toEqual(LINK)

    act(() => result.current.setEditingLink(null))
    expect(result.current.editingLink).toBeNull()
  })

  it('opens the add-link modal prefilled when add=1 is in the URL, then strips it', () => {
    mockParams.set('add', '1')
    mockParams.set('url', 'https://example.com')
    mockParams.set('title', 'Example')

    const { result } = renderHook(() => useLinkModals())

    expect(result.current.modalOpen).toBe(true)
    expect(result.current.pendingCapture).toEqual({ url: 'https://example.com', title: 'Example' })
    expect(mockReplace).toHaveBeenCalledWith('/dashboard', { scroll: false })
  })

  it('does not open the add-link modal when add is absent', () => {
    const { result } = renderHook(() => useLinkModals())

    expect(result.current.modalOpen).toBe(false)
    expect(result.current.pendingCapture).toBeNull()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
