import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export type PasswordResult =
  | { success: true }
  | { success: false; error: string }

export async function changePassword(
  supabase: SupabaseClient<Database>,
  currentPassword: string,
  newPassword: string
): Promise<PasswordResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { success: false, error: 'Not authenticated' }

  // Re-authenticate to verify the current password before allowing the update
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) return { success: false, error: 'Current password is incorrect' }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) return { success: false, error: updateError.message }

  return { success: true }
}
