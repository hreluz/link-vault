import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signupAction } from '@/app/(auth)/signup/actions'

const { mockSignUp } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
}))

vi.mock('@/lib/services/auth', () => ({ signUp: mockSignUp }))

beforeEach(() => {
  vi.clearAllMocks()
})

function makeFormData(email: string, password: string) {
  const fd = new FormData()
  fd.append('email', email)
  fd.append('password', password)
  return fd
}

describe('signupAction', () => {
  it('returns success state on successful registration', async () => {
    mockSignUp.mockResolvedValue({ success: true })

    const result = await signupAction(null, makeFormData('new@example.com', 'password123'))

    expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123')
    expect(result).toEqual({ success: true })
  })

  it('returns error state when registration fails', async () => {
    mockSignUp.mockResolvedValue({ success: false, error: 'User already registered' })

    const result = await signupAction(null, makeFormData('existing@example.com', 'password123'))

    expect(result).toEqual({ error: 'User already registered' })
  })
})
