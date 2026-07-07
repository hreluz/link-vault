// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChangePassword } from '@/lib/hooks/auth/useChangePassword'

const mockChangePassword = vi.hoisted(() => vi.fn())
const mockCreateClient = vi.hoisted(() => vi.fn(() => ({})))
const mockRewrapVaultKey = vi.hoisted(() => vi.fn())

vi.mock('@/lib/services/password', () => ({ changePassword: mockChangePassword }))
vi.mock('@/lib/supabase/client', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: {}, isUnlocked: true, unlock: vi.fn(), changePassword: mockRewrapVaultKey, lock: vi.fn() }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockRewrapVaultKey.mockResolvedValue(true)
})

describe('useChangePassword', () => {
  it('starts with default state', () => {
    const { result } = renderHook(() => useChangePassword())

    expect(result.current.isPending).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isSuccess).toBe(false)
  })

  it('sets isPending true while the request is in flight', async () => {
    let resolve: (v: { success: boolean }) => void
    mockChangePassword.mockReturnValue(new Promise(r => { resolve = r }))

    const { result } = renderHook(() => useChangePassword())

    act(() => { result.current.mutate('old', 'new') })

    expect(result.current.isPending).toBe(true)

    await act(async () => { resolve!({ success: true }) })
  })

  it('sets isSuccess and clears error on success', async () => {
    mockChangePassword.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useChangePassword())

    await act(async () => { await result.current.mutate('old', 'new') })

    expect(result.current.isPending).toBe(false)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('sets error and keeps isSuccess false on failure', async () => {
    mockChangePassword.mockResolvedValue({ success: false, error: 'wrong_password' })

    const { result } = renderHook(() => useChangePassword())

    await act(async () => { await result.current.mutate('wrong', 'new') })

    expect(result.current.isPending).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.error).toBe('wrong_password')
  })

  it('sets an error and does not report success when the vault key re-wrap fails, even though the auth password already changed', async () => {
    mockChangePassword.mockResolvedValue({ success: true })
    mockRewrapVaultKey.mockResolvedValue(false)

    const { result } = renderHook(() => useChangePassword())

    await act(async () => { await result.current.mutate('old', 'new') })

    expect(result.current.isSuccess).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('re-wraps the vault key under the new password after the auth password change succeeds', async () => {
    mockChangePassword.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useChangePassword())

    await act(async () => { await result.current.mutate('old', 'new-password') })

    expect(mockRewrapVaultKey).toHaveBeenCalledWith('new-password')
  })

  it('clears error before each new call', async () => {
    mockChangePassword.mockResolvedValueOnce({ success: false, error: 'wrong_password' })
    mockChangePassword.mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useChangePassword())

    await act(async () => { await result.current.mutate('wrong', 'new') })
    expect(result.current.error).toBe('wrong_password')

    await act(async () => { await result.current.mutate('correct', 'new') })
    expect(result.current.error).toBeNull()
    expect(result.current.isSuccess).toBe(true)
  })
})
