import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/lib/types/database'
import type { ToggleResult } from '@/lib/hooks/useAsyncToggle'

export async function getCurrentUserRole(
  supabase: SupabaseClient<Database>,
): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role ?? null
}

export async function getAutoFetchPreference(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return true

  const { data } = await supabase
    .from('users')
    .select('auto_fetch_enabled')
    .eq('id', user.id)
    .single()

  return data?.auto_fetch_enabled ?? true
}

export async function setAutoFetchPreference(
  supabase: SupabaseClient<Database>,
  enabled: boolean,
): Promise<ToggleResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('users')
    .update({ auto_fetch_enabled: enabled })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
