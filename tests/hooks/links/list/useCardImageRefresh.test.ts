// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import type { LinkMeta } from '@/app/dashboard/link/actions'
import type { LinkWithTags } from '@/lib/services/links'

vi.mock('@/app/dashboard/link/actions', () => ({ fetchLinkMeta: vi.fn() }))
vi.mock('@/lib/services/links', () => ({ updateLinkImage: vi.fn() }))

import { useCardImageRefresh, IMAGE_REFRESH_GAP_MS } from '@/lib/hooks/links/list/useCardImageRefresh'

const dek = {} as CryptoKey
const fetchMeta = vi.fn<(url: string) => Promise<LinkMeta>>()
const updateImage = vi.fn<(link: LinkWithTags, imageUrl: string, dek: CryptoKey) => Promise<boolean>>()

function makeLink(id: string, url: string, image_url: string | null = `https://cdn.example.com/${id}-old.jpg`): LinkWithTags {
  return {
    id, url, image_url, title: id, description: null, site_name: null, duration: null, notes: null,
    user_id: 'user-1', category_id: 'cat-1', status: 'unread', is_favorite: false,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null, moved_to_end_at: null, tags: [],
  }
}

const meta = (image: string | null, extra: Partial<LinkMeta> = {}): LinkMeta =>
  ({ title: null, description: null, image, duration: null, ...extra })

function setup(initial: LinkWithTags[]) {
  return renderHook(() => {
    const [rawLinks, setRawLinks] = useState(initial)
    const refresh = useCardImageRefresh({ links: rawLinks, setRawLinks, dek, fetchMeta, updateImage })
    return { rawLinks, setRawLinks, ...refresh }
  })
}

async function flush(ms = 0) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

const IG_A = makeLink('a', 'https://www.instagram.com/reel/A/')
const IG_B = makeLink('b', 'https://instagram.com/reel/B/')
const IG_C = makeLink('c', 'https://www.instagram.com/p/C/')
const TT = makeLink('t', 'https://www.tiktok.com/@x/video/1')

beforeEach(() => {
  vi.useFakeTimers()
  fetchMeta.mockReset()
  updateImage.mockReset()
  updateImage.mockResolvedValue(true)
})

afterEach(() => vi.useRealTimers())

