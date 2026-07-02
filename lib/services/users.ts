import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/lib/types/database'

export async function getCurrentUserRole(
  supabase: SupabaseClient<Database>,
): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role ?? null
}
