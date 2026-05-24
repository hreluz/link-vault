import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLinks, createLink, updateLink } from '@/lib/services/links'

// ── shared mocks ──────────────────────────────────────────────────────────────

const {
  // getLinks chain: from('links').select().order().returns()
  mockGetLinksSelect, mockOrder, mockReturns,
  // auth
  mockGetUser,
  // createLink – links insert chain: from('links').insert().select().single()
  mockLinksInsert, mockLinksSingle,
  // updateLink – links update chain: from('links').update().eq().select().single()
  mockLinksUpdate, mockLinksUpdateEq, mockLinksUpdateSingle,
  // tags upsert: from('tags').upsert()
  mockTagsUpsert,
  // tags select chain: from('tags').select().eq().in()
  mockTagsSelect, mockTagsIn,
  // link_tags insert: from('link_tags').insert()
  mockLinkTagsInsert,
  // link_tags delete chain: from('link_tags').delete().eq()
  mockLinkTagsDelete, mockLinkTagsDeleteEq,
} = vi.hoisted(() => {
  const mockReturns = vi.fn()
  const mockOrder = vi.fn(() => ({ returns: mockReturns }))
  const mockGetLinksSelect = vi.fn(() => ({ order: mockOrder }))

  const mockGetUser = vi.fn()

  const mockLinksSingle = vi.fn()
  const mockLinksSelectAfterInsert = vi.fn(() => ({ single: mockLinksSingle }))
  const mockLinksInsert = vi.fn(() => ({ select: mockLinksSelectAfterInsert }))

  const mockLinksUpdateSingle = vi.fn()
  const mockLinksUpdateSelect = vi.fn(() => ({ single: mockLinksUpdateSingle }))
  const mockLinksUpdateEq = vi.fn(() => ({ select: mockLinksUpdateSelect }))
  const mockLinksUpdate = vi.fn(() => ({ eq: mockLinksUpdateEq }))

  const mockTagsUpsert = vi.fn()

  const mockTagsIn = vi.fn()
  const mockTagsEq = vi.fn(() => ({ in: mockTagsIn }))
  const mockTagsSelect = vi.fn(() => ({ eq: mockTagsEq }))

  const mockLinkTagsInsert = vi.fn()
  const mockLinkTagsDeleteEq = vi.fn()
  const mockLinkTagsDelete = vi.fn(() => ({ eq: mockLinkTagsDeleteEq }))

  return {
    mockGetLinksSelect, mockOrder, mockReturns,
    mockGetUser,
    mockLinksInsert, mockLinksSingle,
    mockLinksUpdate, mockLinksUpdateEq, mockLinksUpdateSingle,
    mockTagsUpsert, mockTagsSelect, mockTagsIn,
    mockLinkTagsInsert, mockLinkTagsDelete, mockLinkTagsDeleteEq,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'links') return { select: mockGetLinksSelect, insert: mockLinksInsert, update: mockLinksUpdate }
      if (table === 'tags') return { upsert: mockTagsUpsert, select: mockTagsSelect }
      if (table === 'link_tags') return { insert: mockLinkTagsInsert, delete: mockLinkTagsDelete }
      return {}
    }),
  })),
}))

const RAW_LINK = {
  id: '1', url: 'https://example.com', title: 'Example',
  description: 'A description', site_name: 'example.com',
  content_type: 'article', status: 'unread', is_favorite: false,
  notes: null, image_url: null, user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockLinksSingle.mockResolvedValue({ data: RAW_LINK, error: null })
  mockLinksUpdateSingle.mockResolvedValue({ data: RAW_LINK, error: null })
  mockTagsUpsert.mockResolvedValue({ error: null })
  mockTagsIn.mockResolvedValue({ data: [] })
  mockLinkTagsInsert.mockResolvedValue({ error: null })
  mockLinkTagsDeleteEq.mockResolvedValue({ error: null })
})

// ── getLinks ──────────────────────────────────────────────────────────────────

