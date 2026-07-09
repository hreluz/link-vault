'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { wipeVaultData } from '@/lib/services/vault'
import { useVault } from '@/lib/context/VaultContext'

export function useRestartAccount() {
  const router = useRouter()
  const { unlock } = useVault()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function mutate(newPassword: string) {
    setIsPending(true)
    setError(null)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsPending(false)
      setError('Your restart link has expired. Please request a new one.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      setIsPending(false)
      setError(updateError.message)
      return
    }

    const wiped = await wipeVaultData(user.id)
    if (!wiped) {
      setIsPending(false)
      setError('Password updated, but your old data could not be cleared. Please try again.')
      return
    }

    const { status, dek } = await unlock(newPassword)
    setIsPending(false)
    if (status === 'error' || !dek) {
      setError('Account restarted, but the vault could not be initialized. Please try logging in again.')
      return
    }

    router.push('/dashboard')
  }

  return { mutate, isPending, error }
}
