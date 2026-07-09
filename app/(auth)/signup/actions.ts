'use server'

import { signUp } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/server'
import { isRegistrationEnabled } from '@/lib/services/appSettings'

export type SignupState = { error?: string; success?: boolean } | null

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const supabase = await createClient()
  const enabled = await isRegistrationEnabled(supabase)
  if (!enabled) return { error: 'New account registration is currently disabled.' }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) return { error: 'Passwords do not match.' }

  const result = await signUp(email, password)
  if (!result.success) return { error: result.error }

  return { success: true }
}
