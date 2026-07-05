import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginAction } from '@/app/(auth)/login/actions'

const { mockSignIn } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
}))

vi.mock('@/lib/services/auth', () => ({ signIn: mockSignIn }))

beforeEach(() => {
  vi.clearAllMocks()
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
})
