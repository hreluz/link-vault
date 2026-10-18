import { describe, it, expect, vi } from 'vitest'
import {
  isRegistrationEnabled,
  setRegistrationEnabled,
  isRestartAccountEnabled,
  setRestartAccountEnabled,
  getImportFetchSettings,
  setImportFetchSettings,
  validateImportFetchSettings,
  DEFAULT_IMPORT_FETCH_SETTINGS,
} from '@/lib/services/appSettings'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

function makeClient(maybeSingleResult: object, updateResult?: object) {
  const mockUpdateEq = vi.fn().mockResolvedValue(updateResult ?? { error: null })
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
  const mockMaybeSingle = vi.fn().mockResolvedValue(maybeSingleResult)
  const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
  const mockSelect = vi.fn(() => ({ limit: mockLimit }))
  const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
  return {
    client: { from: mockFrom } as unknown as SupabaseClient<Database>,
    mockFrom,
    mockUpdate,
    mockUpdateEq,
  }
}

describe('isRegistrationEnabled', () => {
  it('returns true when registrations_enabled is true', async () => {
    const { client } = makeClient({ data: { registrations_enabled: true }, error: null })
    expect(await isRegistrationEnabled(client)).toBe(true)
  })

  it('returns false when registrations_enabled is false', async () => {
    const { client } = makeClient({ data: { registrations_enabled: false }, error: null })
    expect(await isRegistrationEnabled(client)).toBe(false)
  })

  it('fails open (returns true) on DB error', async () => {
    const { client } = makeClient({ data: null, error: { message: 'connection timeout' } })
    expect(await isRegistrationEnabled(client)).toBe(true)
  })

  it('fails open (returns true) when no row exists', async () => {
    const { client } = makeClient({ data: null, error: null })
    expect(await isRegistrationEnabled(client)).toBe(true)
  })
})

describe('setRegistrationEnabled', () => {
  it('returns success when row exists and update succeeds', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
    const mockMaybySingle = vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null })
    const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybySingle }))
    const mockSelect = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
    const client = { from: mockFrom } as unknown as SupabaseClient<Database>

    const result = await setRegistrationEnabled(client, false)

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ registrations_enabled: false }))
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'row-1')
  })

  it('returns error when settings row is not found', async () => {
    const mockMaybySingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybySingle }))
    const mockSelect = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ select: mockSelect }))
    const client = { from: mockFrom } as unknown as SupabaseClient<Database>

    const result = await setRegistrationEnabled(client, true)

    expect(result).toEqual({ success: false, error: 'App settings not found' })
  })

  it('returns error when fetch returns a DB error', async () => {
    const mockMaybySingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybySingle }))
    const mockSelect = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ select: mockSelect }))
    const client = { from: mockFrom } as unknown as SupabaseClient<Database>

    const result = await setRegistrationEnabled(client, true)

    expect(result).toEqual({ success: false, error: 'App settings not found' })
  })

  it('returns error when update fails', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: { message: 'update failed' } })
    const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
    const mockMaybySingle = vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null })
    const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybySingle }))
    const mockSelect = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
    const client = { from: mockFrom } as unknown as SupabaseClient<Database>

    const result = await setRegistrationEnabled(client, true)

    expect(result).toEqual({ success: false, error: 'update failed' })
  })
})

describe('isRestartAccountEnabled', () => {
  it('returns true when restart_account_enabled is true', async () => {
    const { client } = makeClient({ data: { restart_account_enabled: true }, error: null })
    expect(await isRestartAccountEnabled(client)).toBe(true)
  })

  it('returns false when restart_account_enabled is false', async () => {
    const { client } = makeClient({ data: { restart_account_enabled: false }, error: null })
    expect(await isRestartAccountEnabled(client)).toBe(false)
  })

  it('fails open (returns true) on DB error', async () => {
    const { client } = makeClient({ data: null, error: { message: 'connection timeout' } })
    expect(await isRestartAccountEnabled(client)).toBe(true)
  })

  it('fails open (returns true) when no row exists', async () => {
    const { client } = makeClient({ data: null, error: null })
    expect(await isRestartAccountEnabled(client)).toBe(true)
  })
})

