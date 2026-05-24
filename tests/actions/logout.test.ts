import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logoutAction } from '@/app/dashboard/actions'

const { mockSignOut, mockRedirect } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock('@/lib/services/auth', () => ({ signOut: mockSignOut }))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('logoutAction', () => {
  it('signs out and redirects to /login', async () => {
    mockSignOut.mockResolvedValue(undefined)

    await logoutAction()

    expect(mockSignOut).toHaveBeenCalledOnce()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
