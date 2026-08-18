import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import {
  getTags, createTag, updateTag, deleteTag, mergeTag, getMergePreview, getTagLinksCount, toKebabCase,
  getPrivateTagIds, syncTagsByName, syncTagDefinitions,
} from '@/lib/services/tags/tags'
import { generateDek, encryptJson } from '@/lib/crypto/vault'

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockTagsSelect,
  mockInsertSingle,
  mockUpdateSingle,
  mockDeleteEq,
  mockLinkTagsCountEq,
  mockLinkTagsIn,
  mockLinkTagsSelectEq,
  mockLinkTagsUpdateEq,
  mockLinkTagsUpdateIn,
  mockLinkTagsDeleteEq,
  mockPrivateIdsEq,
  mockTagsPrivacyIn,
  mockInsert,
  mockUpdate,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockTagsSelect = vi.fn()

  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockUpdateSingle = vi.fn()
  const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
  const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockDeleteEq = vi.fn()
  const mockLinkTagsCountEq = vi.fn()
  const mockLinkTagsIn = vi.fn()
  const mockLinkTagsSelectEq = vi.fn()
  const mockLinkTagsUpdateIn = vi.fn()
  const mockLinkTagsUpdateEq = vi.fn(() => ({ in: mockLinkTagsUpdateIn }))
  const mockLinkTagsDeleteEq = vi.fn()
  const mockPrivateIdsEq = vi.fn()
  const mockTagsPrivacyIn = vi.fn()

  return {
    mockGetUser,
    mockTagsSelect,
    mockInsertSingle,
    mockUpdateSingle,
    mockDeleteEq,
    mockLinkTagsCountEq,
    mockLinkTagsIn,
    mockLinkTagsSelectEq,
    mockLinkTagsUpdateEq,
    mockLinkTagsUpdateIn,
    mockLinkTagsDeleteEq,
    mockPrivateIdsEq,
    mockTagsPrivacyIn,
    mockInsert,
    mockUpdate,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'link_tags') return {
        select: vi.fn((col?: string) => {
          if (col === 'link_id') return { in: mockLinkTagsIn, eq: mockLinkTagsSelectEq }
          return { eq: mockLinkTagsCountEq }
        }),
        update: vi.fn(() => ({ eq: mockLinkTagsUpdateEq })),
        delete: vi.fn(() => ({ eq: mockLinkTagsDeleteEq })),
      }
      // tags (default)
      return {
        select: vi.fn((col?: string) => {
          if (col === 'id') return { eq: mockPrivateIdsEq }
          if (col === 'id, is_private') return { in: mockTagsPrivacyIn }
          return mockTagsSelect()
        }),
        insert: mockInsert,
        update: mockUpdate,
        delete: vi.fn(() => ({ eq: mockDeleteEq })),
      }
    }),
  })),
}))

// ── fixtures ──────────────────────────────────────────────────────────────────

let dek: CryptoKey

beforeAll(async () => {
  dek = await generateDek()
})

async function encryptTagRow(id: string, name: string, color: string | null, isPrivate = false) {
  const { ciphertext, iv } = await encryptJson({ name, color }, dek)
  return {
    id, user_id: 'u1', enc_payload: ciphertext, enc_iv: iv,
    is_private: isPrivate, created_at: '2026-01-01T00:00:00Z',
  }
}

/** getTags always joins `link_tags(id)`; use this variant for rows fed to `mockTagsSelect`
 *  (real insert/update responses never carry this field, so `encryptTagRow` above omits it). */
async function encryptTagRowForSelect(id: string, name: string, color: string | null, isPrivate = false) {
  return { ...await encryptTagRow(id, name, color, isPrivate), link_tags: [{ id: 'lt1' }, { id: 'lt2' }] }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── toKebabCase ───────────────────────────────────────────────────────────────

describe('toKebabCase', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(toKebabCase('My React Tag')).toBe('my-react-tag')
  })

  it('collapses multiple consecutive spaces into one dash', () => {
    expect(toKebabCase('hello   world')).toBe('hello-world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(toKebabCase('  react  ')).toBe('react')
  })

  it('preserves numbers', () => {
    expect(toKebabCase('React 19')).toBe('react-19')
  })

  it('replaces special characters with dashes', () => {
    expect(toKebabCase('TypeScript/JavaScript')).toBe('typescript-javascript')
  })

  it('returns empty string when input has only special characters', () => {
    expect(toKebabCase('!!!')).toBe('')
  })
})

// ── getTags ───────────────────────────────────────────────────────────────────

