'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { setAutoFetchPreference, setMoveToEndDelay } from '@/lib/services/userPreferences'
import type { ToggleResult } from '@/lib/hooks/shared/useAsyncToggle'

export async function toggleAutoFetchPreferenceAction(enabled: boolean): Promise<ToggleResult> {
  const supabase = await createClient()
  return setAutoFetchPreference(supabase, enabled)
}

export async function saveMoveToEndDelayAction(seconds: number): Promise<ToggleResult> {
  const supabase = await createClient()
  const result = await setMoveToEndDelay(supabase, seconds)
  // So the next in-app visit to the dashboard gets the new value.
  if (result.success) revalidatePath('/dashboard')
  return result
}
