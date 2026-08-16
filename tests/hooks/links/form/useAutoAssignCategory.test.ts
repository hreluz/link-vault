// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { useAutoAssignCategory } from '@/lib/hooks/links/form/useAutoAssignCategory'
import type { Category } from '@/lib/services/categories'

vi.mock('@/lib/services/category-domains', () => ({
  getCategoryIdByDomain: vi.fn(),
}))

const FAKE_DEK = {} as CryptoKey
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

import { getCategoryIdByDomain } from '@/lib/services/category-domains'
const mockGetCategoryIdByDomain = vi.mocked(getCategoryIdByDomain)

const CAT_BASE = { user_id: 'u1', description: null, color: null, emoticon: null, created_at: '', updated_at: '' }
const NOT_DEFINED: Category = { ...CAT_BASE, id: 'cat-nd', name: 'Not defined' }
const YOUTUBE: Category    = { ...CAT_BASE, id: 'cat-yt', name: 'YouTube' }
const GITHUB: Category     = { ...CAT_BASE, id: 'cat-gh', name: 'GitHub' }
const CATEGORIES = [NOT_DEFINED, YOUTUBE, GITHUB]

function useTestForm(initialUrl = '') {
  const [url, setUrl] = useState(initialUrl)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  return { url, setUrl, categoryId, setCategoryId }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCategoryIdByDomain.mockResolvedValue(null)
})

describe('useAutoAssignCategory', () => {
  describe('initial category setup', () => {
    it('sets "Not defined" category when activated with loaded categories', () => {
      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, CATEGORIES, true)
        return form
      })

      expect(result.current.categoryId).toBe('cat-nd')
    })

    it('does not set category when active is false', () => {
      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, CATEGORIES, false)
        return form
      })

      expect(result.current.categoryId).toBeNull()
    })

    it('does not set category when categories list is empty', () => {
      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, [], true)
        return form
      })

      expect(result.current.categoryId).toBeNull()
    })

    it('sets "Not defined" when categories load after activation', async () => {
      const { result, rerender } = renderHook(
        ({ cats }: { cats: Category[] }) => {
          const form = useTestForm()
          useAutoAssignCategory(form, cats, true)
          return form
        },
        { initialProps: { cats: [] as Category[] } },
      )

      expect(result.current.categoryId).toBeNull()

      rerender({ cats: CATEGORIES })

      expect(result.current.categoryId).toBe('cat-nd')
    })
  })

  describe('domain-based auto-assign', () => {
    it('assigns the matched category when URL has a known domain', async () => {
      mockGetCategoryIdByDomain.mockResolvedValue('cat-yt')

      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, CATEGORIES, true)
        return form
      })

      await act(async () => {
        result.current.setUrl('https://youtube.com/watch?v=abc')
      })

      await waitFor(() => expect(result.current.categoryId).toBe('cat-yt'))
    })

    it('stays on "Not defined" when URL has no domain match', async () => {
      mockGetCategoryIdByDomain.mockResolvedValue(null)

      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, CATEGORIES, true)
        return form
      })

      await act(async () => {
        result.current.setUrl('https://unknownsite.com')
      })

      await waitFor(() => expect(mockGetCategoryIdByDomain).toHaveBeenCalled())
      expect(result.current.categoryId).toBe('cat-nd')
    })

    it('updates to new category when URL changes to another known domain', async () => {
      mockGetCategoryIdByDomain.mockResolvedValueOnce('cat-yt').mockResolvedValueOnce('cat-gh')

      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, CATEGORIES, true)
        return form
      })

      await act(async () => { result.current.setUrl('https://youtube.com') })
      await waitFor(() => expect(result.current.categoryId).toBe('cat-yt'))

      await act(async () => { result.current.setUrl('https://github.com') })
      await waitFor(() => expect(result.current.categoryId).toBe('cat-gh'))
    })

    it('falls back to "Not defined" when URL changes to an unmatched domain', async () => {
      mockGetCategoryIdByDomain.mockResolvedValueOnce('cat-yt').mockResolvedValueOnce(null)

      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, CATEGORIES, true)
        return form
      })

      await act(async () => { result.current.setUrl('https://youtube.com') })
      await waitFor(() => expect(result.current.categoryId).toBe('cat-yt'))

      await act(async () => { result.current.setUrl('https://unknownsite.com') })
      await waitFor(() => expect(result.current.categoryId).toBe('cat-nd'))
    })

    it('does not override a manually set category', async () => {
      mockGetCategoryIdByDomain.mockResolvedValue('cat-yt')

      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, CATEGORIES, true)
        return form
      })

      act(() => { result.current.setCategoryId('cat-gh') })

      await act(async () => { result.current.setUrl('https://youtube.com') })

      await waitFor(() => expect(mockGetCategoryIdByDomain).toHaveBeenCalled())
      expect(result.current.categoryId).toBe('cat-gh')
    })

    it('ignores invalid URLs without throwing', async () => {
      const { result } = renderHook(() => {
        const form = useTestForm()
        useAutoAssignCategory(form, CATEGORIES, true)
        return form
      })

      await act(async () => { result.current.setUrl('not-a-url') })

      expect(mockGetCategoryIdByDomain).not.toHaveBeenCalled()
      expect(result.current.categoryId).toBe('cat-nd')
    })
  })
})
