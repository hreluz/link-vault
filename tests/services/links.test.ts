import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest'
import {
  getLinks, getLinksByIds, createLink, updateLink, toggleLinkFavorite, deleteLink, importLinks,
  getLinksPage, getMatchingLinkIds, SELECT_ALL_MATCHING_CAP, findLinkIdByUrl,
  type LinkFilterParams, type LinkContent,
} from '@/lib/services/links'
import { generateDek, encryptJson, decryptJson } from '@/lib/crypto/vault'

// ── shared mocks ──────────────────────────────────────────────────────────────

const {
  // getLinks / getLinksByIds chain: from('links').select('*, link_tags(tag_id)')...
  mockLinksContentSelect, mockGetLinksIs, mockOrder, mockReturns,
  mockInIds, mockInReturns,
  // auth
  mockGetUser,
  // createLink – links insert chain: from('links').insert().select().single()
  mockLinksInsert, mockLinksSingle,
  // updateLink – links update chain: from('links').update().eq().select().single()
  mockLinksUpdate, mockLinksUpdateEq, mockLinksUpdateSingle,
  // toggleLinkFavorite – from('links').update().eq()
  mockFavoriteToggleEq,
  // deleteLink – from('links').update({ deleted_at }).eq('id', id).eq('is_favorite', false).select('id')
  mockLinksDeleteEq, mockLinksDeleteEq2, mockLinksDeleteSelect,
  // tags select (getTags, used internally by syncTagsByName)
  mockTagsGetAll,
  // tags insert (syncTagsByName creating a missing tag): insert().select('id').single()
  mockTagsInsert,
  mockTagsInsertSingle,
  // link_tags insert: from('link_tags').insert()
  mockLinkTagsInsert,
  // link_tags delete chain: from('link_tags').delete().eq()
  mockLinkTagsDelete, mockLinkTagsDeleteEq,
  // importLinks duplicate check: from('links').select('id').eq().eq().is().limit()
  mockDupCheck, mockDupCheckEqFingerprint, mockDupCheckEqUser,
  // getLinksPage / getMatchingLinkIds: rpc('search_links' | 'search_link_ids', args).returns()
  mockRpc, mockRpcReturns,
} = vi.hoisted(() => {
  const mockReturns = vi.fn()
  const mockOrder = vi.fn(() => ({ returns: mockReturns }))
  const mockGetLinksIs = vi.fn(() => ({ order: mockOrder }))
  const mockInReturns = vi.fn()
  const mockInIds = vi.fn(() => ({ returns: mockInReturns }))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept only to accept the real `.select(arg)` call shape
  const mockLinksContentSelect = vi.fn((_arg?: string) => ({ is: mockGetLinksIs, in: mockInIds }))

  const mockGetUser = vi.fn()

  const mockLinksSingle = vi.fn()
  const mockLinksSelectAfterInsert = vi.fn(() => ({ single: mockLinksSingle }))
  const mockLinksInsert = vi.fn(() => ({ select: mockLinksSelectAfterInsert }))

  const mockLinksUpdateSingle = vi.fn()
  const mockLinksUpdateSelect = vi.fn(() => ({ single: mockLinksUpdateSingle }))
  const mockLinksUpdateEq = vi.fn(() => ({ select: mockLinksUpdateSelect }))
  const mockFavoriteToggleEq = vi.fn()
  const mockLinksDeleteSelect = vi.fn()
  const mockLinksDeleteEq2 = vi.fn(() => ({ select: mockLinksDeleteSelect }))
  const mockLinksDeleteEq = vi.fn(() => ({ eq: mockLinksDeleteEq2 }))
  const mockLinksUpdate = vi.fn((args: Record<string, unknown>) => {
    if (args && 'is_favorite' in args) return { eq: mockFavoriteToggleEq }
    if (args && 'deleted_at' in args) return { eq: mockLinksDeleteEq }
    return { eq: mockLinksUpdateEq }
  })

  const mockTagsGetAll = vi.fn()
  const mockTagsInsertSingle = vi.fn()
  const mockTagsInsertSelect = vi.fn(() => ({ single: mockTagsInsertSingle }))
  const mockTagsInsert = vi.fn(() => ({ select: mockTagsInsertSelect }))

  const mockLinkTagsInsert = vi.fn()
  const mockLinkTagsDeleteEq = vi.fn()
  const mockLinkTagsDelete = vi.fn(() => ({ eq: mockLinkTagsDeleteEq }))

  const mockDupCheck = vi.fn()
  const mockDupCheckIs = vi.fn(() => ({ limit: mockDupCheck }))
  const mockDupCheckEqFingerprint = vi.fn(() => ({ is: mockDupCheckIs }))
  const mockDupCheckEqUser = vi.fn(() => ({ eq: mockDupCheckEqFingerprint }))

  const mockRpcReturns = vi.fn()
  const mockRpc = vi.fn(() => ({ returns: mockRpcReturns }))

  return {
    mockLinksContentSelect, mockGetLinksIs, mockOrder, mockReturns, mockInIds, mockInReturns,
    mockGetUser,
    mockLinksInsert, mockLinksSingle,
    mockLinksUpdate, mockLinksUpdateEq, mockLinksUpdateSingle,
    mockFavoriteToggleEq,
    mockLinksDeleteEq, mockLinksDeleteEq2, mockLinksDeleteSelect,
    mockTagsGetAll, mockTagsInsertSingle, mockTagsInsert: mockTagsInsert,
    mockLinkTagsInsert, mockLinkTagsDelete, mockLinkTagsDeleteEq,
    mockDupCheck, mockDupCheckEqFingerprint, mockDupCheckEqUser,
    mockRpc, mockRpcReturns,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'links') return {
        select: (arg: string) => arg === 'id' ? { eq: mockDupCheckEqUser } : mockLinksContentSelect(arg),
        insert: mockLinksInsert,
        update: mockLinksUpdate,
      }
      if (table === 'tags') return { select: vi.fn(() => mockTagsGetAll()), insert: mockTagsInsert }
      if (table === 'link_tags') return { insert: mockLinkTagsInsert, delete: mockLinkTagsDelete }
      return {}
    }),
    rpc: mockRpc,
  })),
}))

let dek: CryptoKey

beforeAll(async () => {
  dek = await generateDek()
})

const CONTENT: LinkContent = {
  url: 'https://example.com', title: 'Example', description: 'A description',
  site_name: 'example.com', image_url: null, duration: null, notes: null,
}

async function encryptLinkRow(id: string, content: LinkContent = CONTENT, overrides: Record<string, unknown> = {}) {
  const { ciphertext, iv } = await encryptJson(content, dek)
  return {
    id, user_id: 'user-1', category_id: 'cat-1', status: 'unread', is_favorite: false,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
    enc_payload: ciphertext, enc_iv: iv, url_fingerprint: 'fp',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockFavoriteToggleEq.mockResolvedValue({ error: null })
  mockTagsGetAll.mockResolvedValue({ data: [], error: null })
  mockLinkTagsInsert.mockResolvedValue({ error: null })
  mockLinkTagsDeleteEq.mockResolvedValue({ error: null })
  mockDupCheck.mockResolvedValue({ data: [] })
  mockRpcReturns.mockResolvedValue({ data: [], error: null })
})

