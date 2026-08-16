import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import {
  getTags, createTag, updateTag, deleteTag, mergeTag, getTagLinksCount, toKebabCase,
  getPrivateTagIds, setPrivateTagPassword, verifyPrivateTagPassword, getPrivateTagSettings,
  syncTagsByName,
} from '@/lib/services/tags'
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
  mockLinksDeleteIn,
  mockTagsDeleteIn,
  mockPrivateIdsEq,
  mockSettingsMaybeSingle,
  mockSettingsEq,
  mockSettingsUpdateEq,
  mockUpsert,
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
  const mockLinksDeleteIn = vi.fn()
  const mockTagsDeleteIn = vi.fn()
  const mockPrivateIdsEq = vi.fn()

  const mockSettingsMaybeSingle = vi.fn()
  const mockSettingsEq = vi.fn(() => ({ maybeSingle: mockSettingsMaybeSingle }))
  const mockSettingsUpdateEq = vi.fn()
  const mockUpsert = vi.fn()

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
    mockLinksDeleteIn,
    mockTagsDeleteIn,
    mockPrivateIdsEq,
    mockSettingsMaybeSingle,
    mockSettingsEq,
    mockSettingsUpdateEq,
    mockUpsert,
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
      if (table === 'links') return {
        delete: vi.fn(() => ({ eq: mockDeleteEq, in: mockLinksDeleteIn })),
      }
      if (table === 'private_tag_settings') return {
        select: vi.fn(() => ({ eq: mockSettingsEq })),
        upsert: mockUpsert,
        update: vi.fn(() => ({ eq: mockSettingsUpdateEq })),
        delete: vi.fn(() => ({ eq: mockDeleteEq })),
      }
      // tags (default)
      return {
        select: vi.fn((col?: string) => {
          if (col === 'id') {
            // Two different real call sites share `.select('id')`:
            // getPrivateTagIds does one `.eq('is_private', true)`; nukeAllData
            // chains `.eq('user_id', ...).eq('is_private', true)`.
            return {
              eq: vi.fn((field: string, value: unknown) => {
                if (field === 'user_id') return { eq: mockPrivateIdsEq }
                return mockPrivateIdsEq(field, value)
              }),
            }
          }
          return mockTagsSelect()
        }),
        insert: mockInsert,
        update: mockUpdate,
        delete: vi.fn(() => ({ eq: mockDeleteEq, in: mockTagsDeleteIn })),
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
    mockLinkTagsUpdateIn.mockResolvedValue({ error: null })
    mockLinkTagsDeleteEq.mockResolvedValue({ error: null })
    mockDeleteEq.mockResolvedValue({ error: null })
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

// ── setPrivateTagPassword ─────────────────────────────────────────────────────

describe('setPrivateTagPassword', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('returns ok on success', async () => {
    mockUpsert.mockResolvedValue({ error: null })

    expect(await setPrivateTagPassword('secret', 'my hint')).toBe('ok')
  })

  it('stores a hash, not the plaintext password', async () => {
    mockUpsert.mockResolvedValue({ error: null })

    await setPrivateTagPassword('secret', 'hint')

    const call = mockUpsert.mock.calls[0][0]
    expect(call.password_hash).not.toBe('secret')
    expect(call.password_hash).toHaveLength(64)
  })

  it('stores the hint', async () => {
    mockUpsert.mockResolvedValue({ error: null })

    await setPrivateTagPassword('secret', 'my hint')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ hint: 'my hint' }),
      expect.anything(),
    )
  })

  it('resets failed_attempts to 0 on save', async () => {
    mockUpsert.mockResolvedValue({ error: null })

    await setPrivateTagPassword('secret', 'hint')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ failed_attempts: 0 }),
      expect.anything(),
    )
  })

  it('stores null hint when hint is empty', async () => {
    mockUpsert.mockResolvedValue({ error: null })

    await setPrivateTagPassword('secret', '  ')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ hint: null }),
      expect.anything(),
    )
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await setPrivateTagPassword('secret', 'hint')).toBe('unauthenticated')
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('returns db_error on upsert failure', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })

    expect(await setPrivateTagPassword('secret', 'hint')).toBe('db_error')
  })
})

// ── verifyPrivateTagPassword ──────────────────────────────────────────────────

