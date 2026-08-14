// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAddLinkForm } from '@/lib/hooks/links/form/useAddLinkForm'
import type { LinkWithTags } from '@/lib/services/links'

const SAVED_LINK: LinkWithTags = {
  id: '1', url: 'https://example.com', title: 'Example',
  status: 'unread', is_favorite: false, image_url: null, deleted_at: null, duration: null,
  tags: ['react'], description: '', notes: null,
  site_name: 'example.com', user_id: 'user-1', category_id: 'cat-1',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/app/dashboard/link/actions', () => ({
  fetchLinkMeta: vi.fn(),
}))

vi.mock('@/lib/services/links', () => ({
  createLink: vi.fn(),
  findLinkIdByUrl: vi.fn(),
}))

const { FAKE_DEK } = vi.hoisted(() => ({ FAKE_DEK: {} as CryptoKey }))
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

import { createLink, findLinkIdByUrl } from '@/lib/services/links'
import { fetchLinkMeta } from '@/app/dashboard/link/actions'
const mockCreateLink = vi.mocked(createLink)
const mockFindLinkIdByUrl = vi.mocked(findLinkIdByUrl)
const mockFetchLinkMeta = vi.mocked(fetchLinkMeta)

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateLink.mockResolvedValue(SAVED_LINK)
  mockFindLinkIdByUrl.mockResolvedValue(null)
  mockFetchLinkMeta.mockResolvedValue({ title: null, description: null, image: null, duration: null })
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

    it('defaults autoFetch to true when no preference is passed', () => {
      const { result } = renderHook(() => useAddLinkForm())
      expect(result.current.autoFetch).toBe(true)
    })

    it('honors a saved autoFetchDefault of false', () => {
      const { result } = renderHook(() => useAddLinkForm(undefined, undefined, undefined, false))
      expect(result.current.autoFetch).toBe(false)
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

  describe('reopening (isOpen transition)', () => {
    it('clears fields left over from an abandoned session when isOpen flips from false to true', () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useAddLinkForm(undefined, undefined, isOpen),
        { initialProps: { isOpen: true } },
      )

      act(() => {
        result.current.setUrl('https://example.com')
        result.current.setTitle('Abandoned title')
        result.current.setNotes('Abandoned notes')
      })

      rerender({ isOpen: false })
      rerender({ isOpen: true })

      expect(result.current.url).toBe('')
      expect(result.current.title).toBe('')
      expect(result.current.notes).toBe('')
    })

    it('does not clear fields while isOpen stays true', () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useAddLinkForm(undefined, undefined, isOpen),
        { initialProps: { isOpen: true } },
      )

      act(() => result.current.setTitle('Still typing'))
      rerender({ isOpen: true })

      expect(result.current.title).toBe('Still typing')
    })

    it('re-applies initialUrl/initialTitle on reopen', () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useAddLinkForm('https://initial.com', 'Initial title', isOpen),
        { initialProps: { isOpen: true } },
      )

      act(() => {
        result.current.setUrl('https://typed-over.com')
        result.current.setTitle('Typed over')
      })

      rerender({ isOpen: false })
      rerender({ isOpen: true })

      expect(result.current.url).toBe('https://initial.com')
      expect(result.current.title).toBe('Initial title')
    })

    it('resets autoFetch back to enabled on reopen', async () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useAddLinkForm(undefined, undefined, isOpen),
        { initialProps: { isOpen: true } },
      )

      act(() => result.current.toggleAutoFetch())
      expect(result.current.autoFetch).toBe(false)

      rerender({ isOpen: false })
      rerender({ isOpen: true })

      await waitFor(() => expect(result.current.autoFetch).toBe(true))
    })

    it('resets autoFetch to the saved preference (not hardcoded true) on reopen', async () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useAddLinkForm(undefined, undefined, isOpen, false),
        { initialProps: { isOpen: true } },
      )

      expect(result.current.autoFetch).toBe(false)

      act(() => result.current.toggleAutoFetch())
      expect(result.current.autoFetch).toBe(true)

      rerender({ isOpen: false })
      rerender({ isOpen: true })

      await waitFor(() => expect(result.current.autoFetch).toBe(false))
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
      }), FAKE_DEK)
    })

    it('uses the provided title when set', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setTitle('My Title'); result.current.setCategoryId('cat-1') })
      await act(async () => { await result.current.handleSubmit() })

      expect(mockCreateLink).toHaveBeenCalledWith(expect.objectContaining({ title: 'My Title' }), FAKE_DEK)
    })

    it('passes parsed tags as an array to createLink', async () => {
      const { result } = renderHook(() => useAddLinkForm())

      act(() => { result.current.setUrl('https://example.com'); result.current.setTags(' react , css , '); result.current.setCategoryId('cat-1') })
      await act(async () => { await result.current.handleSubmit() })

      expect(mockCreateLink).toHaveBeenCalledWith(expect.objectContaining({
        tags: ['react', 'css'],
      }), FAKE_DEK)
    })

    describe('duplicate URL', () => {
      it('sets a duplicate-specific error and returns null without calling createLink', async () => {
        mockFindLinkIdByUrl.mockResolvedValue('existing-id')
        const { result } = renderHook(() => useAddLinkForm())

        act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })
        let returned: LinkWithTags | null = SAVED_LINK
        await act(async () => { returned = await result.current.handleSubmit() })

        expect(returned).toBeNull()
        expect(result.current.error).toBe('A link with this URL already exists.')
        expect(mockCreateLink).not.toHaveBeenCalled()
      })

      it('is not submitting after a duplicate is found', async () => {
        mockFindLinkIdByUrl.mockResolvedValue('existing-id')
        const { result } = renderHook(() => useAddLinkForm())

        act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })
        await act(async () => { await result.current.handleSubmit() })

        expect(result.current.submitting).toBe(false)
      })

      it('proceeds to createLink when no duplicate is found', async () => {
        mockFindLinkIdByUrl.mockResolvedValue(null)
        const { result } = renderHook(() => useAddLinkForm())

        act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })
        await act(async () => { await result.current.handleSubmit() })

        expect(mockFindLinkIdByUrl).toHaveBeenCalledWith('https://example.com', FAKE_DEK)
        expect(mockCreateLink).toHaveBeenCalled()
      })
    })
  })

  describe('live duplicate check', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('stays null and does not check while the url is empty or invalid', async () => {
      const { result } = renderHook(() => useAddLinkForm())
      expect(result.current.duplicateLinkId).toBeNull()

      act(() => result.current.setUrl('not-a-url'))
      await act(async () => { await vi.advanceTimersByTimeAsync(600) })

      expect(result.current.duplicateLinkId).toBeNull()
      expect(mockFindLinkIdByUrl).not.toHaveBeenCalled()
    })

    it('clears the url and sets duplicateLinkId once the debounce elapses on a duplicate', async () => {
      mockFindLinkIdByUrl.mockResolvedValue('existing-id')
      const { result } = renderHook(() => useAddLinkForm())

      act(() => result.current.setUrl('https://example.com'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(result.current.url).toBe('https://example.com')
      expect(result.current.duplicateLinkId).toBeNull()

      await act(async () => { await vi.advanceTimersByTimeAsync(100) })
      expect(result.current.url).toBe('')
      expect(result.current.duplicateLinkId).toBe('existing-id')
    })

    it('keeps duplicateLinkId set after clearing the url, instead of it being wiped by the url change', async () => {
      // Regression check: clearing the url ourselves re-runs this same effect (its
      // dependency changed), which must NOT reset duplicateLinkId back to null just
      // because the url is now empty -- only a genuinely new url being typed should.
      mockFindLinkIdByUrl.mockResolvedValue('existing-id')
      const { result } = renderHook(() => useAddLinkForm())

      act(() => result.current.setUrl('https://example.com'))
      await act(async () => { await vi.advanceTimersByTimeAsync(600) })

      expect(result.current.url).toBe('')
      expect(result.current.duplicateLinkId).toBe('existing-id')

      // give it plenty more time to make sure nothing later clears it either
      await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      expect(result.current.duplicateLinkId).toBe('existing-id')
    })

    it('leaves the url untouched and duplicateLinkId null when it does not match an existing link', async () => {
      mockFindLinkIdByUrl.mockResolvedValue(null)
      const { result } = renderHook(() => useAddLinkForm())

      act(() => result.current.setUrl('https://example.com'))
      await act(async () => { await vi.advanceTimersByTimeAsync(600) })

      expect(result.current.url).toBe('https://example.com')
      expect(result.current.duplicateLinkId).toBeNull()
    })

    it('cancels a pending check and only checks the final url when it changes again', async () => {
      mockFindLinkIdByUrl.mockResolvedValue('existing-id')
      const { result } = renderHook(() => useAddLinkForm())

      act(() => result.current.setUrl('https://example.com'))
      await act(async () => { await vi.advanceTimersByTimeAsync(300) })

      act(() => result.current.setUrl('https://example.com/2'))
      expect(result.current.duplicateLinkId).toBeNull() // stale result cleared immediately

      await act(async () => { await vi.advanceTimersByTimeAsync(300) })
      expect(mockFindLinkIdByUrl).not.toHaveBeenCalled() // first (cancelled) timer never fired

      await act(async () => { await vi.advanceTimersByTimeAsync(300) })
      expect(mockFindLinkIdByUrl).toHaveBeenCalledTimes(1)
      expect(mockFindLinkIdByUrl).toHaveBeenCalledWith('https://example.com/2', FAKE_DEK)
      expect(result.current.duplicateLinkId).toBe('existing-id')
    })

    it('skips the og:meta fetch entirely when a duplicate is found', async () => {
      mockFindLinkIdByUrl.mockResolvedValue('existing-id')
      const { result } = renderHook(() => useAddLinkForm())

      act(() => result.current.setUrl('https://example.com'))
      await act(async () => { await vi.advanceTimersByTimeAsync(600) })

      expect(mockFetchLinkMeta).not.toHaveBeenCalled()
    })

    it('still fetches og:meta when no duplicate is found and autoFetch is on', async () => {
      mockFindLinkIdByUrl.mockResolvedValue(null)
      const { result } = renderHook(() => useAddLinkForm())

      act(() => result.current.setUrl('https://example.com'))
      await act(async () => { await vi.advanceTimersByTimeAsync(600) })

      expect(mockFetchLinkMeta).toHaveBeenCalledWith('https://example.com')
    })
  })
})
