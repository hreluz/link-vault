import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLinks, createLink, updateLink, toggleLinkFavorite, deleteLink, importLinks } from '@/lib/services/links'

// ── shared mocks ──────────────────────────────────────────────────────────────

const {
  // getLinks chain: from('links').select().is().order().returns()
  mockGetLinksSelect, mockGetLinksIs, mockOrder, mockReturns,
  // auth
  mockGetUser,
  // createLink – links insert chain: from('links').insert().select().single()
  mockLinksInsert, mockLinksSingle,
  // updateLink – links update chain: from('links').update().eq().select().single()
  mockLinksUpdate, mockLinksUpdateEq, mockLinksUpdateSingle,
  // toggleLinkFavorite – from('links').update().eq()
  mockFavoriteToggleEq,
  // deleteLink – from('links').update({ deleted_at }).eq()
  mockLinksDeleteEq,
  // tags upsert: from('tags').upsert()
  mockTagsUpsert,
  // tags select chain: from('tags').select().eq().in()
  mockTagsSelect, mockTagsIn,
  // link_tags insert: from('link_tags').insert()
  mockLinkTagsInsert,
  // link_tags delete chain: from('link_tags').delete().eq()
  mockLinkTagsDelete, mockLinkTagsDeleteEq,
  // importLinks duplicate check: from('links').select('id').eq().eq().is().maybySingle()
  mockDupCheck, mockDupCheckIs, mockDupCheckEqUrl, mockDupCheckEqUser,
} = vi.hoisted(() => {
  const mockReturns = vi.fn()
  const mockOrder = vi.fn(() => ({ returns: mockReturns }))
  const mockGetLinksIs = vi.fn(() => ({ order: mockOrder }))
  const mockGetLinksSelect = vi.fn(() => ({ is: mockGetLinksIs }))

  const mockGetUser = vi.fn()

  const mockLinksSingle = vi.fn()
  const mockLinksSelectAfterInsert = vi.fn(() => ({ single: mockLinksSingle }))
  const mockLinksInsert = vi.fn(() => ({ select: mockLinksSelectAfterInsert }))

  const mockLinksUpdateSingle = vi.fn()
  const mockLinksUpdateSelect = vi.fn(() => ({ single: mockLinksUpdateSingle }))
  const mockLinksUpdateEq = vi.fn(() => ({ select: mockLinksUpdateSelect }))
  const mockFavoriteToggleEq = vi.fn()
  const mockLinksUpdate = vi.fn((args: Record<string, unknown>) => {
    if (args && 'is_favorite' in args) return { eq: mockFavoriteToggleEq }
    if (args && 'deleted_at' in args) return { eq: mockLinksDeleteEq }
    return { eq: mockLinksUpdateEq }
  })

  const mockTagsUpsert = vi.fn()

  const mockTagsIn = vi.fn()
  const mockTagsEq = vi.fn(() => ({ in: mockTagsIn }))
  const mockTagsSelect = vi.fn(() => ({ eq: mockTagsEq }))

  const mockLinkTagsInsert = vi.fn()
  const mockLinkTagsDeleteEq = vi.fn()
  const mockLinkTagsDelete = vi.fn(() => ({ eq: mockLinkTagsDeleteEq }))

  const mockLinksDeleteEq = vi.fn()

  const mockDupCheck = vi.fn()
  const mockDupCheckIs = vi.fn(() => ({ limit: mockDupCheck }))
  const mockDupCheckEqUrl = vi.fn(() => ({ is: mockDupCheckIs }))
  const mockDupCheckEqUser = vi.fn(() => ({ eq: mockDupCheckEqUrl }))

  return {
    mockGetLinksSelect, mockGetLinksIs, mockOrder, mockReturns,
    mockGetUser,
    mockLinksInsert, mockLinksSingle,
    mockLinksUpdate, mockLinksUpdateEq, mockLinksUpdateSingle,
    mockFavoriteToggleEq,
    mockLinksDeleteEq,
    mockTagsUpsert, mockTagsSelect, mockTagsIn,
    mockLinkTagsInsert, mockLinkTagsDelete, mockLinkTagsDeleteEq,
    mockDupCheck, mockDupCheckIs, mockDupCheckEqUrl, mockDupCheckEqUser,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'links') return {
        select: (arg: string) => arg === 'id' ? { eq: mockDupCheckEqUser } : mockGetLinksSelect(arg),
        insert: mockLinksInsert,
        update: mockLinksUpdate,
      }
      if (table === 'tags') return { upsert: mockTagsUpsert, select: mockTagsSelect }
      if (table === 'link_tags') return { insert: mockLinkTagsInsert, delete: mockLinkTagsDelete }
      return {}
    }),
  })),
}))