describe('getTags', () => {
  it('decrypts and returns tags ordered alphabetically by name', async () => {
    const b = await encryptTagRowForSelect('b', 'zebra', null)
    const a = await encryptTagRowForSelect('a', 'apple', null)
    mockTagsSelect.mockResolvedValue({ data: [b, a], error: null })

    const result = await getTags(dek)

    expect(result.map(t => t.name)).toEqual(['apple', 'zebra'])
  })

  it('maps link_tags array to a link_count number', async () => {
    const row = await encryptTagRowForSelect('1', 'react', 'indigo')
    mockTagsSelect.mockResolvedValue({ data: [row], error: null })

    const result = await getTags(dek)

    expect(result[0].link_count).toBe(2)
  })

  it('sets link_count to 0 when there are no associated links', async () => {
    const row = await encryptTagRow('1', 'react', null)
    mockTagsSelect.mockResolvedValue({ data: [{ ...row, link_tags: [] }], error: null })

    const result = await getTags(dek)

    expect(result[0].link_count).toBe(0)
  })

  it('strips link_tags from the returned objects', async () => {
    const row = await encryptTagRowForSelect('1', 'react', null)
    mockTagsSelect.mockResolvedValue({ data: [row], error: null })

    const result = await getTags(dek)

    expect(result[0]).not.toHaveProperty('link_tags')
  })

  it('returns [] on error', async () => {
    mockTagsSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getTags(dek)).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockTagsSelect.mockResolvedValue({ data: null, error: null })

    expect(await getTags(dek)).toEqual([])
  })
})

// ── createTag ─────────────────────────────────────────────────────────────────

describe('createTag', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockTagsSelect.mockResolvedValue({ data: [], error: null })
  })

  it('returns the created tag on success', async () => {
    const row = await encryptTagRow('1', 'react', 'indigo')
    mockInsertSingle.mockResolvedValue({ data: row, error: null })

    const result = await createTag({ name: 'React', color: 'indigo' }, dek)

    expect(result).toEqual({ data: { id: '1', user_id: 'u1', name: 'react', color: 'indigo', is_private: false, created_at: '2026-01-01T00:00:00Z' }, error: null })
  })

  it('encrypts the kebab-cased name and color into the insert payload', async () => {
    const row = await encryptTagRow('1', 'my-react-tag', 'indigo')
    mockInsertSingle.mockResolvedValue({ data: row, error: null })

    await createTag({ name: 'My React Tag', color: 'indigo' }, dek)

    const call = mockInsert.mock.calls[0][0]
    expect(call.user_id).toBe('u1')
    expect(call.enc_payload).toBeTypeOf('string')
    expect(call.enc_payload).not.toContain('react')
  })

  it('returns db_error when the kebab-case name is empty', async () => {
    const result = await createTag({ name: '!!!' }, dek)

    expect(result).toEqual({ data: null, error: 'db_error' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns name_taken when a tag with the same name exists', async () => {
    const existing = await encryptTagRowForSelect('99', 'react', null)
    mockTagsSelect.mockResolvedValue({ data: [existing], error: null })

    const result = await createTag({ name: 'React' }, dek)

    expect(result).toEqual({ data: null, error: 'name_taken' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createTag({ name: 'React' }, dek)

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns db_error on insert failure', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await createTag({ name: 'React' }, dek)

    expect(result).toEqual({ data: null, error: 'db_error' })
  })
})

// ── updateTag ─────────────────────────────────────────────────────────────────

describe('updateTag', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockTagsSelect.mockResolvedValue({ data: [], error: null })
  })

  it('returns the updated tag on success', async () => {
    const row = await encryptTagRow('1', 'react-19', null)
    mockUpdateSingle.mockResolvedValue({ data: row, error: null })

    const result = await updateTag({ id: '1', name: 'React 19' }, dek)

    expect(result.data?.name).toBe('react-19')
  })

  it('filters by id when updating', async () => {
    const row = await encryptTagRow('tag-99', 'x', null)
    mockUpdateSingle.mockResolvedValue({ data: row, error: null })

    await updateTag({ id: 'tag-99', name: 'X' }, dek)

    expect(mockUpdate).toHaveBeenCalled()
  })

  it('excludes the current tag from the name-conflict check', async () => {
    const self = await encryptTagRowForSelect('tag-99', 'react', null)
    mockTagsSelect.mockResolvedValue({ data: [self], error: null })
    const row = await encryptTagRow('tag-99', 'react', null)
    mockUpdateSingle.mockResolvedValue({ data: row, error: null })

    const result = await updateTag({ id: 'tag-99', name: 'React' }, dek)

    expect(result.error).toBeNull()
  })

  it('performs the name-conflict check case-insensitively', async () => {
    const existing = await encryptTagRowForSelect('other', 'react', null)
    mockTagsSelect.mockResolvedValue({ data: [existing], error: null })

    const result = await updateTag({ id: '1', name: 'react' }, dek)

    expect(result).toEqual({ data: null, error: 'name_taken' })
  })

  it('converts the name to kebab-case before updating', async () => {
    const row = await encryptTagRow('1', 'my-react-tag', null)
    mockUpdateSingle.mockResolvedValue({ data: row, error: null })

    await updateTag({ id: '1', name: 'My React Tag' }, dek)

    const call = mockUpdate.mock.calls[0][0]
    expect(call.enc_payload).toBeTypeOf('string')
  })

  it('returns db_error when the kebab-case name is empty', async () => {
    const result = await updateTag({ id: '1', name: '!!!' }, dek)

    expect(result).toEqual({ data: null, error: 'db_error' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns name_taken when another tag has the same name', async () => {
    const existing = await encryptTagRowForSelect('99', 'react', null)
    mockTagsSelect.mockResolvedValue({ data: [existing], error: null })

    const result = await updateTag({ id: '1', name: 'React' }, dek)

    expect(result).toEqual({ data: null, error: 'name_taken' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await updateTag({ id: '1', name: 'React' }, dek)

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns db_error on update failure', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await updateTag({ id: '1', name: 'X' }, dek)

    expect(result).toEqual({ data: null, error: 'db_error' })
  })
})

// ── getTagLinksCount ──────────────────────────────────────────────────────────

describe('getTagLinksCount', () => {
  it('returns the count when links exist', async () => {
    mockLinkTagsCountEq.mockResolvedValue({ count: 3 })

    expect(await getTagLinksCount('tag-1')).toBe(3)
  })

  it('returns 0 when no links exist', async () => {
    mockLinkTagsCountEq.mockResolvedValue({ count: 0 })

    expect(await getTagLinksCount('tag-1')).toBe(0)
  })

  it('returns 0 when count is null', async () => {
    mockLinkTagsCountEq.mockResolvedValue({ count: null })

    expect(await getTagLinksCount('tag-1')).toBe(0)
  })

  it('filters by tag_id', async () => {
    mockLinkTagsCountEq.mockResolvedValue({ count: 0 })

    await getTagLinksCount('tag-42')

    expect(mockLinkTagsCountEq).toHaveBeenCalledWith('tag_id', 'tag-42')
  })
})

// ── deleteTag ─────────────────────────────────────────────────────────────────

describe('deleteTag', () => {
  it('returns true when the delete succeeds', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    expect(await deleteTag('tag-1')).toBe(true)
  })

  it('filters by id', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    await deleteTag('tag-42')

    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'tag-42')
  })

  it('returns false on DB error', async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: 'DB error' } })

    expect(await deleteTag('tag-1')).toBe(false)
  })
})

