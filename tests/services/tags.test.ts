import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTags, createTag, updateTag, deleteTag, getTagLinksCount, toKebabCase,
  getPrivateTagNames, setPrivateTagPassword, verifyPrivateTagPassword, getPrivateTagSettings,
} from '@/lib/services/tags'
import type { Tag } from '@/lib/services/tags'

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockOrder,
  mockNameCheckMaybeSingle,
  mockIlike,
  mockNeq,
  mockNameCheckEq,
  mockPrivateTagIdsEq,
  mockInsert, mockInsertSingle,
  mockUpdate, mockUpdateEq, mockUpdateSingle,
  mockDeleteEq,
  mockLinkTagsCountEq,
  mockLinkTagsIn,
  mockLinksDeleteIn,
  mockTagsDeleteIn,
  mockPrivateNamesEq,
  mockSettingsMaybeSingle,
  mockSettingsEq,
  mockSettingsUpdateEq,
  mockUpsert,
} = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockGetUser = vi.fn()

  const mockNameCheckMaybeSingle = vi.fn()
  const mockNeq = vi.fn(() => ({ maybeSingle: mockNameCheckMaybeSingle }))
  const mockIlike = vi.fn(() => ({ maybeSingle: mockNameCheckMaybeSingle, neq: mockNeq }))
  const mockPrivateTagIdsEq = vi.fn()
  const mockNameCheckEq = vi.fn(() => ({ ilike: mockIlike, eq: mockPrivateTagIdsEq }))

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
  const mockLinksDeleteIn = vi.fn()
  const mockTagsDeleteIn = vi.fn()
  const mockPrivateNamesEq = vi.fn()

  const mockSettingsMaybeSingle = vi.fn()
  const mockSettingsEq = vi.fn(() => ({ maybeSingle: mockSettingsMaybeSingle }))
  const mockSettingsUpdateEq = vi.fn()
  const mockUpsert = vi.fn()

  return {
    mockGetUser,
    mockOrder,
    mockNameCheckMaybeSingle,
    mockIlike,
    mockNeq,
    mockNameCheckEq,
    mockPrivateTagIdsEq,
    mockInsert, mockInsertSingle,
    mockUpdate, mockUpdateEq, mockUpdateSingle,
    mockDeleteEq,
    mockLinkTagsCountEq,
    mockLinkTagsIn,
    mockLinksDeleteIn,
    mockTagsDeleteIn,
    mockPrivateNamesEq,
    mockSettingsMaybeSingle,
    mockSettingsEq,
    mockSettingsUpdateEq,
    mockUpsert,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'link_tags') return {
        select: vi.fn((col?: string) => {
          if (col === 'link_id') return { in: mockLinkTagsIn }
          return { eq: mockLinkTagsCountEq }
        }),
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
          if (col === 'name') return { eq: mockPrivateNamesEq }
          return { order: mockOrder, eq: mockNameCheckEq }
        }),
        insert: mockInsert,
        update: mockUpdate,
        delete: vi.fn(() => ({ eq: mockDeleteEq, in: mockTagsDeleteIn })),
      }
    }),
  })),
}))

// ── fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TAG: Tag = {
  id: '1', user_id: 'u1', name: 'React', color: 'indigo',
  is_private: false, created_at: '2026-01-01T00:00:00Z',
}

const MOCK_TAG_ROW = {
  ...MOCK_TAG,
  link_tags: [{ id: 'lt1' }, { id: 'lt2' }],
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
  it('returns tags ordered alphabetically by name', async () => {
    mockOrder.mockResolvedValue({ data: [MOCK_TAG_ROW], error: null })

    await getTags()

    expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('maps link_tags array to a link_count number', async () => {
    mockOrder.mockResolvedValue({ data: [MOCK_TAG_ROW], error: null })

    const result = await getTags()

    expect(result[0].link_count).toBe(2)
  })

  it('sets link_count to 0 when there are no associated links', async () => {
    mockOrder.mockResolvedValue({ data: [{ ...MOCK_TAG_ROW, link_tags: [] }], error: null })

    const result = await getTags()

    expect(result[0].link_count).toBe(0)
  })

  it('strips link_tags from the returned objects', async () => {
    mockOrder.mockResolvedValue({ data: [MOCK_TAG_ROW], error: null })

    const result = await getTags()

    expect(result[0]).not.toHaveProperty('link_tags')
  })

  it('returns [] on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getTags()).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })

    expect(await getTags()).toEqual([])
  })
})

// ── createTag ─────────────────────────────────────────────────────────────────

