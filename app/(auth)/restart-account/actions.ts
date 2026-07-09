'use server'

import { requestAccountRestart } from '@/lib/services/auth'

export type RestartAccountState = { success?: boolean } | null

export async function restartAccountAction(
  _prev: RestartAccountState,
  formData: FormData
): Promise<RestartAccountState> {
  const email = formData.get('email') as string

  // Always report success, regardless of whether the email exists or the
  // Supabase call errored, to avoid leaking which emails have accounts.
  await requestAccountRestart(email)

  return { success: true }
}
