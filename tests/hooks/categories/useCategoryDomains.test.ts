// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCategoryDomains } from '@/lib/hooks/categories/useCategoryDomains'
import type { CategoryDomain } from '@/lib/services/category-domains'

vi.mock('@/lib/services/category-domains', () => ({
  getCategoryDomains: vi.fn(),
  addCategoryDomain: vi.fn(),
  removeCategoryDomain: vi.fn(),
}))

import { getCategoryDomains, addCategoryDomain, removeCategoryDomain } from '@/lib/services/category-domains'
const mockGet = vi.mocked(getCategoryDomains)
const mockAdd = vi.mocked(addCategoryDomain)
const mockRemove = vi.mocked(removeCategoryDomain)

const DOMAIN_A: CategoryDomain = {
  id: 'd1', category_id: 'cat-1', user_id: 'u1',
  domain: 'github.com', created_at: '2026-01-01T00:00:00Z',
}
const DOMAIN_B: CategoryDomain = {
  id: 'd2', category_id: 'cat-1', user_id: 'u1',
  domain: 'youtube.com', created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue([DOMAIN_A, DOMAIN_B])
})

async function renderLoaded(categoryId = 'cat-1') {
  const utils = renderHook(() => useCategoryDomains(categoryId))
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useCategoryDomains', () => {
  describe('initial state', () => {
    it('starts in loading with no domains', () => {
      mockGet.mockImplementation(() => new Promise(() => {}))
      const { result } = renderHook(() => useCategoryDomains('cat-1'))

      expect(result.current.loading).toBe(true)
      expect(result.current.domains).toHaveLength(0)
      expect(result.current.error).toBeNull()
    })

    it('loads domains and clears loading', async () => {
      const { result } = await renderLoaded()

      expect(result.current.domains).toEqual([DOMAIN_A, DOMAIN_B])
      expect(result.current.loading).toBe(false)
    })

    it('passes the categoryId to the service', async () => {
      await renderLoaded('cat-99')

      expect(mockGet).toHaveBeenCalledWith('cat-99')
    })
  })

  describe('add', () => {
    it('returns true and appends the new domain on success', async () => {
      const newDomain: CategoryDomain = { ...DOMAIN_A, id: 'd3', domain: 'example.com' }
      mockAdd.mockResolvedValue({ data: newDomain, error: null })
      const { result } = await renderLoaded()

      let ok: boolean | undefined
      await act(async () => { ok = await result.current.add('example.com') })

      expect(ok).toBe(true)
      expect(result.current.domains.find(d => d.id === 'd3')).toBeDefined()
    })

    it('keeps the list alphabetically sorted after add', async () => {
      const newDomain: CategoryDomain = { ...DOMAIN_A, id: 'd3', domain: 'alpha.com' }
      mockAdd.mockResolvedValue({ data: newDomain, error: null })
      const { result } = await renderLoaded()

      await act(async () => { await result.current.add('alpha.com') })

      expect(result.current.domains[0].domain).toBe('alpha.com')
    })

    it('returns false and sets error on domain_taken', async () => {
      mockAdd.mockResolvedValue({ data: null, error: 'domain_taken' })
      const { result } = await renderLoaded()

      let ok: boolean | undefined
      await act(async () => { ok = await result.current.add('github.com') })

      expect(ok).toBe(false)
      expect(result.current.error).toBeTruthy()
      expect(result.current.domains).toHaveLength(2)
    })

    it('returns false and sets error on invalid_domain', async () => {
      mockAdd.mockResolvedValue({ data: null, error: 'invalid_domain' })
      const { result } = await renderLoaded()

      let ok: boolean | undefined
      await act(async () => { ok = await result.current.add('bad') })

      expect(ok).toBe(false)
      expect(result.current.error).toBeTruthy()
    })

    it('returns false and sets a generic error on other failures', async () => {
      mockAdd.mockResolvedValue({ data: null, error: 'db_error' })
      const { result } = await renderLoaded()

      let ok: boolean | undefined
      await act(async () => { ok = await result.current.add('github.com') })

      expect(ok).toBe(false)
      expect(result.current.error).toBeTruthy()
    })

    it('clears a previous error on the next add attempt', async () => {
      mockAdd.mockResolvedValueOnce({ data: null, error: 'domain_taken' })
      const newDomain: CategoryDomain = { ...DOMAIN_A, id: 'd3', domain: 'new.com' }
      mockAdd.mockResolvedValueOnce({ data: newDomain, error: null })
      const { result } = await renderLoaded()

      await act(async () => { await result.current.add('github.com') })
      expect(result.current.error).toBeTruthy()

      await act(async () => { await result.current.add('new.com') })
      expect(result.current.error).toBeNull()
    })
  })

  describe('remove', () => {
    it('removes the domain from the list on success', async () => {
      mockRemove.mockResolvedValue(true)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.remove('d1') })

      expect(result.current.domains.find(d => d.id === 'd1')).toBeUndefined()
      expect(result.current.domains).toHaveLength(1)
    })

    it('does not remove the domain when the service fails', async () => {
      mockRemove.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.remove('d1') })

      expect(result.current.domains).toHaveLength(2)
    })
  })
})
