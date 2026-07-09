import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import type { EmailOtpType } from '@supabase/supabase-js'

export type AuthResult =
  | { success: true }
  | { success: false; error: string }

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }
  // seedDefaultCategories now runs client-side, inside VaultContext.unlock()
  // (categories/domains are encrypted, so seeding needs the DEK).
  return { success: true }
}

export async function confirmSignup(tokenHash: string, type: EmailOtpType): Promise<AuthResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) return { success: false, error: error.message }
  // Session now exists (post-verification), so this update satisfies the
  // "users: update own" RLS policy — doing this in signUp() would no-op
  // silently, since no session exists yet when confirmations are required.
  if (data.user && isAdminEmail(data.user.email)) {
    await supabase.from('users').update({ role: 'admin' }).eq('id', data.user.id)
  }
  return { success: true }
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function requestAccountRestart(email: string): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
