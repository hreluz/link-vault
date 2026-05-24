import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLinks } from '@/lib/services/links'

const { mockSelect, mockOrder, mockReturns } = vi.hoisted(() => {
  const mockReturns = vi.fn()
  const mockOrder = vi.fn(() => ({ returns: mockReturns }))
  const mockSelect = vi.fn(() => ({ order: mockOrder }))
  return { mockSelect, mockOrder, mockReturns }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({ select: mockSelect })),
  })),
}))

const RAW_LINK = {
  id: '1',
  url: 'https://example.com',
  title: 'Example',
  description: 'A description',
  site_name: 'example.com',
  content_type: 'article',
  status: 'unread',
  is_favorite: false,
  notes: null,
  image_url: null,
  user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getLinks', () => {
  it('returns links with tags flattened', async () => {
    mockReturns.mockResolvedValue({
      data: [
        { ...RAW_LINK, link_tags: [{ tags: { name: 'react' } }, { tags: { name: 'css' } }] },
      ],
      error: null,
    })

    const result = await getLinks()

    expect(result).toHaveLength(1)
    expect(result[0].tags).toEqual(['react', 'css'])
  })

  it('omits link_tags from the returned objects', async () => {
    mockReturns.mockResolvedValue({
      data: [{ ...RAW_LINK, link_tags: [{ tags: { name: 'react' } }] }],
      error: null,
    })

    const result = await getLinks()

    expect(result[0]).not.toHaveProperty('link_tags')
  })

  it('returns an empty tags array when link has no tags', async () => {
    mockReturns.mockResolvedValue({
      data: [{ ...RAW_LINK, link_tags: [] }],
      error: null,
    })

    const result = await getLinks()

    expect(result[0].tags).toEqual([])
  })

  it('skips null tag entries', async () => {
    mockReturns.mockResolvedValue({
      data: [{ ...RAW_LINK, link_tags: [{ tags: null }, { tags: { name: 'react' } }] }],
      error: null,
    })

    const result = await getLinks()

    expect(result[0].tags).toEqual(['react'])
  })

  it('returns [] on error', async () => {
    mockReturns.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await getLinks()

    expect(result).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockReturns.mockResolvedValue({ data: null, error: null })

    const result = await getLinks()

    expect(result).toEqual([])
  })

  it('queries with descending created_at order', async () => {
    mockReturns.mockResolvedValue({ data: [], error: null })

    await getLinks()

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('selects link_tags with nested tags', async () => {
    mockReturns.mockResolvedValue({ data: [], error: null })

    await getLinks()

    expect(mockSelect).toHaveBeenCalledWith('*, link_tags(tags(name))')
  })
})
