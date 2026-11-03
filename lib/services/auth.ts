import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  if (data.user && isAdminEmail(data.user.email)) {
    await promoteToAdmin(data.user.id)
  }
  return { success: true }
}

// Users can't update their own `users` row (migration 0022), so the promotion
// goes through the service-role client. A failure is logged but never fails the
// confirmation — the email is verified either way.
async function promoteToAdmin(userId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('users').update({ role: 'admin' }).eq('id', userId)
    if (error) console.error('Failed to promote ADMIN_EMAIL account to admin:', error.message)
  } catch (err) {
    console.error('Failed to promote ADMIN_EMAIL account to admin:', err)
  }
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
