import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_MOVE_TO_END_DELAY_SECONDS,
  getMoveToEndDelay,
  setMoveToEndDelay,
  validateMoveToEndDelay,
} from '@/lib/services/userPreferences'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

function makeClient({
  user = { id: 'user-1' } as { id: string } | null,
  read = { data: { move_to_end_delay_seconds: 45 }, error: null } as object,
  write = { error: null } as object,
} = {}) {
  const eqUpdate = vi.fn().mockResolvedValue(write)
  const update = vi.fn(() => ({ eq: eqUpdate }))
  const single = vi.fn().mockResolvedValue(read)
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ single })) }))
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn(() => ({ select, update })),
  } as unknown as SupabaseClient<Database>
  return { client, update, eqUpdate }
}

describe('validateMoveToEndDelay', () => {
  it('accepts the limits', () => {
    expect(validateMoveToEndDelay(5)).toBeNull()
    expect(validateMoveToEndDelay(600)).toBeNull()
  })

  it.each([4, 601, 30.5, NaN])('rejects %s', value => {
    expect(validateMoveToEndDelay(value)).toMatch(/whole number from 5 to 600/)
  })
})

describe('getMoveToEndDelay', () => {
  it('returns the saved value', async () => {
    expect(await getMoveToEndDelay(makeClient().client)).toBe(45)
  })

  it('returns the default on a read error', async () => {
    const { client } = makeClient({ read: { data: null, error: { message: 'boom' } } })
    expect(await getMoveToEndDelay(client)).toBe(DEFAULT_MOVE_TO_END_DELAY_SECONDS)
  })

  it('returns the default with no user', async () => {
    const { client } = makeClient({ user: null })
    expect(await getMoveToEndDelay(client)).toBe(30)
  })
})

describe('setMoveToEndDelay', () => {
  it('saves a valid value on the current user only', async () => {
    const { client, update, eqUpdate } = makeClient()
    expect(await setMoveToEndDelay(client, 45)).toEqual({ success: true })
    expect(update).toHaveBeenCalledWith({ move_to_end_delay_seconds: 45 })
    expect(eqUpdate).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('does not write an invalid value', async () => {
    const { client, update } = makeClient()
    const result = await setMoveToEndDelay(client, 601)
    expect(result.success).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('reports a failed write', async () => {
    const { client } = makeClient({ write: { error: { message: 'boom' } } })
    expect(await setMoveToEndDelay(client, 45)).toEqual({ success: false, error: 'boom' })
  })

  it('fails when not authenticated', async () => {
    const { client, update } = makeClient({ user: null })
    expect(await setMoveToEndDelay(client, 45)).toEqual({ success: false, error: 'Not authenticated' })
    expect(update).not.toHaveBeenCalled()
  })
})
