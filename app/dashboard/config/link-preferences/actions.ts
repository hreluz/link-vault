'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { setAutoFetchPreference, setMoveToEndDelay } from '@/lib/services/userPreferences'
import { clearAllMovedToEnd } from '@/lib/services/linkOrder'
import type { ToggleResult } from '@/lib/hooks/shared/useAsyncToggle'

export type ResetLinkOrderResult = { success: true; count: number } | { success: false; error: string }

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

export async function resetLinkOrderAction(): Promise<ResetLinkOrderResult> {
  const supabase = await createClient()
  const result = await clearAllMovedToEnd(supabase)
  // So the next in-app visit to the dashboard shows the new order.
  if (result.success) revalidatePath('/dashboard')
  return result
}
