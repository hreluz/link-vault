'use server'

import { signIn } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/lib/services/users'

export type LoginState =
  | { error?: string; success?: boolean; envFlags?: { hasYouTubeKey: boolean; hasAdminEmail: boolean } }
  | null

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const result = await signIn(email, password)
  if (!result.success) return { error: result.error }

  const supabase = await createClient()
  const role = await getCurrentUserRole(supabase)
  const envFlags = role === 'admin'
    ? { hasYouTubeKey: Boolean(process.env.YOUTUBE_API_KEY?.length), hasAdminEmail: Boolean(process.env.ADMIN_EMAIL?.length)}
    : undefined

  return { success: true, envFlags }
}
