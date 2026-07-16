import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginAction } from '@/app/(auth)/login/actions'

const { mockSignIn, mockCreateClient, mockGetCurrentUserRole } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockCreateClient: vi.fn().mockResolvedValue({}),
  mockGetCurrentUserRole: vi.fn(),
}))

vi.mock('@/lib/services/auth', () => ({ signIn: mockSignIn }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/services/users', () => ({ getCurrentUserRole: mockGetCurrentUserRole }))

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockResolvedValue({})
  mockGetCurrentUserRole.mockResolvedValue('user')
})

function makeFormData(email: string, password: string) {
  const fd = new FormData()
  fd.append('email', email)
  fd.append('password', password)
  return fd
}

describe('loginAction', () => {
  it('returns success without redirecting -- the client bootstraps the vault key first', async () => {
    mockSignIn.mockResolvedValue({ success: true })

    const result = await loginAction(null, makeFormData('user@example.com', 'password123'))

    expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'password123')
    expect(result).toEqual({ success: true })
  })

  it('returns error state when sign-in fails', async () => {
    mockSignIn.mockResolvedValue({ success: false, error: 'Invalid login credentials' })

    const result = await loginAction(null, makeFormData('user@example.com', 'wrong'))

    expect(result).toEqual({ error: 'Invalid login credentials' })
  })

  it('includes envFlags when the logged-in user is an admin', async () => {
    mockSignIn.mockResolvedValue({ success: true })
    mockGetCurrentUserRole.mockResolvedValue('admin')
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key')
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')

    const result = await loginAction(null, makeFormData('admin@example.com', 'password123'))

    expect(result).toEqual({
      success: true,
      envFlags: { hasYouTubeKey: true, hasAdminEmail: true },
    })

    vi.unstubAllEnvs()
  })

  it('omits envFlags for non-admin users', async () => {
    mockSignIn.mockResolvedValue({ success: true })
    mockGetCurrentUserRole.mockResolvedValue('user')

    const result = await loginAction(null, makeFormData('user@example.com', 'password123'))

    expect(result).toEqual({ success: true })
    expect(result?.envFlags).toBeUndefined()
  })
})
