import { describe, it, expect, vi } from 'vitest'
import { changePassword } from '@/lib/services/password'

function makeMockSupabase({
  user = { email: 'user@example.com' } as { email: string } | null,
  signInError = null as { message: string } | null,
  updateError = null as { message: string } | null,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: signInError }),
      updateUser: vi.fn().mockResolvedValue({ error: updateError }),
    },
  }
}

describe('changePassword', () => {
  it('returns success when current password is verified and update succeeds', async () => {
    const supabase = makeMockSupabase()

    const result = await changePassword(supabase as any, 'current123', 'newpass123')

    expect(result).toEqual({ success: true })
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'current123',
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' })
  })

  it('returns error when user is not authenticated', async () => {
    const supabase = makeMockSupabase({ user: null })

    const result = await changePassword(supabase as any, 'current123', 'newpass123')

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('returns error when current password is incorrect', async () => {
    const supabase = makeMockSupabase({ signInError: { message: 'Invalid credentials' } })

    const result = await changePassword(supabase as any, 'wrongpass', 'newpass123')

    expect(result).toEqual({ success: false, error: 'Current password is incorrect' })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('returns error when the password update fails', async () => {
    const supabase = makeMockSupabase({ updateError: { message: 'Password too weak' } })

    const result = await changePassword(supabase as any, 'current123', 'weak')

    expect(result).toEqual({ success: false, error: 'Password too weak' })
  })
})