describe('useCardImageRefresh', () => {
  it('uses a 4 s same-host gap', () => {
    expect(IMAGE_REFRESH_GAP_MS).toBe(4000)
  })

  it('shows refreshing, then the new image, and saves it once', async () => {
    let resolve!: (m: LinkMeta) => void
    fetchMeta.mockReturnValue(new Promise(r => { resolve = r }))
    const { result } = setup([IG_A])

    act(() => result.current.handleImageError('a'))
    expect(result.current.imageStateById).toEqual({ a: 'refreshing' })
    expect(fetchMeta).toHaveBeenCalledWith(IG_A.url)

    await act(async () => { resolve(meta('https://cdn.example.com/a-new.jpg')) })

    expect(result.current.rawLinks[0].image_url).toBe('https://cdn.example.com/a-new.jpg')
    expect(result.current.imageStateById).toEqual({})
    expect(updateImage).toHaveBeenCalledExactlyOnceWith(IG_A, 'https://cdn.example.com/a-new.jpg', dek)
  })

  it('fails without saving when the fetch returns the same image', async () => {
    fetchMeta.mockResolvedValue(meta(IG_A.image_url))
    const { result } = setup([IG_A])

    act(() => result.current.handleImageError('a'))
    await flush()

    expect(result.current.imageStateById).toEqual({ a: 'failed' })
    expect(result.current.rawLinks[0].image_url).toBe(IG_A.image_url)
    expect(updateImage).not.toHaveBeenCalled()
  })

  it('fails without saving when the fetch returns no image', async () => {
    fetchMeta.mockResolvedValue(meta(null, { generic: true }))
    const { result } = setup([IG_A])

    act(() => result.current.handleImageError('a'))
    await flush()

    expect(result.current.imageStateById).toEqual({ a: 'failed' })
    expect(updateImage).not.toHaveBeenCalled()
  })

  it('fails when the fetch throws', async () => {
    fetchMeta.mockRejectedValue(new Error('network'))
    const { result } = setup([IG_A])

    act(() => result.current.handleImageError('a'))
    await flush()

    expect(result.current.imageStateById).toEqual({ a: 'failed' })
  })

  it('does not refresh a link twice; a second error marks it failed', async () => {
    fetchMeta.mockResolvedValue(meta('https://cdn.example.com/a-new.jpg'))
    const { result } = setup([IG_A])

    act(() => result.current.handleImageError('a'))
    await flush()
    expect(result.current.imageStateById).toEqual({})

    act(() => result.current.handleImageError('a'))
    await flush(IMAGE_REFRESH_GAP_MS)

    expect(fetchMeta).toHaveBeenCalledTimes(1)
    expect(result.current.imageStateById).toEqual({ a: 'failed' })
  })

  it('waits at least 4 s after a same-host fetch ends before the next one', async () => {
    fetchMeta.mockResolvedValue(meta(null))
    const { result } = setup([IG_A, IG_B])

    act(() => {
      result.current.handleImageError('a')
      result.current.handleImageError('b')
    })
    await flush()
    expect(fetchMeta).toHaveBeenCalledTimes(1)
    expect(result.current.imageStateById).toEqual({ a: 'failed', b: 'refreshing' })

    await flush(IMAGE_REFRESH_GAP_MS - 1)
    expect(fetchMeta).toHaveBeenCalledTimes(1)

    await flush(1)
    expect(fetchMeta).toHaveBeenCalledTimes(2)
    expect(fetchMeta).toHaveBeenLastCalledWith(IG_B.url)
  })

  it('does not wait between different host groups, but never fetches two at once', async () => {
    const resolvers: ((m: LinkMeta) => void)[] = []
    fetchMeta.mockImplementation(() => new Promise(r => { resolvers.push(r) }))
    const { result } = setup([IG_A, TT])

    act(() => {
      result.current.handleImageError('a')
      result.current.handleImageError('t')
    })
    await flush()
    expect(fetchMeta).toHaveBeenCalledTimes(1)

    await act(async () => { resolvers[0](meta(null)) })
    await flush()
    expect(fetchMeta).toHaveBeenCalledTimes(2)
    expect(fetchMeta).toHaveBeenLastCalledWith(TT.url)
  })

  it('stops a rate-limited host group for the session; other hosts continue', async () => {
    fetchMeta.mockImplementation(async url =>
      url.includes('instagram') ? meta(null, { rateLimited: true }) : meta('https://cdn.example.com/t-new.jpg'))
    const { result } = setup([IG_A, IG_B, TT, IG_C])

    act(() => {
      result.current.handleImageError('a')
      result.current.handleImageError('b')
      result.current.handleImageError('t')
    })
    await flush()

    expect(fetchMeta.mock.calls.map(([url]) => url)).toEqual([IG_A.url, TT.url])
    expect(result.current.imageStateById).toEqual({ a: 'failed', b: 'failed' })
    expect(result.current.rawLinks.find(l => l.id === 't')!.image_url).toBe('https://cdn.example.com/t-new.jpg')

    act(() => result.current.handleImageError('c'))
    await flush(IMAGE_REFRESH_GAP_MS)

    expect(result.current.imageStateById.c).toBe('failed')
    expect(fetchMeta).toHaveBeenCalledTimes(2)
  })

  it('skips a queued link that left the loaded list', async () => {
    fetchMeta.mockResolvedValue(meta(null))
    const { result } = setup([IG_A, IG_B])

    act(() => {
      result.current.handleImageError('a')
      result.current.handleImageError('b')
    })
    await flush()
    act(() => result.current.setRawLinks(prev => prev.filter(l => l.id !== 'b')))
    await flush(IMAGE_REFRESH_GAP_MS)

    expect(fetchMeta).toHaveBeenCalledExactlyOnceWith(IG_A.url)
    expect(result.current.imageStateById).toEqual({ a: 'failed' })
  })

  it('still shows the new image when the save fails', async () => {
    fetchMeta.mockResolvedValue(meta('https://cdn.example.com/a-new.jpg'))
    updateImage.mockResolvedValue(false)
    const { result } = setup([IG_A])

    act(() => result.current.handleImageError('a'))
    await flush()

    expect(updateImage).toHaveBeenCalledTimes(1)
    expect(result.current.rawLinks[0].image_url).toBe('https://cdn.example.com/a-new.jpg')
    expect(result.current.imageStateById).toEqual({})
  })
})
