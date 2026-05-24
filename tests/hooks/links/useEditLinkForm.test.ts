// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditLinkForm } from '@/lib/hooks/links/useEditLinkForm'
import type { LinkWithTags } from '@/lib/services/links'

const LINK: LinkWithTags = {
  id: '1', url: 'https://example.com', title: 'Example', description: 'A description',
  content_type: 'article', status: 'unread', is_favorite: false,
  tags: ['react', 'css'], notes: 'my notes', image_url: null,
  site_name: 'example.com', user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

const UPDATED_LINK: LinkWithTags = { ...LINK, title: 'Updated', tags: ['react'] }

vi.mock('@/lib/services/links', () => ({
  updateLink: vi.fn(),
}))

import { updateLink } from '@/lib/services/links'
const mockUpdateLink = vi.mocked(updateLink)

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateLink.mockResolvedValue(UPDATED_LINK)
})

describe('useEditLinkForm', () => {
  describe('initial state', () => {
    it('populates fields from the link', () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      expect(result.current.url).toBe('https://example.com')
      expect(result.current.title).toBe('Example')
      expect(result.current.description).toBe('A description')
      expect(result.current.contentType).toBe('article')
      expect(result.current.status).toBe('unread')
      expect(result.current.tags).toBe('react, css')
      expect(result.current.notes).toBe('my notes')
      expect(result.current.submitting).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('defaults to empty strings when link is null', () => {
      const { result } = renderHook(() => useEditLinkForm(null))

      expect(result.current.url).toBe('')
      expect(result.current.title).toBe('')
      expect(result.current.tags).toBe('')
    })
  })

  describe('field setters', () => {
    it('updates url', () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))
      act(() => result.current.setUrl('https://new.com'))
      expect(result.current.url).toBe('https://new.com')
    })

    it('updates title', () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))
      act(() => result.current.setTitle('New Title'))
      expect(result.current.title).toBe('New Title')
    })

    it('updates description', () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))
      act(() => result.current.setDescription('New desc'))
      expect(result.current.description).toBe('New desc')
    })

    it('updates contentType', () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))
      act(() => result.current.setContentType('youtube'))
      expect(result.current.contentType).toBe('youtube')
    })

    it('updates status', () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))
      act(() => result.current.setStatus('read'))
      expect(result.current.status).toBe('read')
    })

    it('updates tags', () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))
      act(() => result.current.setTags('vue, ts'))
      expect(result.current.tags).toBe('vue, ts')
    })

    it('updates notes', () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))
      act(() => result.current.setNotes('new note'))
      expect(result.current.notes).toBe('new note')
    })
  })

  describe('handleSubmit', () => {
    it('sets error and returns null when url is empty', async () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      act(() => result.current.setUrl('  '))
      let returned: LinkWithTags | null = UPDATED_LINK
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toBeNull()
      expect(result.current.error).toBeTruthy()
      expect(mockUpdateLink).not.toHaveBeenCalled()
    })

    it('sets error and returns null when url is not a valid URL', async () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      act(() => result.current.setUrl('not-a-url'))
      let returned: LinkWithTags | null = UPDATED_LINK
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toBeNull()
      expect(result.current.error).toBeTruthy()
      expect(mockUpdateLink).not.toHaveBeenCalled()
    })

    it('returns null immediately when link is null', async () => {
      const { result } = renderHook(() => useEditLinkForm(null))

      let returned: LinkWithTags | null = UPDATED_LINK
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toBeNull()
      expect(mockUpdateLink).not.toHaveBeenCalled()
    })

    it('returns the updated link on success', async () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      let returned: LinkWithTags | null = null
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toEqual(UPDATED_LINK)
    })

    it('calls updateLink with the correct id', async () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      await act(async () => { await result.current.handleSubmit() })

      expect(mockUpdateLink).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
    })

    it('uses the first 30 chars of the url without protocol as title when title is empty', async () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      act(() => { result.current.setUrl('https://example.com/some/very/long/path/here'); result.current.setTitle('') })
      await act(async () => { await result.current.handleSubmit() })

      expect(mockUpdateLink).toHaveBeenCalledWith(expect.objectContaining({
        title: 'example.com/some/very/long/pat',
      }))
    })

    it('uses the provided title when set', async () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      act(() => result.current.setTitle('My Title'))
      await act(async () => { await result.current.handleSubmit() })

      expect(mockUpdateLink).toHaveBeenCalledWith(expect.objectContaining({ title: 'My Title' }))
    })

    it('passes parsed tags as an array', async () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      act(() => result.current.setTags(' react , vue , '))
      await act(async () => { await result.current.handleSubmit() })

      expect(mockUpdateLink).toHaveBeenCalledWith(expect.objectContaining({ tags: ['react', 'vue'] }))
    })

    it('sets error and returns null when updateLink fails', async () => {
      mockUpdateLink.mockResolvedValue(null)
      const { result } = renderHook(() => useEditLinkForm(LINK))

      let returned: LinkWithTags | null = UPDATED_LINK
      await act(async () => { returned = await result.current.handleSubmit() })

      expect(returned).toBeNull()
      expect(result.current.error).toBeTruthy()
    })

    it('clears a previous error on a successful submit', async () => {
      mockUpdateLink.mockResolvedValueOnce(null).mockResolvedValueOnce(UPDATED_LINK)
      const { result } = renderHook(() => useEditLinkForm(LINK))

      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.error).toBeTruthy()

      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.error).toBeNull()
    })

    it('is not submitting before and after the call', async () => {
      const { result } = renderHook(() => useEditLinkForm(LINK))

      expect(result.current.submitting).toBe(false)
      await act(async () => { await result.current.handleSubmit() })
      expect(result.current.submitting).toBe(false)
    })

    it('converts empty notes to null', async () => {
      const { result } = renderHook(() => useEditLinkForm({ ...LINK, notes: null }))

      act(() => result.current.setNotes(''))
      await act(async () => { await result.current.handleSubmit() })

      expect(mockUpdateLink).toHaveBeenCalledWith(expect.objectContaining({ notes: null }))
    })
  })
})
