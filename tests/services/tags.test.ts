import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTags, createTag, updateTag, deleteTag, getTagLinksCount, toKebabCase, getPrivateTagNames, verifyTagPassword } from '@/lib/services/tags'
import type { Tag } from '@/lib/services/tags'

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockOrder,
  mockNameCheckMaybeSingle,
  mockIlike,
  mockNeq,
  mockNameCheckEq,
  mockInsert, mockInsertSingle,
  mockUpdate, mockUpdateEq, mockUpdateSingle,
  mockDeleteEq,
  mockLinkTagsCountEq,
  mockPrivateNamesEq,
  mockVerifyMaybeSingle,
  mockVerifyEq,
} = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockGetUser = vi.fn()

  const mockNameCheckMaybeSingle = vi.fn()
  const mockNeq = vi.fn(() => ({ maybeSingle: mockNameCheckMaybeSingle }))
  const mockIlike = vi.fn(() => ({ maybeSingle: mockNameCheckMaybeSingle, neq: mockNeq }))
  const mockNameCheckEq = vi.fn(() => ({ ilike: mockIlike }))

  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockUpdateSingle = vi.fn()
  const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
  const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockDeleteEq = vi.fn()
  const mockLinkTagsCountEq = vi.fn()

  const mockPrivateNamesEq = vi.fn()
  const mockVerifyMaybeSingle = vi.fn()
  const mockVerifyEq = vi.fn(() => ({ maybeSingle: mockVerifyMaybeSingle }))

  return {
    mockGetUser,
    mockOrder,
    mockNameCheckMaybeSingle,
    mockIlike,
    mockNeq,
    mockNameCheckEq,
    mockInsert, mockInsertSingle,
    mockUpdate, mockUpdateEq, mockUpdateSingle,
    mockDeleteEq,
    mockLinkTagsCountEq,
    mockPrivateNamesEq,
    mockVerifyMaybeSingle,
    mockVerifyEq,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'link_tags') return { select: vi.fn(() => ({ eq: mockLinkTagsCountEq })) }
      return {
        select: vi.fn((col?: string) => {
          if (col === 'name') return { eq: mockPrivateNamesEq }
          if (col === 'password_hash') return { eq: mockVerifyEq }
          return { order: mockOrder, eq: mockNameCheckEq }
        }),
        insert: mockInsert,
        update: mockUpdate,
        delete: vi.fn(() => ({ eq: mockDeleteEq })),
      }
    }),
  })),
}))

// ── fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TAG: Tag = {
  id: '1', user_id: 'u1', name: 'React', color: 'indigo',
  is_private: false, password_hash: null, created_at: '2026-01-01T00:00:00Z',
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

// ── verifyTagPassword ─────────────────────────────────────────────────────────

describe('verifyTagPassword', () => {
  it('returns true when the password matches the stored hash', async () => {
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode('correct'))
      )
    ).map(b => b.toString(16).padStart(2, '0')).join('')

    mockVerifyMaybeSingle.mockResolvedValue({ data: { password_hash: hash }, error: null })

    expect(await verifyTagPassword('secret', 'correct')).toBe(true)
  })

  it('returns false when the password does not match', async () => {
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode('correct'))
      )
    ).map(b => b.toString(16).padStart(2, '0')).join('')

    mockVerifyMaybeSingle.mockResolvedValue({ data: { password_hash: hash }, error: null })

    expect(await verifyTagPassword('secret', 'wrong')).toBe(false)
  })

  it('returns false when the tag has no password_hash', async () => {
    mockVerifyMaybeSingle.mockResolvedValue({ data: { password_hash: null }, error: null })

    expect(await verifyTagPassword('secret', 'anything')).toBe(false)
  })

  it('returns false when the tag is not found', async () => {
    mockVerifyMaybeSingle.mockResolvedValue({ data: null, error: null })

    expect(await verifyTagPassword('unknown', 'anything')).toBe(false)
  })

  it('queries by tag name', async () => {
    mockVerifyMaybeSingle.mockResolvedValue({ data: null, error: null })

    await verifyTagPassword('my-tag', 'pass')

    expect(mockVerifyEq).toHaveBeenCalledWith('name', 'my-tag')
  })
})
