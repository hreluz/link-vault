import { describe, it, expect, vi } from 'vitest'
import { getCurrentUserRole } from '@/lib/services/users'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

function makeClient(user: object | null, roleRow: object | null) {
  const mockSingle = vi.fn().mockResolvedValue({ data: roleRow })
  const mockEq = vi.fn(() => ({ single: mockSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  const mockGetUser = vi.fn().mockResolvedValue({ data: { user } })
  return {
    client: {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient<Database>,
    mockFrom,
    mockGetUser,
  }
}

describe('getCurrentUserRole', () => {
  it('returns admin role for an authenticated user with role admin', async () => {
    const { client } = makeClient({ id: 'uid-1' }, { role: 'admin' })
    expect(await getCurrentUserRole(client)).toBe('admin')
  })

  it('returns user role for an authenticated user with role user', async () => {
    const { client } = makeClient({ id: 'uid-2' }, { role: 'user' })
    expect(await getCurrentUserRole(client)).toBe('user')
  })

  it('returns null when no authenticated user', async () => {
    const { client, mockFrom } = makeClient(null, null)
    const result = await getCurrentUserRole(client)
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null when user row is not found in users table', async () => {
    const { client } = makeClient({ id: 'uid-3' }, null)
    expect(await getCurrentUserRole(client)).toBeNull()
  })
})
