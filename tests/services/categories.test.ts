import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { getCategories, createCategory, updateCategory, deleteCategory, getCategoryLinksCount, seedDefaultCategories, SEED_CATEGORIES, PROTECTED_CATEGORY_NAME } from '@/lib/services/categories'
import { generateDek, encryptJson, decryptJson } from '@/lib/crypto/vault'

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockCategoriesSelect,
  mockInsert, mockInsertSingle,
  mockUpdate, mockUpdateEq, mockUpdateSingle,
  mockDeleteEq,
  mockLinksCountEq,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockCategoriesSelect = vi.fn()

  const mockInsertSingle = vi.fn()
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

  const mockUpdateSingle = vi.fn()
  const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
  const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

  const mockDeleteEq = vi.fn()
  const mockLinksCountEq = vi.fn()

  return {
    mockGetUser,
    mockCategoriesSelect,
    mockInsert, mockInsertSingle,
    mockUpdate, mockUpdateEq, mockUpdateSingle,
    mockDeleteEq,
    mockLinksCountEq,
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'links') return { select: vi.fn(() => ({ eq: mockLinksCountEq })) }
      return {
        select: vi.fn(() => mockCategoriesSelect()),
        insert: mockInsert,
        update: mockUpdate,
        delete: vi.fn(() => ({ eq: mockDeleteEq })),
      }
    }),
  })),
}))

// ── helper: injectable mock client for seedDefaultCategories ──────────────────

function makeSeedClient({
  count = 0,
  countError = null,
}: {
  count?: number | null
  countError?: object | null
} = {}) {
  const mockCatInsertSelect = vi.fn().mockImplementation(async (rows: Array<{ user_id: string; enc_payload: string; enc_iv: string }>) => ({
    data: count === 0 ? rows.map((r, i) => ({ ...r, id: `seeded-${i}`, created_at: '', updated_at: '' })) : null,
  }))
  const mockCatInsert = vi.fn((rows: unknown) => ({ select: () => mockCatInsertSelect(rows) }))
  const mockDomainInsert = vi.fn().mockResolvedValue({ error: null })
  const mockEq = vi.fn().mockResolvedValue({ count, error: countError })
  const mockSelectCount = vi.fn().mockReturnValue({ eq: mockEq })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'category_domains') return { insert: mockDomainInsert }
    return { select: mockSelectCount, insert: mockCatInsert }
  })

  return { client: { from } as unknown as ReturnType<typeof import('@/lib/supabase/client').createClient>, mockInsert: mockCatInsert, mockDomainInsert, from }
}

let dek: CryptoKey

beforeAll(async () => {
  dek = await generateDek()
})

