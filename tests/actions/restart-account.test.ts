import { describe, it, expect, vi, beforeEach } from 'vitest'
import { restartAccountAction } from '@/app/(auth)/restart-account/actions'

const { mockRequestAccountRestart, mockIsRestartAccountEnabled, mockCreateClient } = vi.hoisted(() => ({
  mockRequestAccountRestart: vi.fn(),
  mockIsRestartAccountEnabled: vi.fn(),
  mockCreateClient: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/services/auth', () => ({ requestAccountRestart: mockRequestAccountRestart }))
vi.mock('@/lib/services/appSettings', () => ({ isRestartAccountEnabled: mockIsRestartAccountEnabled }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockResolvedValue({})
  mockIsRestartAccountEnabled.mockResolvedValue(true)
})

function makeFormData(email: string) {
  const fd = new FormData()
  fd.append('email', email)
  return fd
}

describe('restartAccountAction', () => {
  it('calls requestAccountRestart with the submitted email', async () => {
    mockRequestAccountRestart.mockResolvedValue({ success: true })

    await restartAccountAction(null, makeFormData('user@example.com'))

    expect(mockRequestAccountRestart).toHaveBeenCalledWith('user@example.com')
  })

  it('returns success when the request succeeds', async () => {
    mockRequestAccountRestart.mockResolvedValue({ success: true })

    const result = await restartAccountAction(null, makeFormData('user@example.com'))

    expect(result).toEqual({ success: true })
  })

  it('still returns success when the email does not correspond to an account, to avoid leaking existence', async () => {
    mockRequestAccountRestart.mockResolvedValue({ success: false, error: 'User not found' })

    const result = await restartAccountAction(null, makeFormData('nobody@example.com'))

    expect(result).toEqual({ success: true })
  })

  it('returns error and skips requestAccountRestart when restart-account is disabled', async () => {
    mockIsRestartAccountEnabled.mockResolvedValue(false)

    const result = await restartAccountAction(null, makeFormData('user@example.com'))

    expect(result).toEqual({ error: 'Account restart is currently disabled.' })
    expect(mockRequestAccountRestart).not.toHaveBeenCalled()
  })
})
