'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/lib/services/users'
import { setRegistrationEnabled, type AppSettingsResult } from '@/lib/services/appSettings'

export async function toggleRegistrationAction(enabled: boolean): Promise<AppSettingsResult> {
  const supabase = await createClient()
  const role = await getCurrentUserRole(supabase)
  if (role !== 'admin') return { success: false, error: 'Not authorized' }

  return setRegistrationEnabled(supabase, enabled)
}
