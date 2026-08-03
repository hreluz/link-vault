'use server'

import { createClient } from '@/lib/supabase/server'
import { setAccentColor, setSurfaceFamily } from '@/lib/services/userPreferences'
import type { ToggleResult } from '@/lib/hooks/useAsyncToggle'
import type { AccentColor, SurfaceFamily } from '@/lib/types/database'

export async function setAccentColorAction(
  mode: 'light' | 'dark',
  accent: AccentColor,
): Promise<ToggleResult> {
  const supabase = await createClient()
  return setAccentColor(supabase, mode, accent)
}

export async function setSurfaceFamilyAction(family: SurfaceFamily): Promise<ToggleResult> {
  const supabase = await createClient()
  return setSurfaceFamily(supabase, family)
}
