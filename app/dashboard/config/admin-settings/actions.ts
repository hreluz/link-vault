'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/lib/services/users'
import {
  setRegistrationEnabled,
  setRestartAccountEnabled,
  setImportFetchSettings,
  type AppSettingsResult,
  type ImportFetchSettings,
} from '@/lib/services/appSettings'

export async function toggleRegistrationAction(enabled: boolean): Promise<AppSettingsResult> {
  const supabase = await createClient()
  const role = await getCurrentUserRole(supabase)
  if (role !== 'admin') return { success: false, error: 'Not authorized' }

  return setRegistrationEnabled(supabase, enabled)
}

export async function toggleRestartAccountAction(enabled: boolean): Promise<AppSettingsResult> {
  const supabase = await createClient()
  const role = await getCurrentUserRole(supabase)
  if (role !== 'admin') return { success: false, error: 'Not authorized' }

  return setRestartAccountEnabled(supabase, enabled)
}

export async function saveImportFetchSettingsAction(settings: ImportFetchSettings): Promise<AppSettingsResult> {
  const supabase = await createClient()
  const role = await getCurrentUserRole(supabase)
  if (role !== 'admin') return { success: false, error: 'Not authorized' }

  return setImportFetchSettings(supabase, settings)
}
