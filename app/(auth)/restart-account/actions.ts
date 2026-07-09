'use server'

import { requestAccountRestart } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/server'
import { isRestartAccountEnabled } from '@/lib/services/appSettings'

export type RestartAccountState = { success?: boolean; error?: string } | null

export async function restartAccountAction(
  _prev: RestartAccountState,
  formData: FormData
): Promise<RestartAccountState> {
  const supabase = await createClient()
  const enabled = await isRestartAccountEnabled(supabase)
  if (!enabled) return { error: 'Account restart is currently disabled.' }

  const email = formData.get('email') as string

  // Always report success, regardless of whether the email exists or the
  // Supabase call errored, to avoid leaking which emails have accounts.
  await requestAccountRestart(email)

  return { success: true }
}
