import { createClient } from '@/lib/supabase/server'

export type AuthResult =
  | { success: true }
  | { success: false; error: string }

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }
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
