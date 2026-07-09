// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRestartAccount } from '@/lib/hooks/auth/useRestartAccount'

const mockGetUser = vi.hoisted(() => vi.fn())
const mockUpdateUser = vi.hoisted(() => vi.fn())
const mockCreateClient = vi.hoisted(() => vi.fn(() => ({
  auth: { getUser: mockGetUser, updateUser: mockUpdateUser },
})))
const mockWipeVaultData = vi.hoisted(() => vi.fn())
const mockUnlock = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/client', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/services/vault', () => ({ wipeVaultData: mockWipeVaultData }))
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: null, isUnlocked: false, unlock: mockUnlock, changePassword: vi.fn(), lock: vi.fn() }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  mockUpdateUser.mockResolvedValue({ error: null })
  mockWipeVaultData.mockResolvedValue(true)
  mockUnlock.mockResolvedValue({ status: 'created', dek: {} })
})

describe('useRestartAccount', () => {
  it('starts with default state', () => {
    const { result } = renderHook(() => useRestartAccount())

    expect(result.current.isPending).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets isPending true while the request is in flight', async () => {
    let resolve: (v: { error: null }) => void
    mockUpdateUser.mockReturnValue(new Promise(r => { resolve = r }))

    const { result } = renderHook(() => useRestartAccount())

    act(() => { result.current.mutate('new-password') })

    expect(result.current.isPending).toBe(true)

    await act(async () => { resolve!({ error: null }) })
  })

  it('errors without calling updateUser when the recovery session has expired', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useRestartAccount())

    await act(async () => { await result.current.mutate('new-password') })

    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(result.current.error).toBeTruthy()
  })

  it('sets the error and stops without wiping data when updateUser fails', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Password too short' } })

    const { result } = renderHook(() => useRestartAccount())

    await act(async () => { await result.current.mutate('new-password') })

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'new-password' })
    expect(mockWipeVaultData).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Password too short')
  })

  it('wipes the vault for the current user after the password update succeeds', async () => {
    const { result } = renderHook(() => useRestartAccount())

    await act(async () => { await result.current.mutate('new-password') })

    expect(mockWipeVaultData).toHaveBeenCalledWith('u1')
  })

  it('sets an error and does not unlock when wiping the vault fails', async () => {
    mockWipeVaultData.mockResolvedValue(false)

    const { result } = renderHook(() => useRestartAccount())

    await act(async () => { await result.current.mutate('new-password') })

    expect(mockUnlock).not.toHaveBeenCalled()
    expect(result.current.error).toBeTruthy()
  })

  it('unlocks the vault with the new password and redirects to /dashboard on full success', async () => {
    const { result } = renderHook(() => useRestartAccount())

    await act(async () => { await result.current.mutate('new-password') })

    expect(mockUnlock).toHaveBeenCalledWith('new-password')
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
    expect(result.current.error).toBeNull()
  })

  it('sets an error and does not redirect when unlock fails to produce a dek', async () => {
    mockUnlock.mockResolvedValue({ status: 'error', dek: null })

    const { result } = renderHook(() => useRestartAccount())

    await act(async () => { await result.current.mutate('new-password') })

    expect(mockPush).not.toHaveBeenCalled()
    expect(result.current.error).toBeTruthy()
  })

  it('clears isPending after completion', async () => {
    const { result } = renderHook(() => useRestartAccount())

    await act(async () => { await result.current.mutate('new-password') })

    expect(result.current.isPending).toBe(false)
  })
})
