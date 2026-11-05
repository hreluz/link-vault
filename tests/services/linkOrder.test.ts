import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { clearAllMovedToEnd } from '@/lib/services/linkOrder'

function makeClient(result: { data: { id: string }[] | null; error: { message: string } | null }, user: { id: string } | null = { id: 'user-1' }) {
  const mockSelect = vi.fn().mockResolvedValue(result)
  const mockNot = vi.fn(() => ({ select: mockSelect }))
  const mockEq = vi.fn(() => ({ not: mockNot }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: mockFrom,
  } as unknown as SupabaseClient<Database>
  return { client, mockFrom, mockUpdate, mockEq, mockNot, mockSelect }
}

describe('clearAllMovedToEnd', () => {
  it("clears only the current user's moved links and touches only moved_to_end_at", async () => {
    const { client, mockFrom, mockUpdate, mockEq, mockNot, mockSelect } = makeClient({ data: [{ id: 'a' }, { id: 'b' }], error: null })
    const result = await clearAllMovedToEnd(client)

    expect(result).toEqual({ success: true, count: 2 })
    expect(mockFrom).toHaveBeenCalledWith('links')
    expect(mockUpdate).toHaveBeenCalledExactlyOnceWith({ moved_to_end_at: null })
    expect(mockEq).toHaveBeenCalledExactlyOnceWith('user_id', 'user-1')
    expect(mockNot).toHaveBeenCalledExactlyOnceWith('moved_to_end_at', 'is', null)
    expect(mockSelect).toHaveBeenCalledWith('id')
  })

  it('does not filter on deleted_at, so links in Trash are reset too', async () => {
    const { client, mockEq, mockNot } = makeClient({ data: [], error: null })
    await clearAllMovedToEnd(client)
    const columns = [...mockEq.mock.calls, ...mockNot.mock.calls].map(call => (call as unknown[])[0])
    expect(columns).not.toContain('deleted_at')
  })

  it('returns a count of 0 when nothing was moved', async () => {
    const { client } = makeClient({ data: [], error: null })
    expect(await clearAllMovedToEnd(client)).toEqual({ success: true, count: 0 })
  })

  it('returns the DB error', async () => {
    const { client } = makeClient({ data: null, error: { message: 'boom' } })
    expect(await clearAllMovedToEnd(client)).toEqual({ success: false, error: 'boom' })
  })

  it('fails without a user and makes no update', async () => {
    const { client, mockFrom } = makeClient({ data: [], error: null }, null)
    expect(await clearAllMovedToEnd(client)).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