const BASE_FILTER_PARAMS: LinkFilterParams = {
  textSearch: '', categoryId: null, statuses: [], tagIds: [], tagMode: 'any',
  favoritesOnly: false, sortBy: 'newest', unlockedTagIds: [],
}

// ── getLinks ──────────────────────────────────────────────────────────────────

describe('getLinks', () => {
  it('decrypts and returns links with tag ids', async () => {
    const row = await encryptLinkRow('1')
    mockReturns.mockResolvedValue({
      data: [{ ...row, link_tags: [{ tag_id: 't1' }, { tag_id: 't2' }] }],
      error: null,
    })

    const result = await getLinks(dek)

    expect(result).toHaveLength(1)
    expect(result[0].tags).toEqual(['t1', 't2'])
    expect(result[0].title).toBe('Example')
  })

  it('omits link_tags from the returned objects', async () => {
    const row = await encryptLinkRow('1')
    mockReturns.mockResolvedValue({ data: [{ ...row, link_tags: [{ tag_id: 't1' }] }], error: null })

    const result = await getLinks(dek)

    expect(result[0]).not.toHaveProperty('link_tags')
  })

  it('returns an empty tags array when link has no tags', async () => {
    const row = await encryptLinkRow('1')
    mockReturns.mockResolvedValue({ data: [{ ...row, link_tags: [] }], error: null })

    const result = await getLinks(dek)

    expect(result[0].tags).toEqual([])
  })

  it('returns [] on error', async () => {
    mockReturns.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getLinks(dek)).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockReturns.mockResolvedValue({ data: null, error: null })

    expect(await getLinks(dek)).toEqual([])
  })

  it('queries with descending created_at order', async () => {
    mockReturns.mockResolvedValue({ data: [], error: null })

    await getLinks(dek)

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('selects link_tags with tag ids, not names', async () => {
    mockReturns.mockResolvedValue({ data: [], error: null })

    await getLinks(dek)

    expect(mockLinksContentSelect).toHaveBeenCalledWith('*, link_tags(tag_id)')
  })

  it('excludes soft-deleted links', async () => {
    mockReturns.mockResolvedValue({ data: [], error: null })

    await getLinks(dek)

    expect(mockGetLinksIs).toHaveBeenCalledWith('deleted_at', null)
  })
})

// ── getLinksByIds ─────────────────────────────────────────────────────────────

describe('getLinksByIds', () => {
  it('returns [] without querying when given no ids', async () => {
    expect(await getLinksByIds([], dek)).toEqual([])
    expect(mockLinksContentSelect).not.toHaveBeenCalled()
  })

  it('fetches and decrypts the requested links', async () => {
    const row = await encryptLinkRow('1')
    mockInReturns.mockResolvedValue({ data: [{ ...row, link_tags: [{ tag_id: 't1' }] }], error: null })

    const result = await getLinksByIds(['1'], dek)

    expect(result[0].title).toBe('Example')
    expect(result[0].tags).toEqual(['t1'])
    expect(mockInIds).toHaveBeenCalledWith('id', ['1'])
  })
})

// ── createLink ────────────────────────────────────────────────────────────────

describe('createLink', () => {
  beforeEach(() => {
    mockLinksSingle.mockResolvedValue({ data: null, error: null })
  })

  it('returns null when url is empty', async () => {
    const result = await createLink({ url: '  ', category_id: 'cat-1', status: 'unread', tags: [] }, dek)

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when url is not a valid URL', async () => {
    const result = await createLink({ url: 'not-a-url', category_id: 'cat-1', status: 'unread', tags: [] }, dek)

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when category_id is empty', async () => {
    const result = await createLink({ url: 'https://x.com', category_id: '', status: 'unread', tags: [] }, dek)

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: [] }, dek)

    expect(result).toBeNull()
  })

  it('returns null when the link insert fails', async () => {
    mockLinksSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: [] }, dek)

    expect(result).toBeNull()
  })

  it('defaults to "no-tag" when no tags are provided', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })
    mockTagsInsertSingle.mockResolvedValue({ data: { id: 'no-tag-id' }, error: null })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: [] }, dek)

    expect(result?.tags).toEqual(['no-tag-id'])
  })

  it('returns the link with resolved tag ids', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })
    const reactRow = { id: 't1', user_id: 'user-1', is_private: false, created_at: '', link_tags: [] }
    const { ciphertext, iv } = await encryptJson({ name: 'react', color: null }, dek)
    mockTagsGetAll.mockResolvedValue({ data: [{ ...reactRow, enc_payload: ciphertext, enc_iv: iv }], error: null })
    mockTagsInsertSingle.mockResolvedValue({ data: { id: 't2' }, error: null })

    const result = await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: ['react', 'css'] }, dek)

    expect(result?.tags).toEqual(['t1', 't2'])
  })

  it('inserts the link with an encrypted payload and a url fingerprint', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await createLink({ url: 'https://x.com', title: 'My Link', category_id: 'cat-1', status: 'watching', notes: 'note', tags: [] }, dek)

    const call = mockLinksInsert.mock.calls[0][0]
    expect(call.user_id).toBe('user-1')
    expect(call.category_id).toBe('cat-1')
    expect(call.status).toBe('watching')
    expect(call.url_fingerprint).toBeTypeOf('string')
    const decrypted = await decryptJson<LinkContent>(call.enc_payload, call.enc_iv, dek)
    expect(decrypted).toEqual(expect.objectContaining({ url: 'https://x.com', title: 'My Link', site_name: 'x.com', notes: 'note' }))
  })

  it('derives site_name from the URL hostname', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await createLink({ url: 'https://www.youtube.com/watch?v=abc', category_id: 'cat-1', status: 'unread', tags: [] }, dek)

    const call = mockLinksInsert.mock.calls[0][0]
    const decrypted = await decryptJson<LinkContent>(call.enc_payload, call.enc_iv, dek)
    expect(decrypted.site_name).toBe('www.youtube.com')
  })

  it('inserts link_tag rows for each resolved tag', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })
    mockTagsInsertSingle
      .mockResolvedValueOnce({ data: { id: 't1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 't2' }, error: null })

    await createLink({ url: 'https://x.com', category_id: 'cat-1', status: 'unread', tags: ['react', 'css'] }, dek)

    expect(mockLinkTagsInsert).toHaveBeenCalledWith([
      { link_id: '1', tag_id: 't1' },
      { link_id: '1', tag_id: 't2' },
    ])
  })
})

// ── updateLink ────────────────────────────────────────────────────────────────