const RAW_LINK = {
  id: '1', url: 'https://example.com', title: 'Example',
  description: 'A description', site_name: 'example.com',
  status: 'unread', is_favorite: false,
  notes: null, user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockLinksSingle.mockResolvedValue({ data: RAW_LINK, error: null })
  mockLinksUpdateSingle.mockResolvedValue({ data: RAW_LINK, error: null })
  mockFavoriteToggleEq.mockResolvedValue({ error: null })
  mockTagsUpsert.mockResolvedValue({ error: null })
  mockTagsIn.mockResolvedValue({ data: [] })
  mockLinkTagsInsert.mockResolvedValue({ error: null })
  mockLinkTagsDeleteEq.mockResolvedValue({ error: null })
  mockDupCheck.mockResolvedValue({ data: [] })
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

  it('excludes soft-deleted links', async () => {
    mockReturns.mockResolvedValue({ data: [], error: null })

    await getLinks()

    expect(mockGetLinksIs).toHaveBeenCalledWith('deleted_at', null)
  })
})

// ── createLink ────────────────────────────────────────────────────────────────

describe('createLink', () => {
  it('returns null when url is empty', async () => {
    const result = await createLink({ url: '  ', category_id: 'cat-1', status: 'unread', tags: [] })

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when url is not a valid URL', async () => {
    const result = await createLink({ url: 'not-a-url', category_id: 'cat-1', status: 'unread', tags: [] })

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when category_id is empty', async () => {
    const result = await createLink({ url: 'https://x.com', category_id: '', status: 'unread', tags: [] })

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: [] })

    expect(result).toBeNull()
  })

  it('returns null when the link insert fails', async () => {
    mockLinksSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: [] })

    expect(result).toBeNull()
  })

  it('defaults to "no-tag" when no tags are provided', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'no-tag' }] })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: [] })

    expect(result?.tags).toEqual(['no-tag'])
    expect(mockTagsUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-1', name: 'no-tag' }],
      expect.objectContaining({ onConflict: 'user_id,name' }),
    )
  })

  it('returns the link with tags when tags are resolved', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }, { id: 't2', name: 'css' }] })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: ['react', 'css'] })

    expect(result?.tags).toEqual(['react', 'css'])
  })

  it('returns the link with empty tags when tag fetch returns nothing', async () => {
    mockTagsIn.mockResolvedValue({ data: null })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: ['react'] })

    expect(result?.tags).toEqual([])
  })

  it('inserts the link with the correct fields', async () => {
    await createLink({ url: 'https://x.com', title: 'My Link', category_id: 'cat-1', status: 'watching', notes: 'note', tags: [] })

    expect(mockLinksInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      url: 'https://x.com',
      title: 'My Link',
      site_name: 'x.com',
      status: 'watching',
      notes: 'note',
    }))
  })

  it('derives site_name from the URL hostname', async () => {
    await createLink({ url: 'https://www.youtube.com/watch?v=abc', category_id: 'cat-1', status: 'unread', tags: [] })

    expect(mockLinksInsert).toHaveBeenCalledWith(expect.objectContaining({
      site_name: 'www.youtube.com',
    }))
  })

  it('upserts tags before fetching their ids', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }] })

    await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: ['react'] })

    expect(mockTagsUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-1', name: 'react' }],
      expect.objectContaining({ onConflict: 'user_id,name' }),
    )
  })

  it('inserts link_tag rows for each resolved tag', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }, { id: 't2', name: 'css' }] })

    await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: ['react', 'css'] })

    expect(mockLinkTagsInsert).toHaveBeenCalledWith([
      { link_id: RAW_LINK.id, tag_id: 't1' },
      { link_id: RAW_LINK.id, tag_id: 't2' },
    ])
  })
})

