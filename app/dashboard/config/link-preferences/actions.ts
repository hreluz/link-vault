'use server'

import { createClient } from '@/lib/supabase/server'
import { setAutoFetchPreference } from '@/lib/services/userPreferences'
import type { ToggleResult } from '@/lib/hooks/shared/useAsyncToggle'

export async function toggleAutoFetchPreferenceAction(enabled: boolean): Promise<ToggleResult> {
  const supabase = await createClient()
  return setAutoFetchPreference(supabase, enabled)
}