async function encryptCategoryRow(id: string, name: string, description: string | null, color: string | null, emoticon: string | null) {
  const { ciphertext, iv } = await encryptJson({ name, description, color, emoticon }, dek)
  return { id, user_id: 'u1', enc_payload: ciphertext, enc_iv: iv, created_at: '', updated_at: '' }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getCategories ─────────────────────────────────────────────────────────────

describe('getCategories', () => {
  it('decrypts and returns categories ordered alphabetically by name', async () => {
    const zebra = await encryptCategoryRow('1', 'Zebra', null, null, null)
    const apple = await encryptCategoryRow('2', 'Apple', null, null, null)
    mockCategoriesSelect.mockResolvedValue({ data: [zebra, apple], error: null })

    const result = await getCategories(dek)

    expect(result.map(c => c.name)).toEqual(['Apple', 'Zebra'])
  })

  it('returns [] on error', async () => {
    mockCategoriesSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    expect(await getCategories(dek)).toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockCategoriesSelect.mockResolvedValue({ data: null, error: null })

    expect(await getCategories(dek)).toEqual([])
  })
})

// ── createCategory ────────────────────────────────────────────────────────────

describe('createCategory', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockCategoriesSelect.mockResolvedValue({ data: [], error: null })
  })

  it('returns the created category on success', async () => {
    const row = await encryptCategoryRow('1', 'Article', 'Blog posts', '#3B82F6', '📄')
    mockInsertSingle.mockResolvedValue({ data: row, error: null })

    const result = await createCategory({ name: 'Article', emoticon: '📄', color: '#3B82F6' }, dek)

    expect(result.data?.name).toBe('Article')
    expect(result.error).toBeNull()
  })

  it('encrypts name, emoticon, and color into the insert payload', async () => {
    const row = await encryptCategoryRow('1', 'Article', null, 'indigo', '📄')
    mockInsertSingle.mockResolvedValue({ data: row, error: null })

    await createCategory({ name: 'Article', emoticon: '📄', color: 'indigo' }, dek)

    const call = mockInsert.mock.calls[0][0]
    expect(call.user_id).toBe('u1')
    const decrypted = await decryptJson<{ name: string; color: string | null; emoticon: string | null }>(call.enc_payload, call.enc_iv, dek)
    expect(decrypted).toEqual(expect.objectContaining({ name: 'Article', emoticon: '📄', color: 'indigo' }))
  })

  it('returns name_taken when a category with the same name exists', async () => {
    const existing = await encryptCategoryRow('99', 'Article', null, null, null)
    mockCategoriesSelect.mockResolvedValue({ data: [existing], error: null })

    const result = await createCategory({ name: 'Article' }, dek)

    expect(result).toEqual({ data: null, error: 'name_taken' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('performs the name check case-insensitively', async () => {
    const existing = await encryptCategoryRow('99', 'Article', null, null, null)
    mockCategoriesSelect.mockResolvedValue({ data: [existing], error: null })

    const result = await createCategory({ name: 'article' }, dek)

    expect(result).toEqual({ data: null, error: 'name_taken' })
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createCategory({ name: 'Article' }, dek)

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns db_error on insert failure', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await createCategory({ name: 'Article' }, dek)

    expect(result).toEqual({ data: null, error: 'db_error' })
  })
})

// ── updateCategory ────────────────────────────────────────────────────────────

describe('updateCategory', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockCategoriesSelect.mockResolvedValue({ data: [], error: null })
  })

  it('returns the updated category on success', async () => {
    const row = await encryptCategoryRow('1', 'Updated', null, null, '🆕')
    mockUpdateSingle.mockResolvedValue({ data: row, error: null })

    const result = await updateCategory({ id: '1', name: 'Updated', emoticon: '🆕' }, dek)

    expect(result.data?.name).toBe('Updated')
    expect(result.data?.emoticon).toBe('🆕')
  })

  it('filters by id when updating', async () => {
    const row = await encryptCategoryRow('cat-99', 'X', null, null, null)
    mockUpdateSingle.mockResolvedValue({ data: row, error: null })

    await updateCategory({ id: 'cat-99', name: 'X' }, dek)

    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'cat-99')
  })

  it('excludes the current category from the name-conflict check', async () => {
    const self = await encryptCategoryRow('cat-99', 'Article', null, null, null)
    mockCategoriesSelect.mockResolvedValue({ data: [self], error: null })
    const row = await encryptCategoryRow('cat-99', 'Article', null, null, null)
    mockUpdateSingle.mockResolvedValue({ data: row, error: null })

    const result = await updateCategory({ id: 'cat-99', name: 'Article' }, dek)

    expect(result.error).toBeNull()
  })

  it('performs the name-conflict check case-insensitively', async () => {
    const existing = await encryptCategoryRow('other', 'Article', null, null, null)
    mockCategoriesSelect.mockResolvedValue({ data: [existing], error: null })

    const result = await updateCategory({ id: '1', name: 'article' }, dek)

    expect(result).toEqual({ data: null, error: 'name_taken' })
  })

  it('returns name_taken when another category has the same name', async () => {
    const existing = await encryptCategoryRow('99', 'Article', null, null, null)
    mockCategoriesSelect.mockResolvedValue({ data: [existing], error: null })

    const result = await updateCategory({ id: '1', name: 'Article' }, dek)

    expect(result).toEqual({ data: null, error: 'name_taken' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when there is no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await updateCategory({ id: '1', name: 'Article' }, dek)

    expect(result).toEqual({ data: null, error: 'unauthenticated' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns db_error on update failure', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await updateCategory({ id: '1', name: 'X' }, dek)

    expect(result).toEqual({ data: null, error: 'db_error' })
  })
})

// ── deleteCategory ────────────────────────────────────────────────────────────

describe('deleteCategory', () => {
  it('returns true when the delete succeeds', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    expect(await deleteCategory('cat-1')).toBe(true)
  })

  it('filters by id', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    await deleteCategory('cat-42')

    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'cat-42')
  })

  it('returns false on DB error', async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: 'DB error' } })

    expect(await deleteCategory('cat-1')).toBe(false)
  })
})

