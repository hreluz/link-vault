'use client'

import { createContext, useContext, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  deriveKek, generateDek, wrapDek, unwrapDek, generateSalt, DEFAULT_KDF_ITERATIONS,
} from '@/lib/crypto/vault'
import { getVaultKeyRow, createVaultKeyRow, updateVaultKeyRow } from '@/lib/services/vault'
import { seedDefaultCategories } from '@/lib/services/categories'
import { seedMockLinks } from '@/lib/services/mockLinks'

const MOCK_DATA_TEST_EMAIL = 'test@linkvault.dev'

export type UnlockStatus = 'created' | 'unlocked' | 'wrong_password' | 'error'
export type UnlockOutcome = { status: UnlockStatus; dek: CryptoKey | null }

type VaultContextType = {
  dek: CryptoKey | null
  isUnlocked: boolean
  unlock: (password: string) => Promise<UnlockOutcome>
  changePassword: (newPassword: string) => Promise<boolean>
  lock: () => void
}

const VaultContext = createContext<VaultContextType>({
  dek: null,
  isUnlocked: false,
  unlock: async () => ({ status: 'error', dek: null }),
  changePassword: async () => false,
  lock: () => {},
})

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [dek, setDek] = useState<CryptoKey | null>(null)

  async function unlock(password: string): Promise<UnlockOutcome> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { status: 'error', dek: null }

    const existing = await getVaultKeyRow(user.id)

    if (!existing) {
      const newDek = await generateDek()
      const salt = generateSalt()
      const kek = await deriveKek(password, salt, DEFAULT_KDF_ITERATIONS)
      const { wrapped, iv } = await wrapDek(newDek, kek)
      const created = await createVaultKeyRow(user.id, {
        salt, wrappedDek: wrapped, wrappedDekIv: iv, kdfIterations: DEFAULT_KDF_ITERATIONS,
      })
      if (!created) return { status: 'error', dek: null }
      await seedDefaultCategories(supabase, user.id, newDek)
      if (user.email === MOCK_DATA_TEST_EMAIL) {
        await seedMockLinks(newDek)
      }
      setDek(newDek)
      return { status: 'created', dek: newDek }
    }

    try {
      const kek = await deriveKek(password, existing.salt, existing.kdf_iterations)
      const unwrapped = await unwrapDek(existing.wrapped_dek, existing.wrapped_dek_iv, kek)
      setDek(unwrapped)
      return { status: 'unlocked', dek: unwrapped }
    } catch {
      return { status: 'wrong_password', dek: null }
    }
  }

  async function changePassword(newPassword: string): Promise<boolean> {
    if (!dek) return false
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const salt = generateSalt()
    const kek = await deriveKek(newPassword, salt, DEFAULT_KDF_ITERATIONS)
    const { wrapped, iv } = await wrapDek(dek, kek)
    return updateVaultKeyRow(user.id, { salt, wrappedDek: wrapped, wrappedDekIv: iv })
  }

  function lock() {
    setDek(null)
  }

  return (
    <VaultContext.Provider value={{ dek, isUnlocked: dek !== null, unlock, changePassword, lock }}>
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  return useContext(VaultContext)
}
