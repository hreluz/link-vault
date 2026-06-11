'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { changePassword } from '@/lib/services/password'

export function useChangePassword() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function mutate(currentPassword: string, newPassword: string) {
    setIsPending(true)
    setError(null)
    const supabase = createClient()
    const result = await changePassword(supabase, currentPassword, newPassword)
    setIsPending(false)
    if (!result.success) {
      setError(result.error)
    } else {
      setIsSuccess(true)
    }
  }

  return { mutate, isPending, error, isSuccess }
}
