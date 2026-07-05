import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'

export type AuthResult =
  | { success: true }
  | { success: false; error: string }

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }
  // seedDefaultCategories now runs client-side, after the vault key exists
  // (categories/domains are encrypted, so seeding needs the DEK) -- see LoginForm.
  return { success: true }
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { success: false, error: error.message }
  if (data.user && isAdminEmail(email)) {
    await supabase.from('users').update({ role: 'admin' }).eq('id', data.user.id)
  }
  return { success: true }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