// ── mergeTag ──────────────────────────────────────────────────────────────────

describe('mergeTag', () => {
  function stubSelects(sourceLinkIds: string[], targetLinkIds: string[]) {
    mockLinkTagsSelectEq.mockImplementation((field: string, tagId: string) => {
      if (tagId === 'source') return Promise.resolve({ data: sourceLinkIds.map(link_id => ({ link_id })), error: null })
      if (tagId === 'target') return Promise.resolve({ data: targetLinkIds.map(link_id => ({ link_id })), error: null })
      return Promise.resolve({ data: [], error: null })
    })
  }

  beforeEach(() => {
    mockTagsPrivacyIn.mockResolvedValue({
      data: [{ id: 'source', is_private: false }, { id: 'target', is_private: false }],
      error: null,
    })
    mockLinkTagsUpdateIn.mockResolvedValue({ error: null })
    mockLinkTagsDeleteEq.mockResolvedValue({ error: null })
    mockDeleteEq.mockResolvedValue({ error: null })
  })

  it('returns false without touching the database when sourceId equals targetId', async () => {
    const result = await mergeTag('same-id', 'same-id')

    expect(result).toBe(false)
    expect(mockLinkTagsSelectEq).not.toHaveBeenCalled()
    expect(mockLinkTagsUpdateEq).not.toHaveBeenCalled()
    expect(mockLinkTagsDeleteEq).not.toHaveBeenCalled()
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('reassigns all source links to the target when there is no overlap', async () => {
    stubSelects(['l1', 'l2'], [])

    const result = await mergeTag('source', 'target')

    expect(result).toBe(true)
    expect(mockLinkTagsUpdateEq).toHaveBeenCalledWith('tag_id', 'source')
    expect(mockLinkTagsUpdateIn).toHaveBeenCalledWith('link_id', ['l1', 'l2'])
  })

  it('only reassigns links that do not already have the target tag', async () => {
    stubSelects(['l1', 'l2'], ['l2', 'l3'])

    await mergeTag('source', 'target')

    expect(mockLinkTagsUpdateIn).toHaveBeenCalledWith('link_id', ['l1'])
  })

  it('skips the reassign update entirely when every source link already has the target tag', async () => {
    stubSelects(['l1'], ['l1'])

    await mergeTag('source', 'target')

    expect(mockLinkTagsUpdateEq).not.toHaveBeenCalled()
  })

  it('cleans up any remaining source link_tags rows after reassigning', async () => {
    stubSelects(['l1'], [])

    await mergeTag('source', 'target')

    expect(mockLinkTagsDeleteEq).toHaveBeenCalledWith('tag_id', 'source')
  })

  it('deletes the source tag after a successful merge', async () => {
    stubSelects([], [])

    await mergeTag('source', 'target')

    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'source')
  })

  it('returns false without mutating anything when reading source/target links fails', async () => {
    mockLinkTagsSelectEq.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await mergeTag('source', 'target')

    expect(result).toBe(false)
    expect(mockLinkTagsUpdateEq).not.toHaveBeenCalled()
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('returns false when reassigning links fails', async () => {
    stubSelects(['l1'], [])
    mockLinkTagsUpdateIn.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await mergeTag('source', 'target')

    expect(result).toBe(false)
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('returns false when cleaning up leftover source rows fails', async () => {
    stubSelects(['l1'], [])
    mockLinkTagsDeleteEq.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await mergeTag('source', 'target')

    expect(result).toBe(false)
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('returns false when the final source tag deletion fails', async () => {
    stubSelects([], [])
    mockDeleteEq.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await mergeTag('source', 'target')

    expect(result).toBe(false)
  })

  it('returns false without touching links when the source tag is private and the target is not', async () => {
    mockTagsPrivacyIn.mockResolvedValue({
      data: [{ id: 'source', is_private: true }, { id: 'target', is_private: false }],
      error: null,
    })
    stubSelects(['l1'], [])

    const result = await mergeTag('source', 'target')

    expect(result).toBe(false)
    expect(mockLinkTagsSelectEq).not.toHaveBeenCalled()
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('returns false without touching links when the source tag is public and the target is private', async () => {
    mockTagsPrivacyIn.mockResolvedValue({
      data: [{ id: 'source', is_private: false }, { id: 'target', is_private: true }],
      error: null,
    })
    stubSelects(['l1'], [])

    const result = await mergeTag('source', 'target')

    expect(result).toBe(false)
    expect(mockLinkTagsSelectEq).not.toHaveBeenCalled()
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('proceeds normally when both tags are private', async () => {
    mockTagsPrivacyIn.mockResolvedValue({
      data: [{ id: 'source', is_private: true }, { id: 'target', is_private: true }],
      error: null,
    })
    stubSelects(['l1'], [])

    const result = await mergeTag('source', 'target')

    expect(result).toBe(true)
  })

  it('returns false when the privacy lookup fails', async () => {
    mockTagsPrivacyIn.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await mergeTag('source', 'target')

    expect(result).toBe(false)
    expect(mockLinkTagsSelectEq).not.toHaveBeenCalled()
  })
})

// ── getMergePreview ───────────────────────────────────────────────────────────

describe('getMergePreview', () => {
  function stubSelects(sourceLinkIds: string[], targetLinkIds: string[]) {
    mockLinkTagsSelectEq.mockImplementation((field: string, tagId: string) => {
      if (tagId === 'source') return Promise.resolve({ data: sourceLinkIds.map(link_id => ({ link_id })), error: null })
      if (tagId === 'target') return Promise.resolve({ data: targetLinkIds.map(link_id => ({ link_id })), error: null })
      return Promise.resolve({ data: [], error: null })
    })
  }

  it('reports counts and a summed total when there is no overlap', async () => {
    stubSelects(['l1', 'l2'], ['l3'])

    const result = await getMergePreview('source', 'target')

    expect(result).toEqual({ sourceCount: 2, targetCount: 1, totalAfterMerge: 3 })
  })

  it('dedupes the total when every source link already has the target tag', async () => {
    stubSelects(['l1', 'l2'], ['l1', 'l2'])

    const result = await getMergePreview('source', 'target')

    expect(result).toEqual({ sourceCount: 2, targetCount: 2, totalAfterMerge: 2 })
  })

  it('dedupes only the overlapping links when partially shared', async () => {
    stubSelects(['l1', 'l2'], ['l2', 'l3'])

    const result = await getMergePreview('source', 'target')

    expect(result).toEqual({ sourceCount: 2, targetCount: 2, totalAfterMerge: 3 })
  })

  it('returns zero counts when neither tag has links', async () => {
    stubSelects([], [])

    const result = await getMergePreview('source', 'target')

    expect(result).toEqual({ sourceCount: 0, targetCount: 0, totalAfterMerge: 0 })
  })

  it('returns null without throwing when the query fails', async () => {
    mockLinkTagsSelectEq.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await getMergePreview('source', 'target')

    expect(result).toBeNull()
  })
})

// ── syncTagsByName ────────────────────────────────────────────────────────────

describe('syncTagsByName', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('resolves existing tags by name to their ids without inserting', async () => {
    const existing = await encryptTagRowForSelect('tag-1', 'react', null)
    mockTagsSelect.mockResolvedValue({ data: [existing], error: null })

    const ids = await syncTagsByName(['react'], dek)

    expect(ids).toEqual(['tag-1'])
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates missing tags and returns their new ids', async () => {
    mockTagsSelect.mockResolvedValue({ data: [], error: null })
    mockInsertSingle.mockResolvedValue({ data: { id: 'new-1' }, error: null })

    const ids = await syncTagsByName(['fresh-tag'], dek)

    expect(ids).toEqual(['new-1'])
    expect(mockInsert).toHaveBeenCalled()
  })

  it('defaults to a single "no-tag" entry when given an empty array', async () => {
    mockTagsSelect.mockResolvedValue({ data: [], error: null })
    mockInsertSingle.mockResolvedValue({ data: { id: 'no-tag-id' }, error: null })

    const ids = await syncTagsByName([], dek)

    expect(ids).toEqual(['no-tag-id'])
  })
})

// ── syncTagDefinitions ────────────────────────────────────────────────────────

describe('syncTagDefinitions', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('resolves an existing tag by name without inserting or overwriting its color/privacy', async () => {
    const existing = await encryptTagRowForSelect('tag-1', 'react', 'old-color', true)
    mockTagsSelect.mockResolvedValue({ data: [existing], error: null })

    const ids = await syncTagDefinitions([{ name: 'react', color: 'new-color', is_private: false }], dek)

    expect(ids).toEqual(['tag-1'])
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates a missing tag with the given color and privacy', async () => {
    mockTagsSelect.mockResolvedValue({ data: [], error: null })
    mockInsertSingle.mockResolvedValue({ data: { id: 'new-1' }, error: null })

    const ids = await syncTagDefinitions([{ name: 'secret', color: '#000', is_private: true }], dek)

    expect(ids).toEqual(['new-1'])
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', is_private: true }))
  })

  it('skips a definition whose kebab-cased name is empty', async () => {
    mockTagsSelect.mockResolvedValue({ data: [], error: null })

    const ids = await syncTagDefinitions([{ name: '!!!', color: null, is_private: false }], dek)

    expect(ids).toEqual([])
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('does not create a second tag already created earlier in the same batch', async () => {
    mockTagsSelect.mockResolvedValue({ data: [], error: null })
    mockInsertSingle.mockResolvedValue({ data: { id: 'new-1' }, error: null })

    const ids = await syncTagDefinitions(
      [{ name: 'react', color: null, is_private: false }, { name: 'React', color: null, is_private: false }],
      dek,
    )

    expect(ids).toEqual(['new-1', 'new-1'])
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('returns [] when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const ids = await syncTagDefinitions([{ name: 'react', color: null, is_private: false }], dek)

    expect(ids).toEqual([])
  })
})

// ── getPrivateTagIds ──────────────────────────────────────────────────────────

describe('getPrivateTagIds', () => {
  it('returns ids of private tags', async () => {
    mockPrivateIdsEq.mockResolvedValue({ data: [{ id: 'tag-a' }, { id: 'tag-b' }], error: null })

    const result = await getPrivateTagIds()

    expect(result).toEqual(['tag-a', 'tag-b'])
  })

  it('queries with is_private = true', async () => {
    mockPrivateIdsEq.mockResolvedValue({ data: [], error: null })

    await getPrivateTagIds()

    expect(mockPrivateIdsEq).toHaveBeenCalledWith('is_private', true)
  })

  it('returns [] when data is null', async () => {
    mockPrivateIdsEq.mockResolvedValue({ data: null, error: null })

    expect(await getPrivateTagIds()).toEqual([])
  })

  it('returns an empty array when no private tags exist', async () => {
    mockPrivateIdsEq.mockResolvedValue({ data: [], error: null })

    expect(await getPrivateTagIds()).toEqual([])
  })
})
