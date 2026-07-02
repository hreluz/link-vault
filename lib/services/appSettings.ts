import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export type AppSettingsResult =
  | { success: true }
  | { success: false; error: string }

export async function isRegistrationEnabled(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('registrations_enabled')
    .limit(1)
    .maybeSingle()

  if (error || !data) return true
  return data.registrations_enabled
}

export async function setRegistrationEnabled(
  supabase: SupabaseClient<Database>,
  enabled: boolean,
): Promise<AppSettingsResult> {
  const { data: existing, error: fetchError } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchError || !existing) return { success: false, error: 'App settings not found' }

  const { error: updateError } = await supabase
    .from('app_settings')
    .update({ registrations_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', existing.id)

  if (updateError) return { success: false, error: updateError.message }
  return { success: true }
}
