import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signIn, signUp, signOut } from '@/lib/services/auth'

const { mockSignInWithPassword, mockSignUp, mockSignOut } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignOut: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signIn', () => {
  it('returns success when credentials are valid', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const result = await signIn('user@example.com', 'password123')

    expect(result).toEqual({ success: true })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('returns the error message when credentials are invalid', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    const result = await signIn('user@example.com', 'wrong')

    expect(result).toEqual({ success: false, error: 'Invalid login credentials' })
  })
})

describe('signUp', () => {
  it('returns success when registration succeeds', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    const result = await signUp('new@example.com', 'password123')

    expect(result).toEqual({ success: true })
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
    })
  })

  it('returns the error message when registration fails', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'User already registered' },
    })

    const result = await signUp('existing@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'User already registered' })
  })
})

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    mockSignOut.mockResolvedValue({})

    await signOut()

    expect(mockSignOut).toHaveBeenCalledOnce()
  })
})
