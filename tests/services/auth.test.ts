import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signIn, signUp, signOut, confirmSignup } from '@/lib/services/auth'

const {
  mockSignInWithPassword,
  mockSignUp,
  mockSignOut,
  mockVerifyOtp,
  mockIsAdminEmail,
  mockUpdateEq,
  mockUpdate,
  mockFrom,
} = vi.hoisted(() => {
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))
  return {
    mockSignInWithPassword: vi.fn(),
    mockSignUp: vi.fn(),
    mockSignOut: vi.fn(),
    mockVerifyOtp: vi.fn(),
    mockIsAdminEmail: vi.fn().mockReturnValue(false),
    mockUpdateEq,
    mockUpdate,
    mockFrom,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      verifyOtp: mockVerifyOtp,
    },
    from: mockFrom,
  }),
}))

vi.mock('@/lib/auth/admin', () => ({
  isAdminEmail: mockIsAdminEmail,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signIn', () => {
  it('returns success when credentials are valid', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })

    const result = await signIn('user@example.com', 'password123')

    expect(result).toEqual({ success: true })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('returns the error message when credentials are invalid', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const result = await signIn('user@example.com', 'wrong')

    expect(result).toEqual({ success: false, error: 'Invalid login credentials' })
  })
})

describe('signUp', () => {
  it('returns success when registration succeeds', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })

    const result = await signUp('new@example.com', 'password123')

    expect(result).toEqual({ success: true })
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
    })
  })

  it('returns the error message when registration fails', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const result = await signUp('existing@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'User already registered' })
  })

  it('assigns admin role when email matches ADMIN_EMAIL', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'admin-uid' } }, error: null })
    mockIsAdminEmail.mockReturnValue(true)
    mockUpdateEq.mockResolvedValue({ error: null })

    const result = await signUp('admin@example.com', 'password123')

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({ role: 'admin' })
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'admin-uid')
  })

  it('does not assign admin role when email does not match ADMIN_EMAIL', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-uid' } }, error: null })
    mockIsAdminEmail.mockReturnValue(false)

    await signUp('other@example.com', 'password123')

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('does not assign admin role when signUp returns no user', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: null })
    mockIsAdminEmail.mockReturnValue(true)

    const result = await signUp('admin@example.com', 'password123')

    expect(result).toEqual({ success: true })
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    mockSignOut.mockResolvedValue({})

    await signOut()

    expect(mockSignOut).toHaveBeenCalledOnce()
  })
})

describe('confirmSignup', () => {
  it('returns success when the token is valid', async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })

    const result = await confirmSignup('token-abc', 'signup')

    expect(result).toEqual({ success: true })
    expect(mockVerifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'token-abc' })
  })

  it('returns the error message when the token is invalid or expired', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token has expired or is invalid' },
    })

    const result = await confirmSignup('bad-token', 'signup')

    expect(result).toEqual({ success: false, error: 'Token has expired or is invalid' })
  })
})
