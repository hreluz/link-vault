import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Clears every move-to-end mark of the current user, Trash included, so all links
 * return to their normal sort position. Touches only `moved_to_end_at` (not
 * `updated_at`, status or anything else). Kept apart from `links.ts`, which pulls
 * in the browser client, so a server action can import it.
 */
export async function clearAllMovedToEnd(
  supabase: SupabaseClient<Database>,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('links')
    .update({ moved_to_end_at: null })
    .eq('user_id', user.id)
    .not('moved_to_end_at', 'is', null)
    .select('id')

  if (error) return { success: false, error: error.message }
  return { success: true, count: data?.length ?? 0 }
}
