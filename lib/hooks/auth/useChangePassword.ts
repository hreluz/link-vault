'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { changePassword } from '@/lib/services/password'
import { useVault } from '@/lib/context/VaultContext'

export function useChangePassword() {
  const { changePassword: rewrapVaultKey } = useVault()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function mutate(currentPassword: string, newPassword: string) {
    setIsPending(true)
    setError(null)
    const supabase = createClient()
    const result = await changePassword(supabase, currentPassword, newPassword)

    if (!result.success) {
      setIsPending(false)
      setError(result.error)
      return
    }

    // The Auth password already changed at this point -- re-wrap the vault
    // key under it so it can still be unlocked next login (see ENCRYPTION.md).
    const rewrapped = await rewrapVaultKey(newPassword)
    setIsPending(false)
    if (!rewrapped) {
      setError('Password updated, but your vault key could not be re-secured. Please try again immediately.')
      return
    }
    setIsSuccess(true)
  }

  return { mutate, isPending, error, isSuccess }
}