// ── updateLink ────────────────────────────────────────────────────────────────

describe('updateLink', () => {
  const INPUT = { id: '1', url: 'https://example.com', category_id: 'cat-1', status: 'unread' as const, tags: [] }

  it('returns null when url is empty', async () => {
    const result = await updateLink({ ...INPUT, url: '   ' })

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when url is not a valid URL', async () => {
    const result = await updateLink({ ...INPUT, url: 'not-a-url' })

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when category_id is empty', async () => {
    const result = await updateLink({ ...INPUT, category_id: '' })

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await updateLink(INPUT)).toBeNull()
  })

  it('returns null when the link update fails', async () => {
    mockLinksUpdateSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })

    expect(await updateLink(INPUT)).toBeNull()
  })

  it('defaults to "no-tag" when no tags are provided', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'no-tag' }] })

    const result = await updateLink(INPUT)

    expect(result?.tags).toEqual(['no-tag'])
    expect(mockTagsUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-1', name: 'no-tag' }],
      expect.objectContaining({ onConflict: 'user_id,name' }),
    )
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
    await updateLink({ ...INPUT, url: 'https://new.com', title: 'New Title', status: 'read', notes: 'a note' })

    expect(mockLinksUpdate).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://new.com',
      title: 'New Title',
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

// ── deleteLink ────────────────────────────────────────────────────────────────

describe('deleteLink', () => {
  it('returns true when the soft-delete succeeds', async () => {
    mockLinksDeleteEq.mockResolvedValue({ error: null })

    expect(await deleteLink('link-1')).toBe(true)
  })

  it('returns false on DB error', async () => {
    mockLinksDeleteEq.mockResolvedValue({ error: { message: 'DB error' } })

    expect(await deleteLink('link-1')).toBe(false)
  })

  it('targets the correct link id', async () => {
    mockLinksDeleteEq.mockResolvedValue({ error: null })

    await deleteLink('link-42')

    expect(mockLinksDeleteEq).toHaveBeenCalledWith('id', 'link-42')
  })

  it('sets deleted_at to a non-null ISO timestamp', async () => {
    mockLinksDeleteEq.mockResolvedValue({ error: null })

    await deleteLink('link-1')

    expect(mockLinksUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) }),
    )
  })

  it('uses update (soft delete) not hard delete', async () => {
    mockLinksDeleteEq.mockResolvedValue({ error: null })

    await deleteLink('link-1')

    expect(mockLinksUpdate).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String) }))
  })
})

// ── importLinks ───────────────────────────────────────────────────────────────

