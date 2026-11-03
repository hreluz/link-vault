import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signIn, signUp, signOut, confirmSignup, requestAccountRestart } from '@/lib/services/auth'

const {
  mockSignInWithPassword,
  mockSignUp,
  mockSignOut,
  mockVerifyOtp,
  mockResetPasswordForEmail,
  mockIsAdminEmail,
  mockUpdateEq,
  mockUpdate,
  mockFrom,
  mockServerFrom,
  mockCreateAdminClient,
} = vi.hoisted(() => {
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))
  return {
    mockSignInWithPassword: vi.fn(),
    mockSignUp: vi.fn(),
    mockSignOut: vi.fn(),
    mockVerifyOtp: vi.fn(),
    mockResetPasswordForEmail: vi.fn(),
    mockIsAdminEmail: vi.fn().mockReturnValue(false),
    mockUpdateEq,
    mockUpdate,
    mockFrom,
    // The user-session client must never write to `users` (migration 0022).
    mockServerFrom: vi.fn(),
    mockCreateAdminClient: vi.fn(() => ({ from: mockFrom })),
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      verifyOtp: mockVerifyOtp,
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
    from: mockServerFrom,
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock('@/lib/auth/admin', () => ({
  isAdminEmail: mockIsAdminEmail,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateEq.mockResolvedValue({ error: null })
  mockCreateAdminClient.mockImplementation(() => ({ from: mockFrom }))
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

  it('promotes an ADMIN_EMAIL account through the admin client', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: 'admin-uid', email: 'admin@example.com' } },
      error: null,
    })
    mockIsAdminEmail.mockReturnValue(true)

    const result = await confirmSignup('token-abc', 'signup')

    expect(result).toEqual({ success: true })
    expect(mockCreateAdminClient).toHaveBeenCalledOnce()
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockUpdate).toHaveBeenCalledWith({ role: 'admin' })
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'admin-uid')
    expect(mockServerFrom).not.toHaveBeenCalled()
  })

  it('never creates the admin client for any other email', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: 'user-uid', email: 'other@example.com' } },
      error: null,
    })
    mockIsAdminEmail.mockReturnValue(false)

    const result = await confirmSignup('token-abc', 'signup')

    expect(result).toEqual({ success: true })
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockServerFrom).not.toHaveBeenCalled()
  })

  it('does not assign admin role when verifyOtp returns no user', async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: null })
    mockIsAdminEmail.mockReturnValue(true)

    const result = await confirmSignup('token-abc', 'signup')

    expect(result).toEqual({ success: true })
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('still succeeds and logs when the promotion update fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: 'admin-uid', email: 'admin@example.com' } },
      error: null,
    })
    mockIsAdminEmail.mockReturnValue(true)
    mockUpdateEq.mockResolvedValue({ error: { message: 'permission denied for table users' } })

    const result = await confirmSignup('token-abc', 'signup')

    expect(result).toEqual({ success: true })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('still succeeds and logs when the service-role key is missing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: 'admin-uid', email: 'admin@example.com' } },
      error: null,
    })
    mockIsAdminEmail.mockReturnValue(true)
    mockCreateAdminClient.mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    })

    const result = await confirmSignup('token-abc', 'signup')

    expect(result).toEqual({ success: true })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('requestAccountRestart', () => {
  it('returns success when the reset email is sent', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    const result = await requestAccountRestart('user@example.com')

    expect(result).toEqual({ success: true })
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com')
  })

  it('returns the error message when the request fails', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'Email rate limit exceeded' },
    })

    const result = await requestAccountRestart('user@example.com')

    expect(result).toEqual({ success: false, error: 'Email rate limit exceeded' })
  })
})
