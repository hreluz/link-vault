import { describe, it, expect, vi } from 'vitest'
import { isRegistrationEnabled, setRegistrationEnabled } from '@/lib/services/appSettings'
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