// ── getCategoryLinksCount ─────────────────────────────────────────────────────

describe('getCategoryLinksCount', () => {
  it('returns the count when links exist', async () => {
    mockLinksCountEq.mockResolvedValue({ count: 5 })

    expect(await getCategoryLinksCount('cat-1')).toBe(5)
  })

  it('returns 0 when no links exist', async () => {
    mockLinksCountEq.mockResolvedValue({ count: 0 })

    expect(await getCategoryLinksCount('cat-1')).toBe(0)
  })

  it('returns 0 when count is null', async () => {
    mockLinksCountEq.mockResolvedValue({ count: null })

    expect(await getCategoryLinksCount('cat-1')).toBe(0)
  })

  it('filters by category_id', async () => {
    mockLinksCountEq.mockResolvedValue({ count: 0 })

    await getCategoryLinksCount('cat-42')

    expect(mockLinksCountEq).toHaveBeenCalledWith('category_id', 'cat-42')
  })
})

// ── seedDefaultCategories ─────────────────────────────────────────────────────

describe('seedDefaultCategories', () => {
  it('inserts all default categories when the user has none', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123', dek)

    expect(mockInsertSeed).toHaveBeenCalledOnce()
    const [inserted] = mockInsertSeed.mock.calls[0]
    expect(inserted.every((r: { user_id: string }) => r.user_id === 'user-123')).toBe(true)
    const decrypted = await Promise.all(
      inserted.map((r: { enc_payload: string; enc_iv: string }) => decryptJson(r.enc_payload, r.enc_iv, dek)),
    )
    expect(decrypted).toEqual(SEED_CATEGORIES)
  })

  it('skips insertion when the user already has categories', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 3 })

    await seedDefaultCategories(client, 'user-123', dek)

    expect(mockInsertSeed).not.toHaveBeenCalled()
  })

  it('skips insertion when the count query fails', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: null, countError: { message: 'error' } })

    await seedDefaultCategories(client, 'user-123', dek)

    expect(mockInsertSeed).not.toHaveBeenCalled()
  })

  it('inserts exactly 9 categories', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123', dek)

    const [inserted] = mockInsertSeed.mock.calls[0]
    expect(inserted).toHaveLength(9)
  })

  it('includes the protected "Not defined" category', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123', dek)

    const [inserted] = mockInsertSeed.mock.calls[0]
    const decrypted = await Promise.all(
      inserted.map((r: { enc_payload: string; enc_iv: string }) => decryptJson<{ name: string }>(r.enc_payload, r.enc_iv, dek)),
    )
    expect(decrypted.some(c => c.name === PROTECTED_CATEGORY_NAME)).toBe(true)
  })

  it('sets user_id on every inserted category', async () => {
    const { client, mockInsert: mockInsertSeed } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-abc', dek)

    const [inserted] = mockInsertSeed.mock.calls[0]
    expect(inserted.every((c: { user_id: string }) => c.user_id === 'user-abc')).toBe(true)
  })

  it('inserts domain rows for the seeded categories', async () => {
    const { client, mockDomainInsert } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-123', dek)

    expect(mockDomainInsert).toHaveBeenCalledOnce()
    const [domainRows] = mockDomainInsert.mock.calls[0]
    const domains = await Promise.all(
      domainRows.map((r: { enc_payload: string; enc_iv: string }) => decryptJson<{ domain: string }>(r.enc_payload, r.enc_iv, dek)),
    )
    expect(domains.map(d => d.domain)).toEqual(expect.arrayContaining(['youtube.com', 'youtu.be', 'instagram.com', 'tiktok.com', 'vm.tiktok.com', 'twitter.com', 'x.com', 't.co', 'github.com']))
  })

  it('sets user_id on every inserted domain row', async () => {
    const { client, mockDomainInsert } = makeSeedClient({ count: 0 })

    await seedDefaultCategories(client, 'user-abc', dek)

    const [domainRows] = mockDomainInsert.mock.calls[0]
    expect(domainRows.every((r: { user_id: string }) => r.user_id === 'user-abc')).toBe(true)
  })

  it('does not insert domain rows when seeding is skipped', async () => {
    const { client, mockDomainInsert } = makeSeedClient({ count: 3 })

    await seedDefaultCategories(client, 'user-123', dek)

    expect(mockDomainInsert).not.toHaveBeenCalled()
  })
})