describe('createTag', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockNameCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('returns the created tag on success', async () => {
    mockInsertSingle.mockResolvedValue({ data: MOCK_TAG, error: null })

    const result = await createTag({ name: 'React', color: 'indigo' })

    expect(result).toEqual({ data: MOCK_TAG, error: null })
  })

  it('includes kebab-cased name, color, and user_id in the insert payload', async () => {
    mockInsertSingle.mockResolvedValue({ data: MOCK_TAG, error: null })

    await createTag({ name: 'My React Tag', color: 'indigo' })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'my-react-tag', color: 'indigo', user_id: 'u1' }),
    )
  })

  it('converts the name to kebab-case before the name-conflict check', async () => {
    mockInsertSingle.mockResolvedValue({ data: MOCK_TAG, error: null })

    await createTag({ name: 'My React Tag' })

    expect(mockIlike).toHaveBeenCalledWith('name', 'my-react-tag')
  })

  it('returns db_error when the kebab-case name is empty', async () => {
    const result = await createTag({ name: '!!!' })

    expect(result).toEqual({ data: null, error: 'db_error' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns name_taken when a tag with the same name exists', async () => {
    mockNameCheckMaybeSingle.mockResolvedValue({ data: { id: '99' }, error: null })

    const result = await createTag({ name: 'React' })

    expect(result).toEqual({ data: null, error: 'name_taken' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createTag({ name: 'React' })

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns db_error on insert failure', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await createTag({ name: 'React' })

    expect(result).toEqual({ data: null, error: 'db_error' })
  })
})

// ── updateTag ─────────────────────────────────────────────────────────────────

describe('updateTag', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockNameCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('returns the updated tag on success', async () => {
    const updated = { ...MOCK_TAG, name: 'React 19' }
    mockUpdateSingle.mockResolvedValue({ data: updated, error: null })

    const result = await updateTag({ id: '1', name: 'React 19' })

    expect(result).toEqual({ data: updated, error: null })
  })

  it('filters by id when updating', async () => {
    mockUpdateSingle.mockResolvedValue({ data: MOCK_TAG, error: null })

    await updateTag({ id: 'tag-99', name: 'X' })

    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'tag-99')
  })

  it('excludes the current tag from the name-conflict check', async () => {
    mockUpdateSingle.mockResolvedValue({ data: MOCK_TAG, error: null })

    await updateTag({ id: 'tag-99', name: 'React' })

    expect(mockNeq).toHaveBeenCalledWith('id', 'tag-99')
  })

  it('performs the name-conflict check case-insensitively', async () => {
    mockUpdateSingle.mockResolvedValue({ data: MOCK_TAG, error: null })

    await updateTag({ id: '1', name: 'react' })

    expect(mockIlike).toHaveBeenCalledWith('name', 'react')
  })

  it('converts the name to kebab-case before updating', async () => {
    mockUpdateSingle.mockResolvedValue({ data: MOCK_TAG, error: null })

    await updateTag({ id: '1', name: 'My React Tag' })

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-react-tag' }))
  })

  it('converts the name to kebab-case before the name-conflict check', async () => {
    mockUpdateSingle.mockResolvedValue({ data: MOCK_TAG, error: null })

    await updateTag({ id: '1', name: 'My React Tag' })

    expect(mockIlike).toHaveBeenCalledWith('name', 'my-react-tag')
  })

  it('returns db_error when the kebab-case name is empty', async () => {
    const result = await updateTag({ id: '1', name: '!!!' })

    expect(result).toEqual({ data: null, error: 'db_error' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns name_taken when another tag has the same name', async () => {
    mockNameCheckMaybeSingle.mockResolvedValue({ data: { id: '99' }, error: null })

    const result = await updateTag({ id: '1', name: 'React' })

    expect(result).toEqual({ data: null, error: 'name_taken' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await updateTag({ id: '1', name: 'React' })

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns db_error on update failure', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await updateTag({ id: '1', name: 'X' })

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

// ── getPrivateTagNames ────────────────────────────────────────────────────────

describe('getPrivateTagNames', () => {
  it('returns names of private tags', async () => {
    mockPrivateNamesEq.mockResolvedValue({ data: [{ name: 'secret' }, { name: 'work' }], error: null })

    const result = await getPrivateTagNames()

    expect(result).toEqual(['secret', 'work'])
  })

  it('queries with is_private = true', async () => {
    mockPrivateNamesEq.mockResolvedValue({ data: [], error: null })

    await getPrivateTagNames()

    expect(mockPrivateNamesEq).toHaveBeenCalledWith('is_private', true)
  })

  it('returns [] when data is null', async () => {
    mockPrivateNamesEq.mockResolvedValue({ data: null, error: null })

    expect(await getPrivateTagNames()).toEqual([])
  })

  it('returns [] on error', async () => {
    mockPrivateNamesEq.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getPrivateTagNames()).toEqual([])
  })

  it('returns an empty array when no private tags exist', async () => {
    mockPrivateNamesEq.mockResolvedValue({ data: [], error: null })

    expect(await getPrivateTagNames()).toEqual([])
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
    mockPrivateTagIdsEq.mockResolvedValue({ data: [], error: null })
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
    mockPrivateTagIdsEq.mockResolvedValue({ data: [{ id: 'tag-private' }], error: null })
    mockLinkTagsIn.mockResolvedValue({ data: [{ link_id: 'link-1' }], error: null })

    await verifyPrivateTagPassword('wrong')

    expect(mockLinksDeleteIn).toHaveBeenCalledWith('id', ['link-1'])
    expect(mockTagsDeleteIn).toHaveBeenCalledWith('id', ['tag-private'])
    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('deduplicates link IDs when a link has multiple private tags', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 4 }, error: null })
    mockPrivateTagIdsEq.mockResolvedValue({ data: [{ id: 'tag-a' }, { id: 'tag-b' }], error: null })
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
    mockPrivateTagIdsEq.mockResolvedValue({ data: [{ id: 'tag-private' }], error: null })
    mockLinkTagsIn.mockResolvedValue({ data: [], error: null })

    await verifyPrivateTagPassword('wrong')

    expect(mockLinksDeleteIn).not.toHaveBeenCalled()
    expect(mockTagsDeleteIn).toHaveBeenCalledWith('id', ['tag-private'])
  })

  it('skips link and tag deletion when there are no private tags', async () => {
    const hash = await makeHash('correct')
    mockSettingsMaybeSingle.mockResolvedValue({ data: { password_hash: hash, failed_attempts: 4 }, error: null })
    // mockPrivateTagIdsEq already returns [] from beforeEach

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
