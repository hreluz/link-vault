// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAddLinkForm } from '@/lib/hooks/links/useAddLinkForm'
import type { LinkWithTags } from '@/lib/services/links'

const SAVED_LINK: LinkWithTags = {
  id: '1', url: 'https://example.com', title: 'Example',
  status: 'unread', is_favorite: false,
  tags: ['react'], description: '', notes: null,
  site_name: 'example.com', user_id: 'user-1', category_id: 'cat-1',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/lib/services/links', () => ({
  createLink: vi.fn(),
}))

import { createLink } from '@/lib/services/links'
const mockCreateLink = vi.mocked(createLink)

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateLink.mockResolvedValue(SAVED_LINK)
})

describe('useAddLinkForm', () => {
  describe('initial state', () => {
    it('starts with empty fields and default selections', () => {
      const { result } = renderHook(() => useAddLinkForm())

      expect(result.current.url).toBe('')
      expect(result.current.title).toBe('')
      expect(result.current.tags).toBe('')
      expect(result.current.notes).toBe('')
      expect(result.current.status).toBe('unread')
      expect(result.current.submitting).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('field setters', () => {
    it('updates url', () => {
      const { result } = renderHook(() => useAddLinkForm())
      act(() => result.current.setUrl('https://example.com'))
      expect(result.current.url).toBe('https://example.com')
    })

    it('updates title', () => {
      const { result } = renderHook(() => useAddLinkForm())
      act(() => result.current.setTitle('My Title'))
      expect(result.current.title).toBe('My Title')
    })

    it('updates status', () => {
      const { result } = renderHook(() => useAddLinkForm())
      act(() => result.current.setStatus('read'))
      expect(result.current.status).toBe('read')
    })

    it('updates tags', () => {
      const { result } = renderHook(() => useAddLinkForm())
      act(() => result.current.setTags('react, css'))
      expect(result.current.tags).toBe('react, css')
    })

    it('updates notes', () => {
      const { result } = renderHook(() => useAddLinkForm())
      act(() => result.current.setNotes('some notes'))
      expect(result.current.notes).toBe('some notes')
    })
  })

  describe('reset', () => {
    it('clears all fields back to defaults including error', () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => {
        result.current.setUrl('https://example.com')
        result.current.setTitle('Title')
        result.current.setStatus('read')
        result.current.setTags('react')
        result.current.setNotes('notes')
      })
      act(() => result.current.reset())

      expect(result.current.url).toBe('')
      expect(result.current.title).toBe('')
      expect(result.current.status).toBe('unread')
      expect(result.current.tags).toBe('')
      expect(result.current.notes).toBe('')
      expect(result.current.error).toBeNull()
    })
  })

  describe('handleSubmit', () => {
    it('sets error and returns null when url is empty', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      let returned: LinkWithTags | null = SAVED_LINK
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toBeNull()
      expect(result.current.error).toBeTruthy()
      expect(mockCreateLink).not.toHaveBeenCalled()
    })

    it('sets error and returns null when url is not a valid URL', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => result.current.setUrl('not-a-url'))
      let returned: LinkWithTags | null = SAVED_LINK
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toBeNull()
      expect(result.current.error).toBeTruthy()
      expect(mockCreateLink).not.toHaveBeenCalled()
    })

    it('sets error and returns null when categoryId is null', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => result.current.setUrl('https://example.com'))
      let returned: LinkWithTags | null = SAVED_LINK
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toBeNull()
      expect(result.current.error).toBeTruthy()
      expect(mockCreateLink).not.toHaveBeenCalled()
    })

    it('returns the saved link on success', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })
      let returned: LinkWithTags | null = null
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toEqual(SAVED_LINK)
    })

    it('resets form fields on success', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setTitle('T'); result.current.setCategoryId('cat-1') })
      await act(async () => { await result.current.handleSubmit() })

      expect(result.current.url).toBe('')
      expect(result.current.title).toBe('')
    })

    it('returns null and sets error when createLink fails', async () => {
      mockCreateLink.mockResolvedValue(null)
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })
      let returned: LinkWithTags | null = SAVED_LINK
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toBeNull()
      expect(result.current.error).toBeTruthy()
    })

    it('does not reset form fields on failure', async () => {
      mockCreateLink.mockResolvedValue(null)
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })
      await act(async () => { await result.current.handleSubmit() })

      expect(result.current.url).toBe('https://example.com')
    })

    it('is not submitting before and after the call', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })
      expect(result.current.submitting).toBe(false)
      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.submitting).toBe(false)
    })

    it('uses the first 30 chars of the url without protocol as title when title is empty', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com/some/very/long/path/here'); result.current.setCategoryId('cat-1') })
      await act(async () => { await result.current.handleSubmit() })

      expect(mockCreateLink).toHaveBeenCalledWith(expect.objectContaining({
        title: 'example.com/some/very/long/pat',
      }))
    })

    it('uses the provided title when set', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setTitle('My Title'); result.current.setCategoryId('cat-1') })
      await act(async () => { await result.current.handleSubmit() })

      expect(mockCreateLink).toHaveBeenCalledWith(expect.objectContaining({ title: 'My Title' }))
    })

    it('passes parsed tags as an array to createLink', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setTags(' react , css , '); result.current.setCategoryId('cat-1') })
      await act(async () => { await result.current.handleSubmit() })

      expect(mockCreateLink).toHaveBeenCalledWith(expect.objectContaining({
        tags: ['react', 'css'],
      }))
    })
  })
})