describe('updateLink', () => {
  const INPUT = { id: '1', url: 'https://example.com', category_id: 'cat-1', status: 'unread' as const, tags: [] }

  beforeEach(() => {
    mockTagsInsertSingle.mockResolvedValue({ data: { id: 'no-tag-id' }, error: null })
  })

  it('returns null when url is empty', async () => {
    const result = await updateLink({ ...INPUT, url: '   ' }, dek)

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when url is not a valid URL', async () => {
    const result = await updateLink({ ...INPUT, url: 'not-a-url' }, dek)

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when category_id is empty', async () => {
    const result = await updateLink({ ...INPUT, category_id: '' }, dek)

    expect(result).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await updateLink(INPUT, dek)).toBeNull()
  })

  it('returns null when the link update fails', async () => {
    mockLinksUpdateSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })

    expect(await updateLink(INPUT, dek)).toBeNull()
  })

  it('returns the link with resolved tag ids', async () => {
    const row = await encryptLinkRow('1')
    mockLinksUpdateSingle.mockResolvedValue({ data: row, error: null })
    mockTagsInsertSingle
      .mockResolvedValueOnce({ data: { id: 't1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 't2' }, error: null })

    const result = await updateLink({ ...INPUT, tags: ['react', 'css'] }, dek)

    expect(result?.tags).toEqual(['t1', 't2'])
  })

  it('updates the link with an encrypted payload', async () => {
    const row = await encryptLinkRow('1')
    mockLinksUpdateSingle.mockResolvedValue({ data: row, error: null })

    await updateLink({ ...INPUT, url: 'https://new.com', title: 'New Title', status: 'read', notes: 'a note' }, dek)

    const call = mockLinksUpdate.mock.calls[0][0]
    expect(call.status).toBe('read')
    const decrypted = await decryptJson<LinkContent>(call.enc_payload as string, call.enc_iv as string, dek)
    expect(decrypted).toEqual(expect.objectContaining({ url: 'https://new.com', title: 'New Title', notes: 'a note' }))
  })

  it('targets the correct link id', async () => {
    const row = await encryptLinkRow('1')
    mockLinksUpdateSingle.mockResolvedValue({ data: row, error: null })

    await updateLink(INPUT, dek)

    expect(mockLinksUpdateEq).toHaveBeenCalledWith('id', '1')
  })

  it('deletes existing link_tags before reinserting', async () => {
    const row = await encryptLinkRow('1')
    mockLinksUpdateSingle.mockResolvedValue({ data: row, error: null })
    mockTagsInsertSingle.mockResolvedValue({ data: { id: 't1' }, error: null })

    await updateLink({ ...INPUT, tags: ['react'] }, dek)

    expect(mockLinkTagsDelete).toHaveBeenCalled()
    expect(mockLinkTagsDeleteEq).toHaveBeenCalledWith('link_id', '1')
    expect(mockLinkTagsInsert).toHaveBeenCalled()
  })

  it('deletes existing link_tags even when new tags list is empty', async () => {
    const row = await encryptLinkRow('1')
    mockLinksUpdateSingle.mockResolvedValue({ data: row, error: null })

    await updateLink(INPUT, dek)

    expect(mockLinkTagsDelete).toHaveBeenCalled()
    expect(mockLinkTagsDeleteEq).toHaveBeenCalledWith('link_id', '1')
  })
})

// ── deleteLink ────────────────────────────────────────────────────────────────

describe('deleteLink', () => {
  it('returns "deleted" when the soft-delete succeeds', async () => {
    mockLinksDeleteSelect.mockResolvedValue({ data: [{ id: 'link-1' }], error: null })

    expect(await deleteLink('link-1')).toBe('deleted')
  })

  it('returns "blocked" when the link is favorited (no rows updated)', async () => {
    mockLinksDeleteSelect.mockResolvedValue({ data: [], error: null })

    expect(await deleteLink('link-1')).toBe('blocked')
  })

  it('returns "error" on DB error', async () => {
    mockLinksDeleteSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await deleteLink('link-1')).toBe('error')
  })

  it('targets the correct link id and excludes favorited links', async () => {
    mockLinksDeleteSelect.mockResolvedValue({ data: [{ id: 'link-42' }], error: null })

    await deleteLink('link-42')

    expect(mockLinksDeleteEq).toHaveBeenCalledWith('id', 'link-42')
    expect(mockLinksDeleteEq2).toHaveBeenCalledWith('is_favorite', false)
  })

  it('sets deleted_at to a non-null ISO timestamp', async () => {
    mockLinksDeleteSelect.mockResolvedValue({ data: [{ id: 'link-1' }], error: null })

    await deleteLink('link-1')

    expect(mockLinksUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) }),
    )
  })
})

// ── importLinks ───────────────────────────────────────────────────────────────

// ── findLinkIdByUrl ───────────────────────────────────────────────────────────

describe('findLinkIdByUrl', () => {
  it('returns null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await findLinkIdByUrl('https://example.com', dek)

    expect(result).toBeNull()
  })

  it('returns the id of the matching link', async () => {
    mockDupCheck.mockResolvedValue({ data: [{ id: 'existing-id' }] })

    const result = await findLinkIdByUrl('https://example.com', dek)

    expect(result).toBe('existing-id')
  })

  it('returns null when no link matches', async () => {
    mockDupCheck.mockResolvedValue({ data: [] })

    const result = await findLinkIdByUrl('https://example.com', dek)

    expect(result).toBeNull()
  })

  it('looks up by url_fingerprint, not the raw url', async () => {
    mockDupCheck.mockResolvedValue({ data: [] })

    await findLinkIdByUrl('https://example.com', dek)

    expect(mockDupCheckEqFingerprint).toHaveBeenCalledWith('url_fingerprint', expect.any(String))
  })
})

