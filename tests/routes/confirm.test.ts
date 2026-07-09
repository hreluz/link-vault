import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET } from '@/app/auth/confirm/route'

const { mockConfirmSignup, mockRedirect } = vi.hoisted(() => ({
  mockConfirmSignup: vi.fn(),
  mockRedirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

vi.mock('@/lib/services/auth', () => ({ confirmSignup: mockConfirmSignup }))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

beforeEach(() => {
  vi.clearAllMocks()
})

function makeRequest(query: string): NextRequest {
  return { url: `http://localhost:3000/auth/confirm${query}` } as unknown as NextRequest
}

describe('GET /auth/confirm', () => {
  it('redirects to /dashboard when the token verifies successfully', async () => {
    mockConfirmSignup.mockResolvedValue({ success: true })

    await expect(GET(makeRequest('?token_hash=abc&type=signup'))).rejects.toThrow('REDIRECT:/dashboard')

    expect(mockConfirmSignup).toHaveBeenCalledWith('abc', 'signup')
  })

  it('redirects to /login?confirmError=1 when the token is invalid or expired', async () => {
    mockConfirmSignup.mockResolvedValue({ success: false, error: 'Token has expired or is invalid' })

    await expect(GET(makeRequest('?token_hash=bad&type=signup'))).rejects.toThrow('REDIRECT:/login?confirmError=1')
  })

  it('redirects to /login?confirmError=1 without calling confirmSignup when token_hash is missing', async () => {
    await expect(GET(makeRequest('?type=signup'))).rejects.toThrow('REDIRECT:/login?confirmError=1')

    expect(mockConfirmSignup).not.toHaveBeenCalled()
  })

  it('redirects to /login?confirmError=1 without calling confirmSignup when type is missing', async () => {
    await expect(GET(makeRequest('?token_hash=abc'))).rejects.toThrow('REDIRECT:/login?confirmError=1')

    expect(mockConfirmSignup).not.toHaveBeenCalled()
  })

  it('redirects to /restart-account/confirm when a recovery token verifies successfully', async () => {
    mockConfirmSignup.mockResolvedValue({ success: true })

    await expect(GET(makeRequest('?token_hash=abc&type=recovery'))).rejects.toThrow('REDIRECT:/restart-account/confirm')

    expect(mockConfirmSignup).toHaveBeenCalledWith('abc', 'recovery')
  })

  it('redirects to /restart-account?confirmError=1 when a recovery token is invalid or expired', async () => {
    mockConfirmSignup.mockResolvedValue({ success: false, error: 'Token has expired or is invalid' })

    await expect(GET(makeRequest('?token_hash=bad&type=recovery'))).rejects.toThrow('REDIRECT:/restart-account?confirmError=1')
  })
})
