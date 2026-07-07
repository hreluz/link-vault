// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { VaultProvider, useVault } from '@/lib/context/VaultContext'
import { generateSalt, deriveKek, generateDek, wrapDek, DEFAULT_KDF_ITERATIONS } from '@/lib/crypto/vault'

const {
  mockGetUser,
  mockGetVaultKeyRow,
  mockCreateVaultKeyRow,
  mockUpdateVaultKeyRow,
  mockSeedDefaultCategories,
  mockSeedMockLinks,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetVaultKeyRow: vi.fn(),
  mockCreateVaultKeyRow: vi.fn(),
  mockUpdateVaultKeyRow: vi.fn(),
  mockSeedDefaultCategories: vi.fn(),
  mockSeedMockLinks: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/services/vault', () => ({
  getVaultKeyRow: mockGetVaultKeyRow,
  createVaultKeyRow: mockCreateVaultKeyRow,
  updateVaultKeyRow: mockUpdateVaultKeyRow,
}))
vi.mock('@/lib/services/categories', () => ({
  seedDefaultCategories: mockSeedDefaultCategories,
}))
vi.mock('@/lib/services/mockLinks', () => ({
  seedMockLinks: mockSeedMockLinks,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <VaultProvider>{children}</VaultProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@example.com' } } })
})

describe('VaultContext.unlock', () => {
  it('creates a new vault key and seeds default categories on first-ever unlock', async () => {
    mockGetVaultKeyRow.mockResolvedValue(null)
    mockCreateVaultKeyRow.mockResolvedValue(true)

    const { result } = renderHook(() => useVault(), { wrapper })

    let outcome: Awaited<ReturnType<typeof result.current.unlock>>
    await act(async () => { outcome = await result.current.unlock('password123') })

    expect(outcome!.status).toBe('created')
    expect(outcome!.dek).not.toBeNull()
    expect(mockCreateVaultKeyRow).toHaveBeenCalledWith('user-1', expect.objectContaining({
      salt: expect.any(String),
      wrappedDek: expect.any(String),
      wrappedDekIv: expect.any(String),
      kdfIterations: DEFAULT_KDF_ITERATIONS,
    }))
    expect(mockSeedDefaultCategories).toHaveBeenCalledWith(expect.anything(), 'user-1', outcome!.dek)
    expect(mockSeedMockLinks).not.toHaveBeenCalled()
    expect(result.current.isUnlocked).toBe(true)
  })

  it('seeds mock links on first-ever unlock for test@linkvault.dev, but not for any other email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@linkvault.dev' } } })
    mockGetVaultKeyRow.mockResolvedValue(null)
    mockCreateVaultKeyRow.mockResolvedValue(true)

    const { result } = renderHook(() => useVault(), { wrapper })

    let outcome: Awaited<ReturnType<typeof result.current.unlock>>
    await act(async () => { outcome = await result.current.unlock('password123') })

    expect(outcome!.status).toBe('created')
    expect(mockSeedMockLinks).toHaveBeenCalledWith(outcome!.dek)
  })

  it('does not create a vault key or seed when creating the row fails', async () => {
    mockGetVaultKeyRow.mockResolvedValue(null)
    mockCreateVaultKeyRow.mockResolvedValue(false)

    const { result } = renderHook(() => useVault(), { wrapper })

    let outcome: Awaited<ReturnType<typeof result.current.unlock>>
    await act(async () => { outcome = await result.current.unlock('password123') })

    expect(outcome!).toEqual({ status: 'error', dek: null })
    expect(mockSeedDefaultCategories).not.toHaveBeenCalled()
    expect(result.current.isUnlocked).toBe(false)
  })

  it('unwraps the existing key and does not re-seed on a later login', async () => {
    const salt = generateSalt()
    const kek = await deriveKek('password123', salt, DEFAULT_KDF_ITERATIONS)
    const dek = await generateDek()
    const { wrapped, iv } = await wrapDek(dek, kek)
    mockGetVaultKeyRow.mockResolvedValue({
      salt, wrapped_dek: wrapped, wrapped_dek_iv: iv, kdf_iterations: DEFAULT_KDF_ITERATIONS,
    })

    const { result } = renderHook(() => useVault(), { wrapper })

    let outcome: Awaited<ReturnType<typeof result.current.unlock>>
    await act(async () => { outcome = await result.current.unlock('password123') })

    expect(outcome!.status).toBe('unlocked')
    expect(outcome!.dek).not.toBeNull()
    expect(mockCreateVaultKeyRow).not.toHaveBeenCalled()
    expect(mockSeedDefaultCategories).not.toHaveBeenCalled()
    expect(result.current.isUnlocked).toBe(true)
  })

  it('returns wrong_password and stays locked when the password does not match', async () => {
    const salt = generateSalt()
    const kek = await deriveKek('correct-password', salt, DEFAULT_KDF_ITERATIONS)
    const dek = await generateDek()
    const { wrapped, iv } = await wrapDek(dek, kek)
    mockGetVaultKeyRow.mockResolvedValue({
      salt, wrapped_dek: wrapped, wrapped_dek_iv: iv, kdf_iterations: DEFAULT_KDF_ITERATIONS,
    })

    const { result } = renderHook(() => useVault(), { wrapper })

    let outcome: Awaited<ReturnType<typeof result.current.unlock>>
    await act(async () => { outcome = await result.current.unlock('wrong-password') })

    expect(outcome!).toEqual({ status: 'wrong_password', dek: null })
    expect(result.current.isUnlocked).toBe(false)
  })

  it('returns error when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useVault(), { wrapper })

    let outcome: Awaited<ReturnType<typeof result.current.unlock>>
    await act(async () => { outcome = await result.current.unlock('password123') })

    expect(outcome!).toEqual({ status: 'error', dek: null })
    expect(mockGetVaultKeyRow).not.toHaveBeenCalled()
  })
})

describe('VaultContext.lock', () => {
  it('clears the in-memory dek', async () => {
    mockGetVaultKeyRow.mockResolvedValue(null)
    mockCreateVaultKeyRow.mockResolvedValue(true)

    const { result } = renderHook(() => useVault(), { wrapper })
    await act(async () => { await result.current.unlock('password123') })
    expect(result.current.isUnlocked).toBe(true)

    act(() => { result.current.lock() })

    expect(result.current.isUnlocked).toBe(false)
    expect(result.current.dek).toBeNull()
  })
})
