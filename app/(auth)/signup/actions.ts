'use server'

import { signUp } from '@/lib/services/auth'

export type SignupState = { error?: string; success?: boolean } | null

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const result = await signUp(email, password)
  if (!result.success) return { error: result.error }

  return { success: true }
}