describe('importLinks', () => {
  beforeEach(() => {
    mockTagsInsertSingle.mockResolvedValue({ data: { id: 'no-tag-id' }, error: null })
  })

  it('returns { imported: 0, skipped: n, duplicates: 0 } when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(result).toEqual({
      imported: 0, skipped: 1, duplicates: 0, cancelled: false, notProcessed: [],
      failures: [{ url: 'https://example.com', reason: 'save_error' }],
    })
  })

  it('returns { imported: 0, skipped: 0, duplicates: 0 } for an empty inputs array', async () => {
    const result = await importLinks([], null, dek)

    expect(result).toEqual({ imported: 0, skipped: 0, duplicates: 0, failures: [], cancelled: false, notProcessed: [] })
    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('skips an invalid URL and increments skipped', async () => {
    const result = await importLinks([{ url: 'not-a-url' }], null, dek)

    expect(result).toEqual({
      imported: 0, skipped: 1, duplicates: 0, cancelled: false, notProcessed: [],
      failures: [{ url: 'not-a-url', reason: 'invalid_url' }],
    })
    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('skips a blank URL and increments skipped', async () => {
    const result = await importLinks([{ url: '   ' }], null, dek)

    expect(result).toEqual({
      imported: 0, skipped: 1, duplicates: 0, cancelled: false, notProcessed: [],
      failures: [{ url: '   ', reason: 'invalid_url' }],
    })
    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('imports a single valid URL', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    const result = await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(result).toEqual({ imported: 1, skipped: 0, duplicates: 0, failures: [], cancelled: false, notProcessed: [] })
  })

  it('always inserts with status unread', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unread' }),
    )
  })

  it('uses defaultCategoryId when input has no category_id', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com' }], 'cat-default', dek)

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'cat-default' }),
    )
  })

  it('uses input category_id over the default', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com', category_id: 'cat-override' }], 'cat-default', dek)

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'cat-override' }),
    )
  })

  it('passes null category_id when neither input nor default is set', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(mockLinksInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: null }),
    )
  })

  it('extracts site_name from the URL hostname', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://www.youtube.com/watch?v=xyz' }], null, dek)

    const call = mockLinksInsert.mock.calls[0][0]
    const decrypted = await decryptJson<LinkContent>(call.enc_payload, call.enc_iv, dek)
    expect(decrypted.site_name).toBe('www.youtube.com')
  })

  it('increments skipped when the DB insert fails', async () => {
    mockLinksSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const result = await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(result).toEqual({
      imported: 0, skipped: 1, duplicates: 0, cancelled: false, notProcessed: [],
      failures: [{ url: 'https://example.com', reason: 'save_error' }],
    })
  })

  it('imports multiple valid links', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    const result = await importLinks([
      { url: 'https://example.com' },
      { url: 'https://github.com' },
      { url: 'https://youtube.com' },
    ], null, dek)

    expect(result).toEqual({ imported: 3, skipped: 0, duplicates: 0, failures: [], cancelled: false, notProcessed: [] })
    expect(mockLinksInsert).toHaveBeenCalledTimes(3)
  })

  it('counts imported and skipped correctly in a mixed batch', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'failed' } })

    const result = await importLinks([
      { url: 'https://example.com' },
      { url: 'not-a-url' },
      { url: 'https://github.com' },
    ], null, dek)

    expect(result).toEqual({
      imported: 1, skipped: 2, duplicates: 0, cancelled: false, notProcessed: [],
      failures: [
        { url: 'not-a-url', reason: 'invalid_url' },
        { url: 'https://github.com', reason: 'save_error' },
      ],
    })
  })

  it('increments duplicates when the URL fingerprint already exists', async () => {
    mockDupCheck.mockResolvedValue({ data: [{ id: 'existing-id' }] })

    const result = await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(result).toEqual({ imported: 0, skipped: 0, duplicates: 1, failures: [], cancelled: false, notProcessed: [] })
  })

  it('does not insert when the URL is a duplicate', async () => {
    mockDupCheck.mockResolvedValue({ data: [{ id: 'existing-id' }] })

    await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(mockLinksInsert).not.toHaveBeenCalled()
  })

  it('checks for duplicates by url_fingerprint, not raw url', async () => {
    mockDupCheck.mockResolvedValue({ data: [] })
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(mockDupCheckEqFingerprint).toHaveBeenCalledWith('url_fingerprint', expect.any(String))
  })

  it('preserves description, site_name, image_url, and duration when given', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{
      url: 'https://example.com', description: 'A desc', site_name: 'custom.example', image_url: 'https://img/x.png', duration: '4:33',
    }], null, dek)

    const call = mockLinksInsert.mock.calls[0][0]
    const decrypted = await decryptJson<LinkContent>(call.enc_payload, call.enc_iv, dek)
    expect(decrypted).toEqual(expect.objectContaining({
      description: 'A desc', site_name: 'custom.example', image_url: 'https://img/x.png', duration: '4:33',
    }))
  })

  it('preserves the given status instead of always defaulting to unread', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com', status: 'read' }], null, dek)

    expect(mockLinksInsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'read' }))
  })

  it('preserves is_favorite when given, defaulting to false otherwise', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://a.com', is_favorite: true }, { url: 'https://b.com' }], null, dek)

    expect(mockLinksInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ is_favorite: true }))
    expect(mockLinksInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({ is_favorite: false }))
  })

  it('passes created_at through when given, for a full-vault restore', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com', created_at: '2020-05-01T00:00:00Z' }], null, dek)

    expect(mockLinksInsert).toHaveBeenCalledWith(expect.objectContaining({ created_at: '2020-05-01T00:00:00Z' }))
  })

  it('omits created_at from the insert payload when not given, keeping the DB default', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(mockLinksInsert.mock.calls[0][0]).not.toHaveProperty('created_at')
  })

  it('passes updated_at through when given, for a full-vault restore', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com', updated_at: '2020-05-02T00:00:00Z' }], null, dek)

    expect(mockLinksInsert).toHaveBeenCalledWith(expect.objectContaining({ updated_at: '2020-05-02T00:00:00Z' }))
  })

  it('omits updated_at from the insert payload when not given, keeping the DB default', async () => {
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    await importLinks([{ url: 'https://example.com' }], null, dek)

    expect(mockLinksInsert.mock.calls[0][0]).not.toHaveProperty('updated_at')
  })

  it('counts duplicates, imported, and skipped correctly in a mixed batch', async () => {
    mockDupCheck
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ id: 'existing-id' }] })
    const row = await encryptLinkRow('1')
    mockLinksSingle.mockResolvedValue({ data: row, error: null })

    const result = await importLinks([
      { url: 'https://example.com' },
      { url: 'not-a-url' },
      { url: 'https://github.com' },
    ], null, dek)

    expect(result).toEqual({
      imported: 1, skipped: 1, duplicates: 1, cancelled: false, notProcessed: [],
      failures: [{ url: 'not-a-url', reason: 'invalid_url' }],
    })
  })

  describe('onProgress', () => {
    it('calls onProgress once per input with the running done/total, regardless of outcome', async () => {
      mockDupCheck
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ id: 'existing-id' }] })
      const row = await encryptLinkRow('1')
      mockLinksSingle.mockResolvedValue({ data: row, error: null })
      const onProgress = vi.fn()

      await importLinks([
        { url: 'https://example.com' },
        { url: 'not-a-url' },
        { url: 'https://github.com' },
      ], null, dek, { onProgress })

      expect(onProgress).toHaveBeenCalledTimes(3)
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3, expect.anything())
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3, expect.anything())
      expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3, expect.anything())
    })

    it('reaches done === total even when every input is skipped', async () => {
      const onProgress = vi.fn()

      await importLinks([{ url: 'not-a-url' }, { url: 'also not a url' }], null, dek, { onProgress })

      expect(onProgress).toHaveBeenCalledTimes(2)
      expect(onProgress).toHaveBeenLastCalledWith(2, 2, expect.anything())
    })

    it('does not throw when onProgress is omitted', async () => {
      const row = await encryptLinkRow('1')
      mockLinksSingle.mockResolvedValue({ data: row, error: null })

      await expect(importLinks([{ url: 'https://example.com' }], null, dek))
        .resolves.toEqual({ imported: 1, skipped: 0, duplicates: 0, failures: [], cancelled: false, notProcessed: [] })
    })
  })

  describe('row outcomes', () => {
    it('reports each row outcome as the third onProgress argument', async () => {
      mockDupCheck
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ id: 'existing-id' }] })
        .mockResolvedValueOnce({ data: [] })
      const row = await encryptLinkRow('1')
      mockLinksSingle
        .mockResolvedValueOnce({ data: row, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'failed' } })
      const onProgress = vi.fn()

      await importLinks([
        { url: 'https://example.com' },
        { url: 'not-a-url' },
        { url: 'https://dup.com' },
        { url: 'https://github.com' },
      ], null, dek, { onProgress })

      expect(onProgress.mock.calls.map(call => call[2])).toEqual([
        { url: 'https://example.com', status: 'imported', metaMissing: false },
        { url: 'not-a-url', status: 'failed', reason: 'invalid_url' },
        { url: 'https://dup.com', status: 'duplicate' },
        { url: 'https://github.com', status: 'failed', reason: 'save_error' },
      ])
    })

    it('reports metaMissing on the imported outcome when the fetch comes back empty', async () => {
      mockLinksSingle.mockResolvedValue({ data: await encryptLinkRow('1'), error: null })
      const fetchMeta = vi.fn().mockResolvedValue({ title: null, description: null, image: null, duration: null })
      const onProgress = vi.fn()

      await importLinks([{ url: 'https://example.com' }], null, dek, { onProgress, fetchMeta })

      expect(onProgress).toHaveBeenCalledWith(1, 1, { url: 'https://example.com', status: 'imported', metaMissing: true })
    })

    it('lists only failed rows in failures, never duplicates or imported ones', async () => {
      mockDupCheck
        .mockResolvedValueOnce({ data: [{ id: 'existing-id' }] })
        .mockResolvedValueOnce({ data: [] })
      mockLinksSingle.mockResolvedValue({ data: await encryptLinkRow('1'), error: null })

      const result = await importLinks([
        { url: 'https://dup.com' },
        { url: 'bad url' },
        { url: 'https://example.com' },
      ], null, dek)

      expect(result.failures).toEqual([{ url: 'bad url', reason: 'invalid_url' }])
      expect(result.skipped).toBe(result.failures.length)
    })
  })

  describe('fetchMeta', () => {
    const FULL_META = {
      title: 'Fetched title', description: 'Fetched desc', image: 'https://img/fetched.png', duration: '4:33',
    }

    async function insertedContent(n = 1) {
      const call = mockLinksInsert.mock.calls[n - 1][0]
      return decryptJson<LinkContent>(call.enc_payload, call.enc_iv, dek)
    }

    beforeEach(async () => {
      mockLinksSingle.mockResolvedValue({ data: await encryptLinkRow('1'), error: null })
    })

    it('fills empty fields from the fetched metadata', async () => {
      const fetchMeta = vi.fn().mockResolvedValue(FULL_META)

      await importLinks([{ url: 'https://example.com' }], null, dek, { fetchMeta })

      expect(fetchMeta).toHaveBeenCalledWith('https://example.com')
      expect(await insertedContent()).toEqual(expect.objectContaining({
        title: 'Fetched title', description: 'Fetched desc', image_url: 'https://img/fetched.png', duration: '4:33',
      }))
    })

    it('does not overwrite a provided title, but fills an empty image_url', async () => {
      const fetchMeta = vi.fn().mockResolvedValue(FULL_META)

      await importLinks([{ url: 'https://example.com', title: 'My title', image_url: '' }], null, dek, { fetchMeta })

      const content = await insertedContent()
      expect(content.title).toBe('My title')
      expect(content.image_url).toBe('https://img/fetched.png')
    })

    it('is not called for invalid URLs', async () => {
      const fetchMeta = vi.fn().mockResolvedValue(FULL_META)

      await importLinks([{ url: 'not-a-url' }], null, dek, { fetchMeta })

      expect(fetchMeta).not.toHaveBeenCalled()
    })

    it('is not called for duplicates', async () => {
      mockDupCheck.mockResolvedValue({ data: [{ id: 'existing-id' }] })
      const fetchMeta = vi.fn().mockResolvedValue(FULL_META)

      const result = await importLinks([{ url: 'https://example.com' }], null, dek, { fetchMeta })

      expect(fetchMeta).not.toHaveBeenCalled()
      expect(result).toEqual({ imported: 0, skipped: 0, duplicates: 1, metaMissing: 0, failures: [], cancelled: false, notProcessed: [] })
    })

    it('is not called when title, description, image_url and duration are all set', async () => {
      const fetchMeta = vi.fn().mockResolvedValue(FULL_META)

      await importLinks([{
        url: 'https://example.com', title: 'T', description: 'D', image_url: 'https://img/x.png', duration: '1:00',
      }], null, dek, { fetchMeta })

      expect(fetchMeta).not.toHaveBeenCalled()
    })

    it('still imports the link and counts metaMissing when the fetcher throws', async () => {
      const fetchMeta = vi.fn().mockRejectedValue(new Error('network'))

      const result = await importLinks([{ url: 'https://example.com', title: 'Kept' }], null, dek, { fetchMeta })

      expect(result).toEqual({ imported: 1, skipped: 0, duplicates: 0, metaMissing: 1, failures: [], cancelled: false, notProcessed: [] })
      expect((await insertedContent()).title).toBe('Kept')
    })

    it('counts metaMissing when the fetcher returns all-null metadata', async () => {
      const fetchMeta = vi.fn().mockResolvedValue({ title: null, description: null, image: null, duration: null })

      const result = await importLinks([{ url: 'https://example.com' }], null, dek, { fetchMeta })

      expect(result).toEqual({ imported: 1, skipped: 0, duplicates: 0, metaMissing: 1, failures: [], cancelled: false, notProcessed: [] })
    })

    it('fetches one link at a time', async () => {
      let inFlight = 0
      let maxInFlight = 0
      const fetchMeta = vi.fn(async () => {
        maxInFlight = Math.max(maxInFlight, ++inFlight)
        await new Promise(resolve => setTimeout(resolve, 1))
        inFlight--
        return FULL_META
      })

      await importLinks([{ url: 'https://a.com' }, { url: 'https://b.com' }, { url: 'https://c.com' }], null, dek, { fetchMeta })

      expect(fetchMeta).toHaveBeenCalledTimes(3)
      expect(maxInFlight).toBe(1)
    })

    it('omits metaMissing from the result when no fetcher is given', async () => {
      const result = await importLinks([{ url: 'https://example.com' }], null, dek)

      expect(result).not.toHaveProperty('metaMissing')
    })
  })

  describe('signal', () => {
    const FIVE = ['https://a.com', 'https://b.com', 'https://c.com', 'https://d.com', 'https://e.com']

    beforeEach(async () => {
      mockLinksSingle.mockResolvedValue({ data: await encryptLinkRow('1'), error: null })
    })

    it('imports nothing and lists every URL as not processed when aborted before the call', async () => {
      const controller = new AbortController()
      controller.abort()

      const result = await importLinks(FIVE.map(url => ({ url: ` ${url} ` })), null, dek, { signal: controller.signal })

      expect(mockLinksInsert).not.toHaveBeenCalled()
      expect(result).toMatchObject({ imported: 0, cancelled: true, notProcessed: FIVE })
    })

    it('stops before the next row when aborted inside onProgress after row 2 of 5', async () => {
      const controller = new AbortController()
      const onProgress = vi.fn((done: number) => { if (done === 2) controller.abort() })

      const result = await importLinks(FIVE.map(url => ({ url })), null, dek, { onProgress, signal: controller.signal })

      expect(mockLinksInsert).toHaveBeenCalledTimes(2)
      expect(onProgress).toHaveBeenCalledTimes(2)
      expect(result).toMatchObject({ imported: 2, cancelled: true, notProcessed: FIVE.slice(2) })
    })

    it('still completes and counts the row that is mid-fetch when the abort fires', async () => {
      const controller = new AbortController()
      const fetchMeta = vi.fn(async () => {
        controller.abort()
        return { title: 'T', description: null, image: null, duration: null }
      })

      const result = await importLinks(FIVE.map(url => ({ url })), null, dek, { fetchMeta, signal: controller.signal })

      expect(fetchMeta).toHaveBeenCalledTimes(1)
      expect(mockLinksInsert).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({ imported: 1, cancelled: true, notProcessed: FIVE.slice(1) })
    })

    it('returns cancelled: false and an empty notProcessed without a signal', async () => {
      const result = await importLinks(FIVE.map(url => ({ url })), null, dek)

      expect(result).toMatchObject({ imported: 5, cancelled: false, notProcessed: [] })
    })
  })

  describe('host guard (throttle + breaker)', () => {
    const META = { title: 'T', description: null, image: null, duration: null }
    const EMPTY_META = { title: null, description: null, image: null, duration: null }
    const RATE_LIMITED = { ...EMPTY_META, rateLimited: true }

    beforeEach(async () => {
      // setImmediate stays real so WebCrypto work can settle between fake-timer advances.
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      mockLinksSingle.mockResolvedValue({ data: await encryptLinkRow('1'), error: null })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    /** Drives the import to completion. Fake time only jumps when a timer is pending (a
     *  throttle wait), so real WebCrypto work never moves the clock and gaps are exact. */
    async function settle<T>(promise: Promise<T>): Promise<T> {
      let done = false
      void promise.finally(() => { done = true })
      while (!done) {
        if (vi.getTimerCount() > 0) await vi.advanceTimersToNextTimerAsync()
        await new Promise(resolve => setImmediate(resolve))
      }
      return promise
    }

    /** Fetcher answering per URL from `answers` (a list is consumed one call at a time),
     *  recording the fake-clock time of each call. */
    function scriptedFetcher(answers: Record<string, object | object[]>) {
      const calls: { url: string; at: number }[] = []
      const fetchMeta = vi.fn(async (url: string) => {
        calls.push({ url, at: Date.now() })
        const answer = answers[url] ?? META
        return Array.isArray(answer) ? (answer.shift() ?? META) : answer
      })
      return { fetchMeta, calls }
    }

    it('calls onHostBlocked once with rate_limited, attempt 1, on a 429', async () => {
      const { fetchMeta } = scriptedFetcher({ 'https://instagram.com/p/2': RATE_LIMITED })
      const onHostBlocked = vi.fn().mockResolvedValue('skip_host')

      await settle(importLinks(
        [{ url: 'https://instagram.com/p/1' }, { url: 'https://instagram.com/p/2' }],
        null, dek, { fetchMeta, onHostBlocked },
      ))

      expect(onHostBlocked).toHaveBeenCalledTimes(1)
      expect(onHostBlocked).toHaveBeenCalledWith({ host: 'instagram.com', reason: 'rate_limited', attempt: 1 })
    })

    it("'skip_host' imports that group's later rows without fetching, and keeps fetching other hosts", async () => {
      const { fetchMeta, calls } = scriptedFetcher({ 'https://instagram.com/p/2': RATE_LIMITED })
      const onHostBlocked = vi.fn().mockResolvedValue('skip_host')

      const result = await settle(importLinks([
        { url: 'https://instagram.com/p/1' },
        { url: 'https://instagram.com/p/2' },
        { url: 'https://instagram.com/p/3' },
        { url: 'https://youtu.be/abc' },
      ], null, dek, { fetchMeta, onHostBlocked }))

      expect(calls.map(c => c.url)).toEqual(['https://instagram.com/p/1', 'https://instagram.com/p/2', 'https://youtu.be/abc'])
      expect(result).toMatchObject({ imported: 4, metaMissing: 2, cancelled: false })
    })

    it("'retry' re-fetches the same row; a second 429 gives attempt 2, and a success continues", async () => {
      const { fetchMeta, calls } = scriptedFetcher({
        'https://instagram.com/p/1': [RATE_LIMITED, RATE_LIMITED, { ...META, title: 'Finally' }],
      })
      const onHostBlocked = vi.fn().mockResolvedValue('retry')

      const result = await settle(importLinks(
        [{ url: 'https://instagram.com/p/1' }, { url: 'https://instagram.com/p/2' }],
        null, dek, { fetchMeta, onHostBlocked },
      ))

      expect(onHostBlocked.mock.calls.map(([info]) => info.attempt)).toEqual([1, 2])
      expect(calls.map(c => c.url)).toEqual([
        'https://instagram.com/p/1', 'https://instagram.com/p/1', 'https://instagram.com/p/1', 'https://instagram.com/p/2',
      ])
      expect(result).toMatchObject({ imported: 2, metaMissing: 0 })
      const first = mockLinksInsert.mock.calls[0][0]
      expect((await decryptJson<LinkContent>(first.enc_payload, first.enc_iv, dek)).title).toBe('Finally')
    })

    it('an empty result on a retry is still blocked', async () => {
      const { fetchMeta } = scriptedFetcher({ 'https://instagram.com/p/1': [RATE_LIMITED, EMPTY_META, META] })
      const onHostBlocked = vi.fn().mockResolvedValue('retry')

      await settle(importLinks([{ url: 'https://instagram.com/p/1' }], null, dek, { fetchMeta, onHostBlocked }))

      expect(onHostBlocked.mock.calls.map(([info]) => [info.reason, info.attempt])).toEqual([
        ['rate_limited', 1], ['empty_responses', 2],
      ])
    })

    it("'cancel' stops with the blocked row and later rows not processed, and inserts nothing for it", async () => {
      const { fetchMeta } = scriptedFetcher({ 'https://b.com/x': RATE_LIMITED })
      const onHostBlocked = vi.fn().mockResolvedValue('cancel')

      const result = await settle(importLinks(
        [{ url: 'https://a.com/x' }, { url: 'https://b.com/x' }, { url: 'https://c.com/x' }],
        null, dek, { fetchMeta, onHostBlocked },
      ))

      expect(mockLinksInsert).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({
        imported: 1, cancelled: true, notProcessed: ['https://b.com/x', 'https://c.com/x'],
      })
    })

    it('3 empty YouTube results in a row trip empty_responses on the 3rd', async () => {
      const urls = ['https://youtu.be/a', 'https://www.youtube.com/watch?v=b', 'https://m.youtube.com/watch?v=c']
      const { fetchMeta } = scriptedFetcher(Object.fromEntries(urls.map(url => [url, EMPTY_META])))
      const onHostBlocked = vi.fn().mockResolvedValue('skip_host')

      await settle(importLinks(urls.map(url => ({ url })), null, dek, { fetchMeta, onHostBlocked }))

      expect(onHostBlocked).toHaveBeenCalledTimes(1)
      expect(onHostBlocked).toHaveBeenCalledWith({ host: 'youtube.com', reason: 'empty_responses', attempt: 1 })
    })

    it('empty results spread across different hosts never trip', async () => {
      const urls = ['https://a.com/x', 'https://b.com/x', 'https://c.com/x', 'https://d.com/x']
      const { fetchMeta } = scriptedFetcher(Object.fromEntries(urls.map(url => [url, EMPTY_META])))
      const onHostBlocked = vi.fn()

      const result = await settle(importLinks(urls.map(url => ({ url })), null, dek, { fetchMeta, onHostBlocked }))

      expect(onHostBlocked).not.toHaveBeenCalled()
      expect(result).toMatchObject({ imported: 4, metaMissing: 4 })
    })

    it('spaces fetches to the same group by at least 2000 ms, and not to different groups', async () => {
      const { fetchMeta, calls } = scriptedFetcher({})

      await settle(importLinks([
        { url: 'https://youtu.be/a' },
        { url: 'https://www.youtube.com/watch?v=b' },
        { url: 'https://blog.example.com/1' },
        { url: 'https://blog.example.com/2' },
        { url: 'https://other.com/1' },
      ], null, dek, { fetchMeta }))

      const at = Object.fromEntries(calls.map(c => [c.url, c.at]))
      expect(at['https://www.youtube.com/watch?v=b'] - at['https://youtu.be/a']).toBeGreaterThanOrEqual(2000)
      expect(at['https://blog.example.com/2'] - at['https://blog.example.com/1']).toBeGreaterThanOrEqual(2000)
      expect(at['https://other.com/1'] - at['https://blog.example.com/2']).toBe(0)
      expect(at['https://blog.example.com/1'] - at['https://www.youtube.com/watch?v=b']).toBe(0)
    })

    it('a cancel during the throttle wait stops at once and leaves that row not processed', async () => {
      const controller = new AbortController()
      const { fetchMeta } = scriptedFetcher({})
      const pending = importLinks(
        [{ url: 'https://a.com/1' }, { url: 'https://a.com/2' }],
        null, dek, { fetchMeta, signal: controller.signal },
      )
      // Let row 1 finish, then abort while row 2 waits out the 2 s gap.
      while (mockLinksInsert.mock.calls.length < 1) await new Promise(resolve => setImmediate(resolve))
      for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve))
      controller.abort()

      const result = await settle(pending)

      expect(fetchMeta).toHaveBeenCalledTimes(1)
      expect(mockLinksInsert).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({ imported: 1, cancelled: true, notProcessed: ['https://a.com/2'] })
    })

    it('uses guardConfig for the gap and the empty-streak limit', async () => {
      const { fetchMeta, calls } = scriptedFetcher({ 'https://instagram.com/p/1': EMPTY_META })
      const onHostBlocked = vi.fn().mockResolvedValue('skip_host')

      await settle(importLinks([
        { url: 'https://instagram.com/p/1' },
        { url: 'https://youtu.be/a' },
        { url: 'https://youtu.be/b' },
      ], null, dek, { fetchMeta, onHostBlocked, guardConfig: { gapMs: 5000, emptyStreakLimit: 1 } }))

      expect(onHostBlocked).toHaveBeenCalledWith({ host: 'instagram.com', reason: 'empty_responses', attempt: 1 })
      const at = Object.fromEntries(calls.map(c => [c.url, c.at]))
      expect(at['https://youtu.be/b'] - at['https://youtu.be/a']).toBeGreaterThanOrEqual(5000)
    })

    it('adds no wait between same-group fetches when the configured gap is 0', async () => {
      const { fetchMeta, calls } = scriptedFetcher({})

      await settle(importLinks(
        [{ url: 'https://a.com/1' }, { url: 'https://a.com/2' }],
        null, dek, { fetchMeta, guardConfig: { gapMs: 0, emptyStreakLimit: 3 } },
      ))

      expect(calls[1].at - calls[0].at).toBe(0)
    })

    it('behaves as skip_host when no onHostBlocked is given', async () => {
      const { fetchMeta, calls } = scriptedFetcher({ 'https://instagram.com/p/1': RATE_LIMITED })

      const result = await settle(importLinks(
        [{ url: 'https://instagram.com/p/1' }, { url: 'https://instagram.com/p/2' }],
        null, dek, { fetchMeta },
      ))

      expect(calls.map(c => c.url)).toEqual(['https://instagram.com/p/1'])
      expect(result).toMatchObject({ imported: 2, metaMissing: 2 })
    })

    describe('onThrottleWait', () => {
      it('reports one same-host wait with the host group and its end time, then null', async () => {
        const { fetchMeta, calls } = scriptedFetcher({})
        const onThrottleWait = vi.fn()

        await settle(importLinks(
          [{ url: 'https://youtu.be/a' }, { url: 'https://www.youtube.com/watch?v=b' }],
          null, dek, { fetchMeta, onThrottleWait },
        ))

        expect(onThrottleWait).toHaveBeenCalledTimes(2)
        expect(onThrottleWait.mock.calls[0][0]).toEqual({ host: 'youtube.com', until: expect.any(Number) })
        expect(onThrottleWait.mock.calls[0][0].until - calls[0].at).toBeGreaterThanOrEqual(2000)
        expect(onThrottleWait.mock.calls[1][0]).toBeNull()
      })

      it('is not called for rows on different hosts', async () => {
        const { fetchMeta } = scriptedFetcher({})
        const onThrottleWait = vi.fn()

        await settle(importLinks(
          [{ url: 'https://a.com/1' }, { url: 'https://b.com/1' }, { url: 'https://c.com/1' }],
          null, dek, { fetchMeta, onThrottleWait },
        ))

        expect(onThrottleWait).not.toHaveBeenCalled()
      })

      it('is not called when the configured gap is 0', async () => {
        const { fetchMeta } = scriptedFetcher({})
        const onThrottleWait = vi.fn()

        await settle(importLinks(
          [{ url: 'https://a.com/1' }, { url: 'https://a.com/2' }],
          null, dek, { fetchMeta, onThrottleWait, guardConfig: { gapMs: 0, emptyStreakLimit: 3 } },
        ))

        expect(onThrottleWait).not.toHaveBeenCalled()
      })

      it('still reports null when a cancel cuts the wait short', async () => {
        const controller = new AbortController()
        const { fetchMeta } = scriptedFetcher({})
        const onThrottleWait = vi.fn()
        const pending = importLinks(
          [{ url: 'https://a.com/1' }, { url: 'https://a.com/2' }],
          null, dek, { fetchMeta, signal: controller.signal, onThrottleWait },
        )
        while (onThrottleWait.mock.calls.length < 1) await new Promise(resolve => setImmediate(resolve))
        controller.abort()

        const result = await settle(pending)

        expect(onThrottleWait.mock.calls).toEqual([
          [{ host: 'a.com', until: expect.any(Number) }],
          [null],
        ])
        expect(result).toMatchObject({ cancelled: true, notProcessed: ['https://a.com/2'] })
      })
    })
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

// ── getLinksPage ──────────────────────────────────────────────────────────────

describe('getLinksPage', () => {
  it('calls the search_links RPC with limit/offset and mapped structural filter args', async () => {
    await getLinksPage(BASE_FILTER_PARAMS, 40, 0, dek)

    expect(mockRpc).toHaveBeenCalledWith('search_links', {
      p_category_id: null,
      p_statuses: null,
      p_tag_ids: null,
      p_tag_mode: 'any',
      p_favorites_only: false,
      p_unlocked_tag_ids: null,
      p_sort_by: 'newest',
      p_limit: 40,
      p_offset: 0,
    })
  })

  it('falls back to "newest" sort when alphabetical is requested (handled client-side instead)', async () => {
    await getLinksPage({ ...BASE_FILTER_PARAMS, sortBy: 'alphabetical' }, 40, 0, dek)

    expect(mockRpc).toHaveBeenCalledWith('search_links', expect.objectContaining({ p_sort_by: 'newest' }))
  })

  it('passes non-empty statuses/tagIds arrays through, and null for empty ones', async () => {
    await getLinksPage({ ...BASE_FILTER_PARAMS, statuses: ['unread'], tagIds: ['t1', 't2'] }, 40, 0, dek)

    expect(mockRpc).toHaveBeenCalledWith('search_links', expect.objectContaining({
      p_statuses: ['unread'],
      p_tag_ids: ['t1', 't2'],
    }))
  })

  it('passes categoryId, tagMode, favoritesOnly, sortBy, and offset through as given', async () => {
    await getLinksPage(
      { ...BASE_FILTER_PARAMS, categoryId: 'cat-1', tagMode: 'all', favoritesOnly: true, sortBy: 'oldest' },
      40, 80, dek,
    )

    expect(mockRpc).toHaveBeenCalledWith('search_links', expect.objectContaining({
      p_category_id: 'cat-1',
      p_tag_mode: 'all',
      p_favorites_only: true,
      p_sort_by: 'oldest',
      p_offset: 80,
    }))
  })

  it('passes unlockedTagIds through, and null when empty', async () => {
    await getLinksPage({ ...BASE_FILTER_PARAMS, unlockedTagIds: ['secret-id'] }, 40, 0, dek)
    expect(mockRpc).toHaveBeenCalledWith('search_links', expect.objectContaining({ p_unlocked_tag_ids: ['secret-id'] }))
  })

  it('decrypts each returned row and strips total_count', async () => {
    const a = await encryptLinkRow('1')
    const b = await encryptLinkRow('2')
    mockRpcReturns.mockResolvedValue({
      data: [{ ...a, tags: ['t1'], total_count: 5 }, { ...b, tags: [], total_count: 5 }],
      error: null,
    })

    const result = await getLinksPage(BASE_FILTER_PARAMS, 40, 0, dek)

    expect(result.links).toHaveLength(2)
    expect(result.links[0]).not.toHaveProperty('total_count')
    expect(result.links[0].tags).toEqual(['t1'])
    expect(result.links[0].title).toBe('Example')
  })

  it('returns totalCount from the first row', async () => {
    const row = await encryptLinkRow('1')
    mockRpcReturns.mockResolvedValue({
      data: [{ ...row, tags: [], total_count: 92 }],
      error: null,
    })

    const result = await getLinksPage(BASE_FILTER_PARAMS, 40, 0, dek)

    expect(result.totalCount).toBe(92)
  })

  it('returns an empty page with totalCount 0 on error', async () => {
    mockRpcReturns.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await getLinksPage(BASE_FILTER_PARAMS, 40, 0, dek)

    expect(result).toEqual({ links: [], totalCount: 0 })
  })

  it('returns an empty page with totalCount 0 when data is null', async () => {
    mockRpcReturns.mockResolvedValue({ data: null, error: null })

    const result = await getLinksPage(BASE_FILTER_PARAMS, 40, 0, dek)

    expect(result).toEqual({ links: [], totalCount: 0 })
  })

  it('returns totalCount 0 when the result set is empty', async () => {
    mockRpcReturns.mockResolvedValue({ data: [], error: null })

    const result = await getLinksPage(BASE_FILTER_PARAMS, 40, 0, dek)

    expect(result).toEqual({ links: [], totalCount: 0 })
  })
})

// ── getMatchingLinkIds ────────────────────────────────────────────────────────

describe('getMatchingLinkIds', () => {
  it('calls the search_link_ids RPC with the mapped filter args and the select-all cap as the limit', async () => {
    await getMatchingLinkIds(BASE_FILTER_PARAMS)

    expect(mockRpc).toHaveBeenCalledWith('search_link_ids', {
      p_category_id: null,
      p_statuses: null,
      p_tag_ids: null,
      p_tag_mode: 'any',
      p_favorites_only: false,
      p_unlocked_tag_ids: null,
      p_limit: SELECT_ALL_MATCHING_CAP,
    })
  })

  it('reflects an active filter in the RPC args', async () => {
    await getMatchingLinkIds({ ...BASE_FILTER_PARAMS, categoryId: 'cat-1', favoritesOnly: true })

    expect(mockRpc).toHaveBeenCalledWith('search_link_ids', expect.objectContaining({
      p_category_id: 'cat-1',
      p_favorites_only: true,
    }))
  })

  it('returns the matching ids and the true totalCount', async () => {
    mockRpcReturns.mockResolvedValue({
      data: [{ id: '1', total_count: 3 }, { id: '2', total_count: 3 }, { id: '3', total_count: 3 }],
      error: null,
    })

    const result = await getMatchingLinkIds(BASE_FILTER_PARAMS)

    expect(result).toEqual({ ids: ['1', '2', '3'], totalCount: 3 })
  })

  it('returns totalCount from the response even when capped below the true match count', async () => {
    mockRpcReturns.mockResolvedValue({
      data: [{ id: '1', total_count: 5000 }],
      error: null,
    })

    const result = await getMatchingLinkIds(BASE_FILTER_PARAMS)

    expect(result.totalCount).toBe(5000)
  })

  it('returns empty ids and totalCount 0 on error', async () => {
    mockRpcReturns.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await getMatchingLinkIds(BASE_FILTER_PARAMS)

    expect(result).toEqual({ ids: [], totalCount: 0 })
  })

  it('returns empty ids and totalCount 0 when data is null', async () => {
    mockRpcReturns.mockResolvedValue({ data: null, error: null })

    const result = await getMatchingLinkIds(BASE_FILTER_PARAMS)

    expect(result).toEqual({ ids: [], totalCount: 0 })
  })
})
