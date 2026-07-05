'use server'

import { signIn } from '@/lib/services/auth'

export type LoginState = { error?: string; success?: boolean } | null

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const result = await signIn(email, password)
  if (!result.success) return { error: result.error }

  return { success: true }
}