describe('verifyPrivateTagPassword', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSettingsUpdateEq.mockResolvedValue({ error: null })
    mockDeleteEq.mockResolvedValue({ error: null })
    // nuke defaults — no private tags, so nuke short-circuits cleanly
    mockPrivateIdsEq.mockResolvedValue({ data: [], error: null })
    mockLinkTagsIn.mockResolvedValue({ data: [], error: null })
    mockLinksDeleteIn.mockResolvedValue({ error: null })
    mockTagsDeleteIn.mockResolvedValue({ error: null })
  })

  async function makeHash(password: string): Promise<string> {
    return Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)))
    ).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  it('returns { ok: true } when the password matches', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 0 }, error: null })

    expect(await verifyPrivateTagPassword('correct')).toEqual({ ok: true })
  })

  it('resets failed_attempts to 0 on correct password', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 3 }, error: null })

    await verifyPrivateTagPassword('correct')

    expect(mockSettingsUpdateEq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('returns { ok: false, nuked: false, attemptsLeft: 4 } on first wrong attempt', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 0 }, error: null })

    const result = await verifyPrivateTagPassword('wrong')

    expect(result).toEqual({ ok: false, nuked: false, attemptsLeft: 4 })
  })

  it('decrements attemptsLeft based on current failed_attempts count', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 3 }, error: null })

    const result = await verifyPrivateTagPassword('wrong')

    expect(result).toEqual({ ok: false, nuked: false, attemptsLeft: 1 })
  })

  it('returns { ok: false, nuked: true } on 5th wrong attempt', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 4 }, error: null })

    const result = await verifyPrivateTagPassword('wrong')

    expect(result).toEqual({ ok: false, nuked: true })
  })

  it('deletes only private-tag-associated links and private tags on nuke', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 4 }, error: null })
    mockPrivateIdsEq.mockResolvedValue({ data: [{ id: 'tag-private' }], error: null })
    mockLinkTagsIn.mockResolvedValue({ data: [{ link_id: 'link-1' }], error: null })

    await verifyPrivateTagPassword('wrong')

    expect(mockLinksDeleteIn).toHaveBeenCalledWith('id', ['link-1'])
    expect(mockTagsDeleteIn).toHaveBeenCalledWith('id', ['tag-private'])
    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('deduplicates link IDs when a link has multiple private tags', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 4 }, error: null })
    mockPrivateIdsEq.mockResolvedValue({ data: [{ id: 'tag-a' }, { id: 'tag-b' }], error: null })
    mockLinkTagsIn.mockResolvedValue({
      data: [{ link_id: 'link-1' }, { link_id: 'link-1' }, { link_id: 'link-2' }],
      error: null,
    })

    await verifyPrivateTagPassword('wrong')

    expect(mockLinksDeleteIn).toHaveBeenCalledWith('id', ['link-1', 'link-2'])
  })

  it('skips link deletion when no links are tagged with private tags', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 4 }, error: null })
    mockPrivateIdsEq.mockResolvedValue({ data: [{ id: 'tag-private' }], error: null })
    mockLinkTagsIn.mockResolvedValue({ data: [], error: null })

    await verifyPrivateTagPassword('wrong')

    expect(mockLinksDeleteIn).not.toHaveBeenCalled()
    expect(mockTagsDeleteIn).toHaveBeenCalledWith('id', ['tag-private'])
  })

  it('skips link and tag deletion when there are no private tags', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 4 }, error: null })
    // mockPrivateIdsEq already returns [] from beforeEach

    await verifyPrivateTagPassword('wrong')

    expect(mockLinksDeleteIn).not.toHaveBeenCalled()
    expect(mockTagsDeleteIn).not.toHaveBeenCalled()
    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('returns { ok: false, nuked: false, attemptsLeft: 5 } when no settings row exists', async () => {
    mockSettingsMaybeSingle.mockResolvedValue({ data: null, error: null })

    expect(await verifyPrivateTagPassword('anything')).toEqual({ ok: false, nuked: false, attemptsLeft: 5 })
  })

  it('returns { ok: false, nuked: false, attemptsLeft: 5 } when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await verifyPrivateTagPassword('anything')).toEqual({ ok: false, nuked: false, attemptsLeft: 5 })
  })
})

// ── getPrivateTagSettings ─────────────────────────────────────────────────────

describe('getPrivateTagSettings', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('returns hasPassword true and the hint when a password is set', async () => {
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: 'abc', hint: 'my hint' }, error: null })

    expect(await getPrivateTagSettings()).toEqual({ hasPassword: true, hint: 'my hint' })
  })

  it('returns null hint when the hint field is null', async () => {
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: 'abc', hint: null }, error: null })

    expect(await getPrivateTagSettings()).toEqual({ hasPassword: true, hint: null })
  })

  it('returns hasPassword false when no settings row exists', async () => {
    mockSettingsMaybeSingle.mockResolvedValue({ data: null, error: null })

    expect(await getPrivateTagSettings()).toEqual({ hasPassword: false, hint: null })
  })

  it('returns hasPassword false when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await getPrivateTagSettings()).toEqual({ hasPassword: false, hint: null })
  })
})
