'use server'

import { redirect } from 'next/navigation'
import { signIn } from '@/lib/services/auth'

export type LoginState = { error?: string } | null

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const result = await signIn(email, password)
  if (!result.success) return { error: result.error }

  redirect('/dashboard')
}
