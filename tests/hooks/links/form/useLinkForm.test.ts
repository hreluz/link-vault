// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinkForm, DEFAULT_FIELDS } from '@/lib/hooks/links/form/useLinkForm'

// ── helpers ───────────────────────────────────────────────────────────────────

function render(overrides?: Partial<typeof DEFAULT_FIELDS>) {
  return renderHook(() => useLinkForm({ ...DEFAULT_FIELDS, ...overrides }))
}

// ── initial state ─────────────────────────────────────────────────────────────

describe('useLinkForm', () => {
  describe('initial state', () => {
    it('exposes all default fields', () => {
      const { result } = render()

      expect(result.current.url).toBe('')
      expect(result.current.title).toBe('')
      expect(result.current.description).toBe('')
      expect(result.current.status).toBe('unread')
      expect(result.current.tags).toBe('')
      expect(result.current.notes).toBe('')
      expect(result.current.error).toBeNull()
      expect(result.current.submitting).toBe(false)
    })

    it('accepts custom initial values', () => {
      const { result } = render({ url: 'https://example.com', title: 'Hello' })

      expect(result.current.url).toBe('https://example.com')
      expect(result.current.title).toBe('Hello')
    })
  })

  // ── field setters ─────────────────────────────────────────────────────────

  describe('field setters', () => {
    it('setUrl updates url', () => {
      const { result } = render()
      act(() => result.current.setUrl('https://new.com'))
      expect(result.current.url).toBe('https://new.com')
    })

    it('setTitle updates title', () => {
      const { result } = render()
      act(() => result.current.setTitle('My Title'))
      expect(result.current.title).toBe('My Title')
    })

    it('setDescription updates description', () => {
      const { result } = render()
      act(() => result.current.setDescription('A desc'))
      expect(result.current.description).toBe('A desc')
    })

    it('setStatus updates status', () => {
      const { result } = render()
      act(() => result.current.setStatus('read'))
      expect(result.current.status).toBe('read')
    })

    it('setTags updates tags', () => {
      const { result } = render()
      act(() => result.current.setTags('react, css'))
      expect(result.current.tags).toBe('react, css')
    })

    it('setNotes updates notes', () => {
      const { result } = render()
      act(() => result.current.setNotes('my note'))
      expect(result.current.notes).toBe('my note')
    })
  })

  // ── parsedTags ────────────────────────────────────────────────────────────

  describe('parsedTags', () => {
    it('splits comma-separated tags and trims whitespace', () => {
      const { result } = render()
      act(() => result.current.setTags(' react , css , vue '))
      expect(result.current.parsedTags).toEqual(['react', 'css', 'vue'])
    })

    it('returns an empty array when tags is empty', () => {
      const { result } = render()
      expect(result.current.parsedTags).toEqual([])
    })

    it('filters out blank entries from extra commas', () => {
      const { result } = render()
      act(() => result.current.setTags('react,,css,'))
      expect(result.current.parsedTags).toEqual(['react', 'css'])
    })
  })

  // ── resolvedTitle ─────────────────────────────────────────────────────────

  describe('resolvedTitle', () => {
    it('returns the title when provided', () => {
      const { result } = render()
      act(() => { result.current.setUrl('https://example.com'); result.current.setTitle('My Title') })
      expect(result.current.resolvedTitle).toBe('My Title')
    })

    it('falls back to url without protocol when title is empty', () => {
      const { result } = render()
      act(() => result.current.setUrl('https://example.com/path'))
      expect(result.current.resolvedTitle).toBe('example.com/path')
    })

    it('truncates fallback title to 30 characters', () => {
      const { result } = render()
      act(() => result.current.setUrl('https://example.com/a/very/long/path/that/goes/on'))
      expect(result.current.resolvedTitle).toHaveLength(30)
      expect(result.current.resolvedTitle).toBe('example.com/a/very/long/path/t')
    })
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all fields back to defaults', () => {
      const { result } = render()

      act(() => {
        result.current.setUrl('https://example.com')
        result.current.setTitle('Title')
        result.current.setStatus('read')
        result.current.setTags('react')
        result.current.setNotes('note')
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

  // ── validate (via wrapSubmit) ─────────────────────────────────────────────

  describe('validate', () => {
    it('sets error and returns null when url is empty', async () => {
      const { result } = render()

      let out: unknown = 'not-null'
      await act(async () => { out = await result.current.wrapSubmit(async () => 'ok', 'fail') })

      expect(out).toBeNull()
      expect(result.current.error).toBeTruthy()
    })

    it('sets error and returns null when url is not a valid URL', async () => {
      const { result } = render()

      act(() => result.current.setUrl('not-a-url'))
      let out: unknown = 'not-null'
      await act(async () => { out = await result.current.wrapSubmit(async () => 'ok', 'fail') })

      expect(out).toBeNull()
      expect(result.current.error).toBeTruthy()
    })

    it('sets error and returns null when categoryId is null', async () => {
      const { result } = render({ url: 'https://example.com', categoryId: null })

      let out: unknown = 'not-null'
      await act(async () => { out = await result.current.wrapSubmit(async () => 'ok', 'fail') })

      expect(out).toBeNull()
      expect(result.current.error).toBeTruthy()
    })

    it('clears the error before running the action', async () => {
      const { result } = render()

      // First trigger a validation error
      await act(async () => { await result.current.wrapSubmit(async () => null, 'fail') })
      expect(result.current.error).toBeTruthy()

      // Now provide valid URL + category and succeed
      act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })
      await act(async () => { await result.current.wrapSubmit(async () => 'ok', 'fail') })

      expect(result.current.error).toBeNull()
    })
  })

  // ── wrapSubmit ────────────────────────────────────────────────────────────

  describe('wrapSubmit', () => {
    it('returns the action result on success', async () => {
      const { result } = render()
      act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })

      let out: unknown
      await act(async () => { out = await result.current.wrapSubmit(async () => 'done', 'fail') })

      expect(out).toBe('done')
    })

    it('sets the failMsg as error and returns null when action returns null', async () => {
      const { result } = render()
      act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })

      let out: unknown = 'not-null'
      await act(async () => { out = await result.current.wrapSubmit(async () => null, 'Something went wrong.') })

      expect(out).toBeNull()
      expect(result.current.error).toBe('Something went wrong.')
    })

    it('is not submitting before or after the call', async () => {
      const { result } = render()
      act(() => { result.current.setUrl('https://example.com'); result.current.setCategoryId('cat-1') })

      expect(result.current.submitting).toBe(false)
      await act(async () => { await result.current.wrapSubmit(async () => 'ok', 'fail') })
      expect(result.current.submitting).toBe(false)
    })
  })
})
