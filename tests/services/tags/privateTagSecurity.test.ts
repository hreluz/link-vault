import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setPrivateTagPassword, verifyPrivateTagPassword, getPrivateTagSettings } from '@/lib/services/tags/privateTagSecurity'

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockDeleteEq,
  mockLinkTagsIn,
  mockLinksDeleteIn,
  mockTagsDeleteIn,
  mockPrivateIdsEq,
  mockSettingsMaybeSingle,
  mockSettingsEq,
  mockSettingsUpdateEq,
  mockUpsert,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockDeleteEq = vi.fn()
  const mockLinkTagsIn = vi.fn()
  const mockLinksDeleteIn = vi.fn()
  const mockTagsDeleteIn = vi.fn()
  const mockPrivateIdsEq = vi.fn()

  const mockSettingsMaybeSingle = vi.fn()
  const mockSettingsEq = vi.fn(() => ({ maybeSingle: mockSettingsMaybeSingle }))
  const mockSettingsUpdateEq = vi.fn()
  const mockUpsert = vi.fn()

  return {
    mockGetUser,
    mockDeleteEq,
    mockLinkTagsIn,
    mockLinksDeleteIn,
    mockTagsDeleteIn,
    mockPrivateIdsEq,
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
        select: vi.fn(() => ({ in: mockLinkTagsIn })),
      }
      if (table === 'links') return {
        delete: vi.fn(() => ({ in: mockLinksDeleteIn })),
      }
      if (table === 'private_tag_settings') return {
        select: vi.fn(() => ({ eq: mockSettingsEq })),
        upsert: mockUpsert,
        update: vi.fn(() => ({ eq: mockSettingsUpdateEq })),
        delete: vi.fn(() => ({ eq: mockDeleteEq })),
      }
      // tags (default) — nukeAllData's `.select('id').eq('user_id', ...).eq('is_private', true)`
      return {
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: unknown) => {
            if (field === 'user_id') return { eq: mockPrivateIdsEq }
            return mockPrivateIdsEq(field, value)
          }),
        })),
        delete: vi.fn(() => ({ in: mockTagsDeleteIn })),
      }
    }),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
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