describe('setRestartAccountEnabled', () => {
  it('returns success when row exists and update succeeds', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
    const mockMaybySingle = vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null })
    const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybySingle }))
    const mockSelect = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
    const client = { from: mockFrom } as unknown as SupabaseClient<Database>

    const result = await setRestartAccountEnabled(client, false)

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ restart_account_enabled: false }))
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'row-1')
  })

  it('returns error when settings row is not found', async () => {
    const mockMaybySingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybySingle }))
    const mockSelect = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ select: mockSelect }))
    const client = { from: mockFrom } as unknown as SupabaseClient<Database>

    const result = await setRestartAccountEnabled(client, true)

    expect(result).toEqual({ success: false, error: 'App settings not found' })
  })

  it('returns error when fetch returns a DB error', async () => {
    const mockMaybySingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybySingle }))
    const mockSelect = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ select: mockSelect }))
    const client = { from: mockFrom } as unknown as SupabaseClient<Database>

    const result = await setRestartAccountEnabled(client, true)

    expect(result).toEqual({ success: false, error: 'App settings not found' })
  })

  it('returns error when update fails', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: { message: 'update failed' } })
    const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
    const mockMaybySingle = vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null })
    const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybySingle }))
    const mockSelect = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
    const client = { from: mockFrom } as unknown as SupabaseClient<Database>

    const result = await setRestartAccountEnabled(client, true)

    expect(result).toEqual({ success: false, error: 'update failed' })
  })
})

describe('getImportFetchSettings', () => {
  it('maps the columns', async () => {
    const { client } = makeClient({
      data: { import_fetch_gap_seconds: 5, import_retry_wait_seconds: 30, import_empty_streak_limit: 2 },
      error: null,
    })
    expect(await getImportFetchSettings(client)).toEqual({ fetchGapSeconds: 5, retryWaitSeconds: 30, emptyStreakLimit: 2 })
  })

  it('returns the defaults on DB error', async () => {
    const { client } = makeClient({ data: null, error: { message: 'connection timeout' } })
    expect(await getImportFetchSettings(client)).toEqual(DEFAULT_IMPORT_FETCH_SETTINGS)
  })

  it('returns the defaults when no row exists', async () => {
    const { client } = makeClient({ data: null, error: null })
    expect(await getImportFetchSettings(client)).toEqual(DEFAULT_IMPORT_FETCH_SETTINGS)
  })
})

describe('validateImportFetchSettings', () => {
  const valid = DEFAULT_IMPORT_FETCH_SETTINGS

  it('accepts the defaults and the range boundaries', () => {
    expect(validateImportFetchSettings(valid)).toBeNull()
    expect(validateImportFetchSettings({ fetchGapSeconds: 0, retryWaitSeconds: 10, emptyStreakLimit: 1 })).toBeNull()
    expect(validateImportFetchSettings({ fetchGapSeconds: 30, retryWaitSeconds: 600, emptyStreakLimit: 10 })).toBeNull()
  })

  it.each([
    ['gap 31', { ...valid, fetchGapSeconds: 31 }, 'Same-host gap'],
    ['gap -1', { ...valid, fetchGapSeconds: -1 }, 'Same-host gap'],
    ['gap 2.5', { ...valid, fetchGapSeconds: 2.5 }, 'Same-host gap'],
    ['gap NaN', { ...valid, fetchGapSeconds: NaN }, 'Same-host gap'],
    ['wait 5', { ...valid, retryWaitSeconds: 5 }, 'Retry wait'],
    ['wait 601', { ...valid, retryWaitSeconds: 601 }, 'Retry wait'],
    ['streak 0', { ...valid, emptyStreakLimit: 0 }, 'Empty-fetch limit'],
    ['streak 11', { ...valid, emptyStreakLimit: 11 }, 'Empty-fetch limit'],
  ])('rejects %s', (_label, settings, field) => {
    expect(validateImportFetchSettings(settings)).toMatch(field)
  })
})

describe('setImportFetchSettings', () => {
  it('writes the three columns plus updated_at', async () => {
    const { client, mockUpdate, mockUpdateEq } = makeClient({ data: { id: 'row-1' }, error: null })

    const result = await setImportFetchSettings(client, { fetchGapSeconds: 5, retryWaitSeconds: 30, emptyStreakLimit: 2 })

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({
      import_fetch_gap_seconds: 5,
      import_retry_wait_seconds: 30,
      import_empty_streak_limit: 2,
      updated_at: expect.any(String),
    })
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'row-1')
  })

  it('rejects invalid values without touching the DB', async () => {
    const { client, mockFrom } = makeClient({ data: { id: 'row-1' }, error: null })

    const result = await setImportFetchSettings(client, { ...DEFAULT_IMPORT_FETCH_SETTINGS, fetchGapSeconds: 31 })

    expect(result).toEqual({ success: false, error: expect.stringMatching('Same-host gap') })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error when settings row is not found', async () => {
    const { client } = makeClient({ data: null, error: null })
    expect(await setImportFetchSettings(client, DEFAULT_IMPORT_FETCH_SETTINGS))
      .toEqual({ success: false, error: 'App settings not found' })
  })

  it('returns error when update fails', async () => {
    const { client } = makeClient({ data: { id: 'row-1' }, error: null }, { error: { message: 'violates check constraint' } })
    expect(await setImportFetchSettings(client, DEFAULT_IMPORT_FETCH_SETTINGS))
      .toEqual({ success: false, error: 'violates check constraint' })
  })
})