describe('getLinks', () => {
  it('returns links with tags flattened', async () => {
    mockReturns.mockResolvedValue({
      data: [{ ...RAW_LINK, link_tags: [{ tags: { name: 'react' } }, { tags: { name: 'css' } }] }],
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
    mockReturns.mockResolvedValue({ data: [{ ...RAW_LINK, link_tags: [] }], error: null })

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

    expect(await getLinks()).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockReturns.mockResolvedValue({ data: null, error: null })

    expect(await getLinks()).toEqual([])
  })

  it('queries with descending created_at order', async () => {
    mockReturns.mockResolvedValue({ data: [], error: null })

    await getLinks()

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('selects link_tags with nested tags', async () => {
    mockReturns.mockResolvedValue({ data: [], error: null })

    await getLinks()

    expect(mockGetLinksSelect).toHaveBeenCalledWith('*, link_tags(tags(name))')
  })
})

// ── createLink ────────────────────────────────────────────────────────────────

describe('createLink', () => {
  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createLink({ url: 'https://x.com', content_type: 'article', status: 'unread', tags: [] })

    expect(result).toBeNull()
  })

  it('returns null when the link insert fails', async () => {
    mockLinksSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const result = await createLink({ url: 'https://x.com', content_type: 'article', status: 'unread', tags: [] })

    expect(result).toBeNull()
  })

  it('returns the link with an empty tags array when no tags are provided', async () => {
    const result = await createLink({ url: 'https://x.com', content_type: 'article', status: 'unread', tags: [] })

    expect(result).toMatchObject({ ...RAW_LINK, tags: [] })
  })

  it('returns the link with tags when tags are resolved', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }, { id: 't2', name: 'css' }] })

    const result = await createLink({ url: 'https://x.com', content_type: 'article', status: 'unread', tags: ['react', 'css'] })

    expect(result?.tags).toEqual(['react', 'css'])
  })

  it('returns the link with empty tags when tag fetch returns nothing', async () => {
    mockTagsIn.mockResolvedValue({ data: null })

    const result = await createLink({ url: 'https://x.com', content_type: 'article', status: 'unread', tags: ['react'] })

    expect(result?.tags).toEqual([])
  })

  it('inserts the link with the correct fields', async () => {
    await createLink({ url: 'https://x.com', title: 'My Link', content_type: 'article', status: 'watching', notes: 'note', tags: [] })

    expect(mockLinksInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      url: 'https://x.com',
      title: 'My Link',
      content_type: 'article',
      status: 'watching',
      notes: 'note',
    }))
  })

  it('upserts tags before fetching their ids', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }] })

    await createLink({ url: 'https://x.com', content_type: 'article', status: 'unread', tags: ['react'] })

    expect(mockTagsUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-1', name: 'react' }],
      expect.objectContaining({ onConflict: 'user_id,name' }),
    )
  })

  it('inserts link_tag rows for each resolved tag', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }, { id: 't2', name: 'css' }] })

    await createLink({ url: 'https://x.com', content_type: 'article', status: 'unread', tags: ['react', 'css'] })

    expect(mockLinkTagsInsert).toHaveBeenCalledWith([
      { link_id: RAW_LINK.id, tag_id: 't1' },
      { link_id: RAW_LINK.id, tag_id: 't2' },
    ])
  })
})

// ── updateLink ────────────────────────────────────────────────────────────────

describe('updateLink', () => {
  const INPUT = { id: '1', url: 'https://example.com', content_type: 'article' as const, status: 'unread' as const, tags: [] }

  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await updateLink(INPUT)).toBeNull()
  })

  it('returns null when the link update fails', async () => {
    mockLinksUpdateSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })

    expect(await updateLink(INPUT)).toBeNull()
  })

  it('returns the link with an empty tags array when no tags are provided', async () => {
    const result = await updateLink(INPUT)

    expect(result).toMatchObject({ ...RAW_LINK, tags: [] })
  })

  it('returns the link with tags when tags are resolved', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }, { id: 't2', name: 'css' }] })

    const result = await updateLink({ ...INPUT, tags: ['react', 'css'] })

    expect(result?.tags).toEqual(['react', 'css'])
  })

  it('returns the link with empty tags when tag fetch returns nothing', async () => {
    mockTagsIn.mockResolvedValue({ data: null })

    const result = await updateLink({ ...INPUT, tags: ['react'] })

    expect(result?.tags).toEqual([])
  })

  it('updates the link with the correct fields', async () => {
    await updateLink({ ...INPUT, url: 'https://new.com', title: 'New Title', content_type: 'youtube', status: 'read', notes: 'a note' })

    expect(mockLinksUpdate).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://new.com',
      title: 'New Title',
      content_type: 'youtube',
      status: 'read',
      notes: 'a note',
    }))
  })

  it('targets the correct link id', async () => {
    await updateLink(INPUT)

    expect(mockLinksUpdateEq).toHaveBeenCalledWith('id', '1')
  })

  it('deletes existing link_tags before reinserting', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }] })

    await updateLink({ ...INPUT, tags: ['react'] })

    expect(mockLinkTagsDelete).toHaveBeenCalled()
    expect(mockLinkTagsDeleteEq).toHaveBeenCalledWith('link_id', '1')
    expect(mockLinkTagsInsert).toHaveBeenCalled()
  })

  it('deletes existing link_tags even when new tags list is empty', async () => {
    await updateLink(INPUT)

    expect(mockLinkTagsDelete).toHaveBeenCalled()
    expect(mockLinkTagsDeleteEq).toHaveBeenCalledWith('link_id', '1')
  })
})