describe('importLinks', () => {
  it('returns { imported: 0, skipped: n, duplicates: 0 } when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await importLinks([{ url: 'https://example.com' }], null)

    expect(result).toEqual({ imported: 0, skipped: 1, duplicates: 0 })
  })

  it('returns { imported: 0, skipped: 0, duplicates: 0 } for an empty inputs array', async () => {
    const result = await importLinks([], null)

    expect(result).toEqual({ imported: 0, skipped: 0, duplicates: 0 })
    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('skips an invalid URL and increments skipped', async () => {
    const result = await importLinks([{ url: 'not-a-url' }], null)

    expect(result).toEqual({ imported: 0, skipped: 1, duplicates: 0 })
    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('skips a blank URL and increments skipped', async () => {
    const result = await importLinks([{ url: '   ' }], null)

    expect(result).toEqual({ imported: 0, skipped: 1, duplicates: 0 })
    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('imports a single valid URL', async () => {
    const result = await importLinks([{ url: 'https://example.com' }], null)

    expect(result).toEqual({ imported: 1, skipped: 0, duplicates: 0 })
  })

  it('always inserts with status unread', async () => {
    await importLinks([{ url: 'https://example.com' }], null)

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unread' }),
    )
  })

  it('uses defaultCategoryId when input has no category_id', async () => {
    await importLinks([{ url: 'https://example.com' }], 'cat-default')

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'cat-default' }),
    )
  })

  it('uses input category_id over the default', async () => {
    await importLinks([{ url: 'https://example.com', category_id: 'cat-override' }], 'cat-default')

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'cat-override' }),
    )
  })

  it('passes null category_id when neither input nor default is set', async () => {
    await importLinks([{ url: 'https://example.com' }], null)

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: null }),
    )
  })

  it('extracts site_name from the URL hostname', async () => {
    await importLinks([{ url: 'https://www.youtube.com/watch?v=xyz' }], null)

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ site_name: 'www.youtube.com' }),
    )
  })

  it('upserts the no-tag when no tags are provided', async () => {
    await importLinks([{ url: 'https://example.com' }], null)

    expect(mockTagsUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-1', name: 'no-tag' }],
      expect.objectContaining({ onConflict: 'user_id,name' }),
    )
  })

  it('upserts provided tags', async () => {
    mockTagsIn.mockResolvedValue({ data: [{ id: 't1', name: 'react' }] })

    await importLinks([{ url: 'https://example.com', tags: ['react'] }], null)

    expect(mockTagsUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-1', name: 'react' }],
      expect.objectContaining({ onConflict: 'user_id,name' }),
    )
  })

  it('increments skipped when the DB insert fails', async () => {
    mockLinksSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const result = await importLinks([{ url: 'https://example.com' }], null)

    expect(result).toEqual({ imported: 0, skipped: 1, duplicates: 0 })
  })

  it('imports multiple valid links', async () => {
    const result = await importLinks([
      { url: 'https://example.com' },
      { url: 'https://github.com' },
      { url: 'https://youtube.com' },
    ], null)

    expect(result).toEqual({ imported: 3, skipped: 0, duplicates: 0 })
    expect(mockLinksInsert).toHaveBeenCalledTimes(3)
  })

  it('counts imported and skipped correctly in a mixed batch', async () => {
    mockLinksSingle
      .mockResolvedValueOnce({ data: RAW_LINK, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'failed' } })

    const result = await importLinks([
      { url: 'https://example.com' },
      { url: 'not-a-url' },
      { url: 'https://github.com' },
    ], null)

    expect(result).toEqual({ imported: 1, skipped: 2, duplicates: 0 })
  })

  it('increments duplicates when the URL already exists', async () => {
    mockDupCheck.mockResolvedValue({ data: [{ id: 'existing-id' }] })

    const result = await importLinks([{ url: 'https://example.com' }], null)

    expect(result).toEqual({ imported: 0, skipped: 0, duplicates: 1 })
  })

  it('does not insert when the URL is a duplicate', async () => {
    mockDupCheck.mockResolvedValue({ data: [{ id: 'existing-id' }] })

    await importLinks([{ url: 'https://example.com' }], null)

    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('detects duplicates even when multiple copies already exist in the DB', async () => {
    mockDupCheck.mockResolvedValue({ data: [{ id: 'existing-id' }] })

    const result = await importLinks([{ url: 'https://example.com' }], null)

    expect(result).toEqual({ imported: 0, skipped: 0, duplicates: 1 })
    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('counts duplicates, imported, and skipped correctly in a mixed batch', async () => {
    mockDupCheck
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ id: 'existing-id' }] })

    const result = await importLinks([
      { url: 'https://example.com' },
      { url: 'not-a-url' },
      { url: 'https://github.com' },
    ], null)

    expect(result).toEqual({ imported: 1, skipped: 1, duplicates: 1 })
  })
})

// ── toggleLinkFavorite ────────────────────────────────────────────────────────

describe('toggleLinkFavorite', () => {
  it('returns true when the update succeeds', async () => {
    const result = await toggleLinkFavorite('1', true)

    expect(result).toBe(true)
  })

  it('returns false when the update fails', async () => {
    mockFavoriteToggleEq.mockResolvedValue({ error: { message: 'update failed' } })

    const result = await toggleLinkFavorite('1', true)

    expect(result).toBe(false)
  })

  it('calls update with the correct is_favorite value', async () => {
    await toggleLinkFavorite('1', true)

    expect(mockLinksUpdate).toHaveBeenCalledWith({ is_favorite: true })
  })

  it('targets the correct link id', async () => {
    await toggleLinkFavorite('42', false)

    expect(mockFavoriteToggleEq).toHaveBeenCalledWith('id', '42')
  })
})
